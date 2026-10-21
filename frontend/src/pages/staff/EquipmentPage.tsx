import { useState } from 'react'
import type { EquipmentAction } from '../../api/equipment'
import { FormAlert } from '../../components/form/FormAlert'
import { RegisterEquipmentForm } from '../../features/equipment/RegisterEquipmentForm'
import { EquipmentTable } from '../../features/equipment/EquipmentTable'
import { canEdit } from '../../features/staff/roles'
import { useStaff } from '../../features/staff/staffContext'
import { StaffDataState } from './StaffDataState'
import styles from './StaffPages.module.css'

export default function EquipmentPage() {
  const { data, role, user, addEquipment, updateEquipment } = useStaff()
  const [error, setError] = useState<string>()
  if (!data) return <StaffDataState />

  const editable = canEdit(role, 'equipment')
  const act = async (id: string, action: EquipmentAction) => {
    setError(undefined)
    const result = await updateEquipment(id, action)
    if (!result.ok) setError(`${id}: ${result.message}`)
  }

  return (
    <div className={styles.stack}>
      <FormAlert>{error}</FormAlert>
      <EquipmentTable items={data.equipment} editable={editable} onAction={act} />
      {editable ? (
        <RegisterEquipmentForm hospitalId={user.hospital?.id} onRegistered={addEquipment} />
      ) : (
        <p className={styles.note}>View only: your role can’t register equipment.</p>
      )}
    </div>
  )
}
