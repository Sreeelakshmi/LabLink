-- ============================================================
-- LabLink — Migration 004: Triggers & Atomic Booking Procedures
-- Run AFTER 001, 002, 003
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. DROP OBSOLETE FLAWED TRIGGER IF IT EXISTS
-- (Permanent inventory reduction trigger is replaced by time-slot allocation)
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests;
DROP FUNCTION IF EXISTS public.handle_booking_approval();

-- ─────────────────────────────────────────────
-- 2. TRIGGER: Auto-create student profile on auth.users sign-up
-- Validates metadata safely; role is ALWAYS student.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_raw_dept text;
  v_dept_id uuid := NULL;
  v_full_name text;
BEGIN
  v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Student'));
  IF v_full_name = '' THEN
    v_full_name := 'New Student';
  END IF;

  v_raw_dept := NEW.raw_user_meta_data->>'department_id';

  -- Safely validate department UUID format & existence to prevent signup crashes
  IF v_raw_dept IS NOT NULL AND v_raw_dept ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_dept_id
    FROM public.departments
    WHERE id = v_raw_dept::uuid;
  END IF;

  INSERT INTO public.profiles (id, full_name, department_id, role)
  VALUES (
    NEW.id,
    v_full_name,
    v_dept_id,
    'student' -- Explicitly enforced: self-registration CANNOT set faculty/admin
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- 3. TRIGGER: Prevent Unauthorized Profile Role Modification
-- Blocks students, faculty, or any authenticated client JWT from
-- changing the 'role' column. Only direct superuser/service_role/SQL Editor can.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only permit role modification if executed without a client JWT (e.g. SQL Editor / superuser)
    -- or explicitly via the service_role key.
    IF auth.uid() IS NOT NULL AND COALESCE(auth.jwt()->>'role', '') != 'service_role' THEN
      RAISE EXCEPTION 'Modifying user roles via client API is forbidden. Role updates must be performed by a database administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_update();

-- ─────────────────────────────────────────────
-- 4. FUNCTION: Check Time-Slot Equipment Availability
-- Checks usable capacity against overlapping confirmed allocations.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_slot_availability(
  p_resource_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_resource record;
  v_usable_capacity int;
  v_max_allocated int;
BEGIN
  IF p_end <= p_start THEN
    RETURN jsonb_build_object('available', false, 'error', 'End time must be after start time.');
  END IF;

  SELECT id, name, quantity_total, quantity_available, maintenance_status
  INTO v_resource
  FROM public.resources
  WHERE id = p_resource_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'error', 'Resource not found.');
  END IF;

  IF v_resource.maintenance_status != 'operational' THEN
    RETURN jsonb_build_object(
      'available', false,
      'usable_capacity', 0,
      'max_allocated', 0,
      'remaining_capacity', 0,
      'maintenance_status', v_resource.maintenance_status,
      'reason', 'Equipment is currently under ' || v_resource.maintenance_status
    );
  END IF;

  -- Usable working units in laboratory
  v_usable_capacity := LEAST(v_resource.quantity_total, v_resource.quantity_available);

  -- Evaluate concurrent allocations across critical interval points
  WITH check_points AS (
    SELECT p_start AS pt
    UNION
    SELECT ba.start_time AS pt
    FROM public.booking_allocations ba
    WHERE ba.resource_id = p_resource_id
      AND ba.start_time > p_start
      AND ba.start_time < p_end
  )
  SELECT COALESCE(MAX(concurrent_usage), 0)
  INTO v_max_allocated
  FROM (
    SELECT cp.pt, COALESCE(SUM(ba.allocated_quantity), 0) AS concurrent_usage
    FROM check_points cp
    JOIN public.booking_allocations ba
      ON ba.resource_id = p_resource_id
     AND ba.start_time <= cp.pt
     AND ba.end_time > cp.pt
    GROUP BY cp.pt
  ) sub;

  RETURN jsonb_build_object(
    'available', (v_usable_capacity - v_max_allocated) > 0,
    'usable_capacity', v_usable_capacity,
    'max_allocated', v_max_allocated,
    'remaining_capacity', GREATEST(0, v_usable_capacity - v_max_allocated)
  );
END;
$$;

-- ─────────────────────────────────────────────
-- 5. FUNCTION: Atomic Booking Approval with Row-Locking & Overlap Verification
-- Prevents race conditions and capacity exceedance.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_booking_with_allocation(
  p_booking_id uuid,
  p_notes text DEFAULT NULL,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_booking record;
  v_resource record;
  v_usable_capacity int;
  v_max_allocated int;
  v_new_alloc_id uuid;
BEGIN
  -- 1. Identify caller: use auth.uid() if present, or p_reviewer_id if called from SQL Editor
  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSIF p_reviewer_id IS NOT NULL THEN
    v_caller_id := p_reviewer_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('faculty', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only faculty or admin can approve bookings.');
  END IF;

  -- 2. Lock booking request row
  SELECT id, student_id, resource_id, project_id, quantity_requested, preferred_start, preferred_end, status
  INTO v_booking
  FROM public.booking_requests
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking request not found.');
  END IF;

  IF v_booking.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is already approved.');
  END IF;

  IF v_booking.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot approve a rejected booking request.');
  END IF;

  -- Prevent faculty self-approval
  IF v_booking.student_id = v_caller_id AND v_caller_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Faculty cannot approve their own booking request.');
  END IF;

  -- 3. Row lock the resource to serialize approvals for this resource
  SELECT id, name, quantity_total, quantity_available, maintenance_status
  INTO v_resource
  FROM public.resources
  WHERE id = v_booking.resource_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested resource not found.');
  END IF;

  IF v_resource.maintenance_status != 'operational' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is currently not operational (' || v_resource.maintenance_status || ').');
  END IF;

  v_usable_capacity := LEAST(v_resource.quantity_total, v_resource.quantity_available);

  IF v_booking.quantity_requested > v_usable_capacity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requested quantity (' || v_booking.quantity_requested || ') exceeds total usable capacity (' || v_usable_capacity || ').'
    );
  END IF;

  -- 4. Calculate concurrent allocations in the requested time interval
  WITH check_points AS (
    SELECT v_booking.preferred_start AS pt
    UNION
    SELECT ba.start_time AS pt
    FROM public.booking_allocations ba
    WHERE ba.resource_id = v_booking.resource_id
      AND ba.start_time > v_booking.preferred_start
      AND ba.start_time < v_booking.preferred_end
  )
  SELECT COALESCE(MAX(concurrent_usage), 0)
  INTO v_max_allocated
  FROM (
    SELECT cp.pt, COALESCE(SUM(ba.allocated_quantity), 0) AS concurrent_usage
    FROM check_points cp
    JOIN public.booking_allocations ba
      ON ba.resource_id = v_booking.resource_id
     AND ba.start_time <= cp.pt
     AND ba.end_time > cp.pt
    GROUP BY cp.pt
  ) sub;

  -- Check if adding this allocation violates capacity
  IF (v_max_allocated + v_booking.quantity_requested) > v_usable_capacity THEN
    -- Mark booking request as 'conflict' so faculty/student can view in conflict resolver
    UPDATE public.booking_requests
    SET status = 'conflict',
        review_notes = COALESCE(p_notes, 'Simultaneous slot conflict: requested quantity exceeds remaining capacity during this interval.')
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'error', 'Time-slot capacity exceeded. Max concurrent in-use: ' || v_max_allocated || ' of ' || v_usable_capacity || ' units.'
    );
  END IF;

  -- 5. Insert confirmed allocation record (guaranteed atomic)
  INSERT INTO public.booking_allocations (
    booking_request_id,
    resource_id,
    allocated_quantity,
    start_time,
    end_time,
    approved_by
  ) VALUES (
    v_booking.id,
    v_booking.resource_id,
    v_booking.quantity_requested,
    v_booking.preferred_start,
    v_booking.preferred_end,
    v_caller_id
  )
  RETURNING id INTO v_new_alloc_id;

  -- 6. Update booking request status to approved
  UPDATE public.booking_requests
  SET status = 'approved',
      assigned_faculty_id = v_caller_id,
      review_notes = p_notes
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'allocation_id', v_new_alloc_id,
    'allocated_quantity', v_booking.quantity_requested
  );
END;
$$;

-- ─────────────────────────────────────────────
-- 6. FUNCTION: Atomic Booking Rejection
-- Removes any existing allocation and marks status as rejected.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_booking_request(
  p_booking_id uuid,
  p_notes text DEFAULT NULL,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_caller_id := auth.uid();
  ELSIF p_reviewer_id IS NOT NULL THEN
    v_caller_id := p_reviewer_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('faculty', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only faculty or admin can reject bookings.');
  END IF;

  -- Lock request
  PERFORM id FROM public.booking_requests WHERE id = p_booking_id FOR UPDATE;

  -- Delete allocation if it existed
  DELETE FROM public.booking_allocations WHERE booking_request_id = p_booking_id;

  -- Update request status
  UPDATE public.booking_requests
  SET status = 'rejected',
      assigned_faculty_id = v_caller_id,
      review_notes = p_notes
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;

-- ─────────────────────────────────────────────
-- 7. FUNCTION PERMISSIONS
-- Grant execution only to authenticated users; functions enforce internal authorization
-- ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.check_slot_availability(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_slot_availability(uuid, timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_booking_with_allocation(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_booking_with_allocation(uuid, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_booking_request(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_booking_request(uuid, text, uuid) TO authenticated;
