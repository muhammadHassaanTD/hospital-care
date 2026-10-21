import { apiGet, apiPost } from './client'

export type EquipmentType = 'ventilator' | 'monitor' | 'defibrillator' | 'dialysis'
export type EquipmentStatus = 'available' | 'inUse' | 'maintenance' | 'outOfService'

export interface Equipment {
  /** Asset identifier, e.g. VENT-04. */
  id: string
  type: EquipmentType
  location: string
  locationId: number
  status: EquipmentStatus
}

export const EQUIPMENT_TYPES: readonly { id: EquipmentType; label: string }[] = [
  { id: 'ventilator', label: 'Ventilator' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'defibrillator', label: 'Defibrillator' },
  { id: 'dialysis', label: 'Dialysis' },
]

export const EQUIPMENT_STATUSES: readonly { id: EquipmentStatus; label: string }[] = [
  { id: 'available', label: 'Available' },
  { id: 'inUse', label: 'In use' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'outOfService', label: 'Out of service' },
]

/** Every machine at the user's hospital. GET /api/equipment/ (equipment: view). */
export function getEquipment(): Promise<Equipment[]> {
  return apiGet<Equipment[]>('/equipment/')
}

export interface EquipmentInput {
  id: string
  type: EquipmentType
  locationId: number
}

/** Register one machine. It starts available. POST /api/equipment/ (equipment: edit). */
export function createEquipment(input: EquipmentInput): Promise<Equipment> {
  return apiPost<Equipment>('/equipment/', input)
}

export type EquipmentAction = 'startUse' | 'finishUse' | 'startMaintenance' | 'finishMaintenance' | 'outOfService'

/** Move one machine along its lifecycle. 409 when the move is not allowed. POST /api/equipment/<id>/actions/ */
export function postEquipmentAction(id: string, action: EquipmentAction): Promise<Equipment> {
  return apiPost<Equipment>(`/equipment/${encodeURIComponent(id)}/actions/`, { action })
}
