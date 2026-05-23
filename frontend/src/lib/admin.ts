import type { UserRole } from './auth-context'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string | null
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  pages: number
}

export type AuditAction =
  | 'role_changed'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'club_founded'
  | 'club_amended'
  | 'club_disbanded'
  | string

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  action: AuditAction
  target_type: string
  target_id: string
  /** Backend returns the JSONB column as `metadata`. */
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export interface AdminLogsResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  pages: number
  limit: number
}

export const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Student',
  organiser: 'Organiser',
  admin: 'Admin',
}

export const ROLE_ACCENT: Record<UserRole, string> = {
  student: '0 0% 55%',
  organiser: '217 91% 50%',
  admin: '0 100% 30%',
}

export const ACTION_LABEL: Record<string, string> = {
  role_changed: 'ROLE_CHANGED',
  user_deactivated: 'USER_DEACTIVATED',
  user_reactivated: 'USER_REACTIVATED',
  club_founded: 'CLUB_FOUNDED',
  club_amended: 'CLUB_AMENDED',
  club_disbanded: 'CLUB_DISBANDED',
}

export const ACTION_ACCENT: Record<string, string> = {
  role_changed: '217 91% 50%',
  user_deactivated: '0 70% 50%',
  user_reactivated: '142 71% 45%',
  club_founded: '158 64% 40%',   /* emerald */
  club_amended: '38 92% 50%',    /* amber */
  club_disbanded: '0 100% 30%',  /* DMU crimson */
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'student' || value === 'organiser' || value === 'admin'
}

/** Pull a friendly label for the target of a log entry. */
export function deriveTargetLabel(
  entry: AuditLogEntry,
  usersById: Map<string, AdminUser>
): string {
  /* Club mutations carry the society name in metadata. */
  if (entry.target_type === 'club' && entry.metadata && typeof entry.metadata.name === 'string') {
    return entry.metadata.name
  }
  /* Deactivate / reactivate metadata carries the email directly. */
  if (entry.metadata && typeof entry.metadata.email === 'string') {
    return entry.metadata.email
  }
  /* role_changed targets are users — try to resolve via the cached users map. */
  if (entry.target_type === 'user') {
    const u = usersById.get(entry.target_id)
    if (u) return u.email
  }
  /* Fallback: short UUID slice. */
  return entry.target_id.slice(0, 8).toUpperCase()
}