export type DepartmentId = 'cs' | 'ece' | 'me' | 'biotech';

export interface Department {
  id: DepartmentId;
  name: string;
  code: string;
  building: string;
  floor: string;
  totalLabs: number;
}

export type ResourceCategory = 'iot' | 'computing' | 'electronics' | 'fabrication' | 'robotics';

export type AvailabilityStatus = 'available' | 'in_use' | 'reserved' | 'maintenance';

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  departmentId: DepartmentId;
  departmentName: string;
  labLocation: string;
  totalQuantity: number;
  availableQuantity: number;
  status: AvailabilityStatus;
  description: string;
  specifications: Record<string, string>;
  safetyCertificationRequired: boolean;
  imageUrl?: string;
  popularFor: string[];
}

export type ProjectStatus = 'draft' | 'submitted' | 'active' | 'completed';

export interface Project {
  id: string;
  title: string;
  description: string;
  departmentId: DepartmentId;
  leadStudent: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  teamMembersCount: number;
  deadline: string; // ISO date string
  priorityScore: number; // 1-100 calculated by deadline & team
  requiredResourceIds: string[];
  status: ProjectStatus;
  specialRequirements?: string;
}

// Legacy mock statuses kept for existing components; Supabase DB uses 'pending' and 'conflict'
export type BookingStatus = 'pending_approval' | 'approved' | 'rejected' | 'conflict_detected' | 'active' | 'pending' | 'conflict';

export interface BookingRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  studentName: string;
  studentDepartment: string;
  resourceId: string;
  resourceName: string;
  labLocation: string;
  quantityRequested: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: BookingStatus;
  urgency: 'high' | 'medium' | 'low';
  projectDeadline: string;
  submittedAt: string;
  facultyReviewer?: string;
  notes?: string;
}

export interface SchedulingConflict {
  id: string;
  resourceId: string;
  resourceName: string;
  labLocation: string;
  availableQuantity: number;
  requestedDate: string;
  conflictingTimeSlot: string; // e.g. "10:00 AM - 12:00 PM"
  requests: {
    bookingId: string;
    projectId: string;
    projectTitle: string;
    studentName: string;
    deadline: string;
    requestedTime: string;
    priorityWeight: number; // calculated metric based on deadline
    reason: string;
  }[];
  aiRecommendation: {
    recommendedAllocations: {
      projectId: string;
      projectTitle: string;
      assignedTime: string;
      rationale: string;
    }[];
    fairnessScore: number; // 0-100
    utilizationOptimization: string;
    considerations: string[];
  };
  status: 'pending_faculty_action' | 'resolved' | 'modified';
}

export interface FacultyProfile {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  supervisedLabs: string[];
  pendingApprovalsCount: number;
}

export interface LabUtilizationMetric {
  department: string;
  utilizationRate: number; // percentage
  peakHours: string;
  topResource: string;
  underutilizedResource: string;
}

