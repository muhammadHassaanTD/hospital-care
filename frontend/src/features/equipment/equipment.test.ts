import { describe, expect, it } from 'vitest'
import { sampleEquipment } from '../../test/fixtures/equipment'
import { filterEquipment } from './equipment'

describe('filterEquipment', () => {
  const items = sampleEquipment()

  it('keeps every machine when both filters are all, type then identifier', () => {
    expect(filterEquipment(items, 'all', 'all').map((item) => item.id)).toEqual([
      'VENT-01',
      'VENT-02',
      'MON-01',
      'DEF-01',
      'DIAL-01',
    ])
  })

  it('filters by type and status together', () => {
    expect(filterEquipment(items, 'ventilator', 'available').map((item) => item.id)).toEqual(['VENT-01'])
    expect(filterEquipment(items, 'dialysis', 'available')).toEqual([])
  })
})
