import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  type Equipment,
  type EquipmentAction,
  type EquipmentStatus,
  type EquipmentType,
} from '../../api/equipment'
import type { Tone } from '../../components/ui/StatusBadge'

export const TYPE_LABEL: Record<EquipmentType, string> = Object.fromEntries(
  EQUIPMENT_TYPES.map((type) => [type.id, type.label]),
) as Record<EquipmentType, string>

export const STATUS_LABEL: Record<EquipmentStatus, string> = Object.fromEntries(
  EQUIPMENT_STATUSES.map((status) => [status.id, status.label]),
) as Record<EquipmentStatus, string>

/** Available is clear, out of service is quiet, and the other two share a warning shape. The label tells them apart. */
export const STATUS_TONE: Record<EquipmentStatus, Tone> = {
  available: 'ok',
  inUse: 'warning',
  maintenance: 'warning',
  outOfService: 'neutral',
}

export type TypeFilter = 'all' | EquipmentType
export type StatusFilter = 'all' | EquipmentStatus

type Transition = { action: EquipmentAction; label: string; next: EquipmentStatus }

/** Same moves as EQUIPMENT_LIFECYCLE in backend/apps/resources/models.py. */
const TRANSITIONS: Record<EquipmentStatus, readonly Transition[]> = {
  available: [
    { action: 'startUse', label: 'Mark in use', next: 'inUse' },
    { action: 'startMaintenance', label: 'Send to maintenance', next: 'maintenance' },
    { action: 'outOfService', label: 'Take out of service', next: 'outOfService' },
  ],
  inUse: [
    { action: 'finishUse', label: 'Mark available', next: 'available' },
    { action: 'outOfService', label: 'Take out of service', next: 'outOfService' },
  ],
  maintenance: [
    { action: 'finishMaintenance', label: 'Mark available', next: 'available' },
    { action: 'outOfService', label: 'Take out of service', next: 'outOfService' },
  ],
  outOfService: [],
}

export function actionsFor(status: EquipmentStatus): readonly Transition[] {
  return TRANSITIONS[status]
}

/** Keep type order from the registry, then identifier, so the table doesn't jump around. */
export function filterEquipment(items: readonly Equipment[], type: TypeFilter, status: StatusFilter): Equipment[] {
  const typeOrder = EQUIPMENT_TYPES.map((item) => item.id)
  return items
    .filter((item) => (type === 'all' || item.type === type) && (status === 'all' || item.status === status))
    .slice()
    .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.id.localeCompare(b.id))
}
