/**
 * LabLink Database Types
 * Strongly-typed definitions matching Supabase PostgreSQL tables & foreign-key joins.
 */

export interface DbDepartment {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at?: string;
}

export interface DbLaboratory {
  id: string;
  name: string;
  department_id: string;
  location: string | null;
  opening_hours: string | null;
  accessibility_information: string | null;
  created_at?: string;
}

export interface DbResource {
  id: string;
  laboratory_id: string;
  department_id: string;
  name: string;
  description: string | null;
  category: string;
  specifications: Record<string, string> | null;
  quantity_total: number;
  quantity_available: number;
  maintenance_status: 'operational' | 'maintenance' | 'retired';
  prerequisites: string | null;
  created_at?: string;
}

export interface DbResourceWithRelations extends DbResource {
  departments?: { id?: string; name: string } | null;
  laboratories?: { id?: string; name: string; location: string | null } | null;
}

export interface DbProfile {
  id: string;
  full_name: string;
  department_id: string | null;
  role: 'student' | 'faculty' | 'admin';
  created_at?: string;
}

export interface DbProject {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  deadline: string;
  department_id: string | null;
  team_size: number;
  requirements: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface DbProjectWithRelations extends DbProject {
  departments?: { id?: string; name: string } | null;
  profiles?: { full_name: string } | null;
}

export interface DbBookingRequest {
  id: string;
  student_id: string;
  project_id: string | null;
  resource_id: string;
  quantity_requested: number;
  preferred_start: string;
  preferred_end: string;
  status: 'pending' | 'approved' | 'rejected' | 'conflict';
  assigned_faculty_id: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface DbBookingWithRelations extends DbBookingRequest {
  resources?: {
    id?: string;
    name: string;
    category?: string;
    quantity_available?: number;
    laboratories?: { name?: string; location: string | null } | null;
  } | null;
  projects?: {
    id?: string;
    title: string;
    deadline?: string;
    team_size?: number;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

export interface DbBookingAllocation {
  id: string;
  booking_request_id: string;
  resource_id: string;
  allocated_quantity: number;
  start_time: string;
  end_time: string;
  created_at?: string;
}
