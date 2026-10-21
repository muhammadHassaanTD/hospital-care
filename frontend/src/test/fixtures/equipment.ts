import type { Equipment } from '../../api/equipment'

/** A small register covering every type and status, so filters have something to show. */
export function sampleEquipment(): Equipment[] {
  return [
    { id: 'VENT-01', type: 'ventilator', location: 'ICU equipment bay', locationId: 32, status: 'available' },
    { id: 'VENT-02', type: 'ventilator', location: 'ICU equipment bay', locationId: 32, status: 'inUse' },
    { id: 'MON-01', type: 'monitor', location: 'Emergency bay', locationId: 33, status: 'available' },
    { id: 'DEF-01', type: 'defibrillator', location: 'Emergency bay', locationId: 33, status: 'maintenance' },
    { id: 'DIAL-01', type: 'dialysis', location: 'Dialysis unit', locationId: 34, status: 'outOfService' },
  ]
}
