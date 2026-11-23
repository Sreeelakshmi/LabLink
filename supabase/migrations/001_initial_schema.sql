-- ============================================================
-- LabLink — Migration 001: Initial Schema
-- Run this in the Supabase SQL Editor (project → SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  code        text UNIQUE, -- e.g. 'cs', 'ece', 'me', 'biotech'
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. PROFILES (1-to-1 with auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  role          text NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'faculty', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. LABORATORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.laboratories (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text NOT NULL,
  department_id             uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  location                  text,
  opening_hours             text,
  accessibility_information text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 4. RESOURCES (Physical Equipment Inventory)
-- Note: quantity_total = total units owned.
--       quantity_available = usable/operable units (not broken/retired).
--       Time-slot reservation availability is computed dynamically
--       against confirmed booking_allocations.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id      uuid NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  department_id      uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  category           text NOT NULL,
  specifications     jsonb DEFAULT '{}',
  quantity_total     int NOT NULL DEFAULT 1 CHECK (quantity_total > 0),
  quantity_available int NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
  maintenance_status text NOT NULL DEFAULT 'operational'
                       CHECK (maintenance_status IN ('operational', 'maintenance', 'retired')),
  prerequisites      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qty_available_lte_total CHECK (quantity_available <= quantity_total)
);

-- ─────────────────────────────────────────────
-- 5. PROJECTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  deadline      date NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  team_size     int NOT NULL DEFAULT 1 CHECK (team_size > 0),
  requirements  text,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 6. BOOKING REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id           uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  resource_id          uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity_requested   int NOT NULL DEFAULT 1 CHECK (quantity_requested > 0),
  preferred_start      timestamptz NOT NULL,
  preferred_end        timestamptz NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected', 'conflict')),
  assigned_faculty_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes         text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (preferred_end > preferred_start)
);

-- ─────────────────────────────────────────────
-- 7. BOOKING ALLOCATIONS (Confirmed Time-Slot Reservations)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_allocations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL UNIQUE REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  resource_id        uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  allocated_quantity int NOT NULL DEFAULT 1 CHECK (allocated_quantity > 0),
  start_time         timestamptz NOT NULL,
  end_time           timestamptz NOT NULL,
  approved_by        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alloc_end_after_start CHECK (end_time > start_time)
);

-- ─────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE & OVERLAP LOOKUPS
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departments_code       ON public.departments(code);
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_resources_department   ON public.resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_category     ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_status       ON public.resources(maintenance_status);
CREATE INDEX IF NOT EXISTS idx_projects_student       ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_status        ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_booking_student        ON public.booking_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_resource       ON public.booking_requests(resource_id);
CREATE INDEX IF NOT EXISTS idx_booking_status         ON public.booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_faculty        ON public.booking_requests(assigned_faculty_id);
CREATE INDEX IF NOT EXISTS idx_booking_window         ON public.booking_requests(resource_id, preferred_start, preferred_end);
CREATE INDEX IF NOT EXISTS idx_alloc_booking          ON public.booking_allocations(booking_request_id);
CREATE INDEX IF NOT EXISTS idx_alloc_resource_window  ON public.booking_allocations(resource_id, start_time, end_time);
