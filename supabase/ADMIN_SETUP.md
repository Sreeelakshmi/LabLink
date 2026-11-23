# LabLink — Supabase Database & Security Guide

> **Important**: User roles are **not selectable** during public registration.  
> All self-registered users receive the `student` role automatically via database trigger.  
> Role modifications are permanently blocked by database trigger for all client JWTs.  
> Faculty and admin roles must be assigned directly by a database superuser in the Supabase SQL Editor.

---

## 1. Migration Execution Order

Open **Supabase Dashboard → SQL Editor** and run these 4 scripts sequentially:

| Step | Migration File | Description |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | Creates tables, constraints (`quantity_total`, `end_after_start`, unique allocation), and B-tree indexes |
| 2 | `supabase/migrations/002_rls_policies.sql` | Enables RLS on all 7 tables; grants strict read/write boundaries; protects `booking_allocations` |
| 3 | `supabase/migrations/003_seed_data.sql` | Seeds 4 departments (`cs`, `ece`, `me`, `biotech`), 4 laboratories, and 10 core lab resources |
| 4 | `supabase/migrations/004_triggers.sql` | Sets up `handle_new_user`, role protection trigger, atomic `approve_booking_with_allocation`, `reject_booking_request`, and `check_slot_availability` |

---

## 2. Core Security & Concurrency Architecture

### A. Time-Slot Reservation & Overlap Model
- Physical inventory (`resources.quantity_total` and `resources.quantity_available`) tracks physical equipment capacity and operational readiness.
- Time-slot availability is evaluated dynamically against confirmed reservations in `public.booking_allocations`.
- Pending requests **do not consume confirmed capacity**.

### B. Atomic Row-Locking Approval
`public.approve_booking_with_allocation(p_booking_id, p_notes)` executes an atomic transaction:
1. Verifies caller is authenticated and possesses `faculty` or `admin` role.
2. Prevents faculty self-approval (`student_id != auth.uid()`).
3. Acquires an exclusive row-level lock (`FOR UPDATE`) on the target resource.
4. Queries peak concurrent allocations across all critical time intervals inside the requested slot.
5. If concurrent allocations + requested quantity exceed capacity, marks the request as `conflict` and rejects approval.
6. If within capacity, atomically inserts the confirmed allocation into `public.booking_allocations` and sets request status to `approved`.
7. Concurrency guarantee: Two simultaneous approvals for the same resource serialize via row locks; the second transaction automatically reads the first transaction's committed allocation.

### C. Role Modification Guard
`public.prevent_profile_role_update` triggers `BEFORE UPDATE ON public.profiles`. If any client JWT tries to modify the `role` column, the database throws an exception.

---

## 3. Promote a User to Faculty or Admin

After a faculty member registers in the app (creating an entry in `auth.users` and `public.profiles`):

```sql
-- Find user by email
SELECT id, email, created_at FROM auth.users WHERE email = 'faculty@university.edu';

-- Promote to faculty
UPDATE public.profiles
SET role = 'faculty'
WHERE id = '<paste-user-uuid-here>';

-- Or promote to lab admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<paste-user-uuid-here>';
```

---

## 4. Environment Variables Configuration

Copy `.env.local.example` to `.env.local` in your project root:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>
```

- Find these in: **Supabase Dashboard → Project Settings → API**.
- `NEXT_PUBLIC_` keys are safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should never be exposed to clients.

---

## 5. Enable Email Auth in Supabase

In **Supabase Dashboard → Authentication → Providers**:
1. Enable the **Email** provider.
2. For local development, toggle **off** "Confirm email" to enable immediate login without checking inboxes.
