import { useEffect, useState, type FormEvent } from 'react'
import { createEquipment, EQUIPMENT_TYPES, type Equipment } from '../../api/equipment'
import { ApiError, fieldErrors } from '../../api/client'
import { getHospital, type LocationItem } from '../../api/hospitals'
import { Button } from '../../components/form/Button'
import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { TextField } from '../../components/form/TextField'
import { Panel } from '../../components/ui/Panel'
import { firstErrorKey, type FieldErrors } from '../auth/validation'
import styles from './Equipment.module.css'
import {
  emptyEquipment,
  EQUIPMENT_FIELD_ORDER,
  toEquipmentInput,
  validateEquipment,
  type EquipmentField,
  type EquipmentFormValues,
} from './validation'

type Props = {
  hospitalId: number | undefined
  onRegistered: (item: Equipment) => void
}

/** Collapsed "Register equipment" button that opens into the form. Editors only. */
export function RegisterEquipmentForm({ hospitalId, onRegistered }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className={styles.more} onClick={() => setOpen(true)}>
        Register equipment
      </button>
    )
  }

  return (
    <EquipmentForm hospitalId={hospitalId} onRegistered={onRegistered} onClose={() => setOpen(false)} />
  )
}

function EquipmentForm({ hospitalId, onRegistered, onClose }: Props & { onClose: () => void }) {
  const [locations, setLocations] = useState<LocationItem[] | null>(null)
  const [loadError, setLoadError] = useState<string>()

  useEffect(() => {
    if (!hospitalId) return
    let active = true
    getHospital(hospitalId)
      .then((hospital) => {
        if (active) setLocations(hospital.locations)
      })
      .catch(() => {
        if (active) setLoadError('The hospital’s system didn’t respond, so locations couldn’t be loaded. Try again.')
      })
    return () => {
      active = false
    }
  }, [hospitalId])

  if (!hospitalId) {
    return (
      <Panel title="Register equipment">
        <FormAlert>Your account isn’t linked to a hospital.</FormAlert>
      </Panel>
    )
  }
  if (loadError) {
    return (
      <Panel title="Register equipment">
        <FormAlert>{loadError}</FormAlert>
      </Panel>
    )
  }
  if (!locations) {
    return (
      <Panel title="Register equipment">
        <p role="status">Loading…</p>
      </Panel>
    )
  }
  if (locations.length === 0) {
    return (
      <Panel title="Register equipment">
        <p className={styles.note}>This hospital has no storage locations yet. Add one on the hospital page first.</p>
      </Panel>
    )
  }

  return <EquipmentFields locations={locations} onRegistered={onRegistered} onClose={onClose} />
}

function EquipmentFields({
  locations,
  onRegistered,
  onClose,
}: {
  locations: LocationItem[]
  onRegistered: (item: Equipment) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<EquipmentFormValues>(() => emptyEquipment(String(locations[0].id)))
  const [errors, setErrors] = useState<FieldErrors<EquipmentField>>({})
  const [alert, setAlert] = useState<string>()
  const [pending, setPending] = useState(false)

  const set =
    <K extends EquipmentField>(key: K) =>
    (value: EquipmentFormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const focusFirst = (found: FieldErrors<EquipmentField>) => {
      const first = firstErrorKey(found, EQUIPMENT_FIELD_ORDER)
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus()
      return first
    }
    setAlert(undefined)
    const found = validateEquipment(values)
    setErrors(found)
    if (focusFirst(found)) {
      setAlert('The equipment wasn’t registered. Fix the fields marked above.')
      return
    }

    setPending(true)
    try {
      const created = await createEquipment(toEquipmentInput(values))
      onRegistered(created)
      onClose()
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0
      const server = fieldErrors(error)
      const onFields: FieldErrors<EquipmentField> = {}
      for (const key of EQUIPMENT_FIELD_ORDER) if (server[key]) onFields[key] = server[key]
      setErrors(onFields)
      if (status === 400 && focusFirst(onFields)) {
        setAlert('The equipment wasn’t registered. Fix the fields marked above.')
      } else if (status === 403) {
        setAlert('Your role can’t register equipment.')
      } else {
        setAlert('The hospital’s system didn’t respond, so the equipment wasn’t registered. Try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel title="Register equipment">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          id="id"
          label="Identifier"
          hint="Asset number, e.g. VENT-04."
          value={values.id}
          onChange={set('id')}
          error={errors.id}
          autoComplete="off"
        />
        <Field id="type" label="Type">
          <select id="type" value={values.type} onChange={(event) => set('type')(event.target.value as EquipmentFormValues['type'])}>
            {EQUIPMENT_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="locationId" label="Location" error={errors.locationId}>
          <select id="locationId" value={values.locationId} onChange={(event) => set('locationId')(event.target.value)}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
        <FormAlert>{alert}</FormAlert>
        <div className={styles.formActions}>
          <Button pending={pending} pendingLabel="Registering…">
            Register
          </Button>
          <button type="button" className={styles.back} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  )
}
