/**
 * LabLink Domain Mappers & Data Transformers
 * Eliminates duplicate mapping logic across dashboards, catalogs, and actions.
 */

import type { Resource, Project, ResourceCategory, AvailabilityStatus, DepartmentId } from '@/types';
import type { DbResourceWithRelations, DbProjectWithRelations } from '@/types/database';

/**
 * Maps a database resource row (including joined department and lab)
 * to the frontend Resource interface.
 */
export function mapDbResourceToResource(r: DbResourceWithRelations): Resource {
  let status: AvailabilityStatus = 'available';
  if (r.maintenance_status !== 'operational') {
    status = 'maintenance';
  } else if (r.quantity_available === 0) {
    status = 'in_use';
  } else if (r.quantity_available < r.quantity_total) {
    status = 'reserved';
  }

  const rawCat = (r.category || '').toLowerCase();
  let category: ResourceCategory = 'computing';
  if (rawCat.includes('develop') || rawCat.includes('kit') || rawCat.includes('iot')) {
    category = 'iot';
  } else if (rawCat.includes('electron') || rawCat.includes('test') || rawCat.includes('scope')) {
    category = 'electronics';
  } else if (rawCat.includes('fab') || rawCat.includes('machine') || rawCat.includes('mill') || rawCat.includes('3d')) {
    category = 'fabrication';
  } else if (rawCat.includes('robot')) {
    category = 'robotics';
  }

  const deptName = r.departments?.name ?? 'General Department';
  const labLocation = r.laboratories?.location ?? r.laboratories?.name ?? 'Main Campus Lab';

  return {
    id: r.id,
    name: r.name,
    category,
    departmentId: (r.department_id as DepartmentId) || 'cs',
    departmentName: deptName,
    labLocation,
    totalQuantity: r.quantity_total,
    availableQuantity: r.quantity_available,
    status,
    description: r.description ?? '',
    specifications: r.specifications ?? {},
    safetyCertificationRequired: Boolean(r.prerequisites),
    popularFor: [r.category || 'research'],
  };
}

/**
 * Maps a database project row to the frontend Project interface.
 */
export function mapDbProjectToProject(p: DbProjectWithRelations): Project {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    departmentId: (p.department_id ?? 'cs') as DepartmentId,
    leadStudent: {
      id: p.student_id,
      name: p.profiles?.full_name ?? 'Student Researcher',
      email: '',
    },
    teamMembersCount: p.team_size || 1,
    deadline: p.deadline,
    priorityScore: 70, // baseline; refined dynamically by allocation engine when scheduling
    requiredResourceIds: [],
    status: (p.status as Project['status']) ?? 'active',
    specialRequirements: p.requirements ?? undefined,
  };
}

/**
 * Safely extracts a meaningful error message from an unknown error value
 * without leaking sensitive database connection strings or internals.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}
