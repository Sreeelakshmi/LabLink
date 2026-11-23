-- ============================================================
-- LabLink — Migration 002: Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- Idempotent: safe to run multiple times without errors.
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_allocations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- HELPER: get current authenticated user's role
-- Safe search_path prevents search-path hijacking attacks
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ─────────────────────────────────────────────
-- 1. DEPARTMENTS
-- Read-only for all campus users (including registration); admin-managed
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "departments_admin_insert" ON public.departments;
CREATE POLICY "departments_admin_insert" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "departments_admin_update" ON public.departments;
CREATE POLICY "departments_admin_update" ON public.departments
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "departments_admin_delete" ON public.departments;
CREATE POLICY "departments_admin_delete" ON public.departments
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 2. PROFILES
-- Directory visibility: all authenticated users can read basic profiles
-- (prevents recursive RLS evaluation and allows reviewer/team display).
-- Updates are restricted to user's own profile; role changes are
-- permanently blocked by the prevent_profile_role_update trigger.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 3. LABORATORIES
-- Read-only for all campus users (including exploration); admin-managed
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "laboratories_select" ON public.laboratories;
CREATE POLICY "laboratories_select" ON public.laboratories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "laboratories_admin_insert" ON public.laboratories;
CREATE POLICY "laboratories_admin_insert" ON public.laboratories
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "laboratories_admin_update" ON public.laboratories;
CREATE POLICY "laboratories_admin_update" ON public.laboratories
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "laboratories_admin_delete" ON public.laboratories;
CREATE POLICY "laboratories_admin_delete" ON public.laboratories
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 4. RESOURCES
-- Read-only for all campus users (equipment discovery); admin-managed
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "resources_select" ON public.resources;
CREATE POLICY "resources_select" ON public.resources
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "resources_admin_insert" ON public.resources;
CREATE POLICY "resources_admin_insert" ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "resources_admin_update" ON public.resources;
CREATE POLICY "resources_admin_update" ON public.resources
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "resources_admin_delete" ON public.resources;
CREATE POLICY "resources_admin_delete" ON public.resources
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 5. PROJECTS
-- Students manage their own projects; faculty/admin can view for review
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.get_my_role() IN ('faculty', 'admin'));

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.get_my_role() = 'student');

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() AND public.get_my_role() = 'student');

-- ─────────────────────────────────────────────
-- 6. BOOKING REQUESTS
-- Students insert and view their own requests.
-- Faculty review requests (cannot approve own requests).
-- Students cannot self-approve or update request status.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "booking_select_authorized" ON public.booking_requests;
CREATE POLICY "booking_select_authorized" ON public.booking_requests
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR assigned_faculty_id = auth.uid()
    OR public.get_my_role() IN ('faculty', 'admin')
  );

DROP POLICY IF EXISTS "booking_insert_student" ON public.booking_requests;
CREATE POLICY "booking_insert_student" ON public.booking_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND public.get_my_role() = 'student'
  );

-- Faculty/admin can update review notes and status.
-- Faculty cannot review or approve requests where they are the student.
DROP POLICY IF EXISTS "booking_update_faculty_admin" ON public.booking_requests;
CREATE POLICY "booking_update_faculty_admin" ON public.booking_requests
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('faculty', 'admin'))
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'faculty' AND student_id != auth.uid())
  );

DROP POLICY IF EXISTS "booking_delete_admin" ON public.booking_requests;
CREATE POLICY "booking_delete_admin" ON public.booking_requests
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ─────────────────────────────────────────────
-- 7. BOOKING ALLOCATIONS
-- Students can read allocations for their own approved requests.
-- Faculty/admin can view all allocations.
-- Ordinary users CANNOT directly insert or modify allocations.
-- Confirmed allocations are generated exclusively via the atomic
-- approve_booking_with_allocation() procedure (or admin override).
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "alloc_select_authorized" ON public.booking_allocations;
CREATE POLICY "alloc_select_authorized" ON public.booking_allocations
  FOR SELECT TO authenticated
  USING (
    booking_request_id IN (
      SELECT id FROM public.booking_requests WHERE student_id = auth.uid()
    )
    OR public.get_my_role() IN ('faculty', 'admin')
  );

-- Direct client INSERT is restricted to admins only.
-- Normal workflow uses approve_booking_with_allocation().
DROP POLICY IF EXISTS "alloc_admin_insert" ON public.booking_allocations;
CREATE POLICY "alloc_admin_insert" ON public.booking_allocations
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "alloc_admin_update" ON public.booking_allocations;
CREATE POLICY "alloc_admin_update" ON public.booking_allocations
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "alloc_admin_delete" ON public.booking_allocations;
CREATE POLICY "alloc_admin_delete" ON public.booking_allocations
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');
