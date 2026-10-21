import { EQUIPMENT_TYPES, type EquipmentInput, type EquipmentType } from '../../api/equipment'
import type { FieldErrors } from '../auth/validation'

export type EquipmentFormValues = {
  id: string
  type: EquipmentType
  locationId: string
}

export type EquipmentField = keyof EquipmentFormValues

export const EQUIPMENT_FIELD_ORDER: readonly EquipmentField[] = ['id', 'type', 'locationId']

export const MAX_ID_LENGTH = 20

export function emptyEquipment(locationId: string): EquipmentFormValues {
  return { id: '', type: EQUIPMENT_TYPES[0].id, locationId }
}

/** Same limits as the API (backend/apps/resources/serializers.py), checked before sending. */
export function validateEquipment(values: EquipmentFormValues): FieldErrors<EquipmentField> {
  const errors: FieldErrors<EquipmentField> = {}
  const id = values.id.trim()
  if (!id) errors.id = 'Enter the identifier'
  else if (id.length > MAX_ID_LENGTH) errors.id = `Use at most ${MAX_ID_LENGTH} characters`
  if (!values.locationId) errors.locationId = 'Choose a location'
  return errors
}

export function toEquipmentInput(values: EquipmentFormValues): EquipmentInput {
  return { id: values.id.trim(), type: values.type, locationId: Number(values.locationId) }
}
