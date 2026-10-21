import { useState } from 'react'
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  type Equipment,
  type EquipmentAction,
  type EquipmentStatus,
  type EquipmentType,
} from '../../api/equipment'
import { FilterBar } from '../../components/ui/FilterBar'
import { Panel } from '../../components/ui/Panel'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL, actionsFor, filterEquipment, type StatusFilter, type TypeFilter } from './equipment'
import styles from './Equipment.module.css'

type TableProps = {
  items: Equipment[]
  editable: boolean
  onAction: (id: string, action: EquipmentAction) => Promise<void>
}

/** Every machine at this hospital, filtered by type and status. */
export function EquipmentTable({ items, editable, onAction }: TableProps) {
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const shown = filterEquipment(items, type, status)
  const typeCount = (value: EquipmentType) => filterEquipment(items, value, status).length
  const statusCount = (value: EquipmentStatus) => filterEquipment(items, type, value).length

  return (
    <Panel title="Equipment" aside={<span className={styles.note}>{shown.length} machines</span>}>
      <div className={styles.filters}>
        <FilterBar<TypeFilter>
          label="Type"
          options={[
            { value: 'all', label: 'All', count: filterEquipment(items, 'all', status).length },
            ...EQUIPMENT_TYPES.map((item) => ({ value: item.id, label: item.label, count: typeCount(item.id) })),
          ]}
          value={type}
          onChange={setType}
        />
        <FilterBar<StatusFilter>
          label="Status"
          options={[
            { value: 'all', label: 'All', count: filterEquipment(items, type, 'all').length },
            ...EQUIPMENT_STATUSES.map((item) => ({ value: item.id, label: item.label, count: statusCount(item.id) })),
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
      <p className={styles.note}>
        Only available machines are offered for sharing. A machine in maintenance is left out of matching.
      </p>

      {shown.length === 0 ? (
        <p className={styles.note}>
          {items.length === 0
            ? 'No equipment is registered at this hospital yet.'
            : 'No equipment matches these filters.'}
        </p>
      ) : (
        <div className="table-scroll">
          <table className={styles.table}>
            <caption className="visually-hidden">Critical equipment</caption>
            <thead>
              <tr>
                <th scope="col">Identifier</th>
                <th scope="col">Type</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
                {editable && <th scope="col">Change status</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <EquipmentRow key={item.id} item={item} editable={editable} onAction={onAction} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function EquipmentRow({
  item,
  editable,
  onAction,
}: {
  item: Equipment
  editable: boolean
  onAction: (id: string, action: EquipmentAction) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const run = async (action: EquipmentAction) => {
    setBusy(true)
    try {
      await onAction(item.id, action)
    } finally {
      setBusy(false)
    }
  }
  const moves = actionsFor(item.status)

  return (
    <tr>
      <td className={styles.mono}>{item.id}</td>
      <td>{TYPE_LABEL[item.type]}</td>
      <td>{item.location}</td>
      <td>
        <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge>
      </td>
      {editable && (
        <td>
          {moves.length > 0 && (
            <div className={styles.actions}>
              {moves.map((move) => (
                <button
                  key={move.action}
                  type="button"
                  className={styles.action}
                  aria-label={`${move.label} ${item.id}`}
                  disabled={busy}
                  onClick={() => run(move.action)}
                >
                  {move.label}
                </button>
              ))}
            </div>
          )}
        </td>
      )}
    </tr>
  )
}
