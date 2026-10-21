import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { at } from '../../test/clock'
import { mockStaffApi } from '../../test/mockApi'
import { renderStaff } from '../../test/renderStaff'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(at('15:00'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

describe('EquipmentPage', () => {
  it('filters the register by type and by status', async () => {
    mockStaffApi({ role: 'nurse' })
    renderStaff('/staff/equipment')
    const panel = await screen.findByRole('region', { name: 'Equipment' })
    const table = within(panel).getByRole('table', { name: 'Critical equipment' })
    expect(bodyRows(table).map((row) => row.textContent)).toEqual([
      expect.stringContaining('VENT-01'),
      expect.stringContaining('VENT-02'),
      expect.stringContaining('MON-01'),
      expect.stringContaining('DEF-01'),
      expect.stringContaining('DIAL-01'),
    ])

    await userEvent.click(within(panel).getByRole('button', { name: /^Ventilator/ }))
    expect(bodyRows(table).every((row) => row.textContent?.includes('Ventilator'))).toBe(true)
    expect(within(panel).getByText('VENT-02')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: /^In use/ }))
    expect(bodyRows(table)).toHaveLength(1)
    expect(within(panel).getByText('VENT-02')).toBeInTheDocument()
  })

  it('says when the filters match nothing', async () => {
    mockStaffApi({ role: 'doctor' })
    renderStaff('/staff/equipment')
    const panel = await screen.findByRole('region', { name: 'Equipment' })
    await userEvent.click(within(panel).getByRole('button', { name: /^Dialysis/ }))
    await userEvent.click(within(panel).getByRole('button', { name: /^Available/ }))
    expect(within(panel).getByText('No equipment matches these filters.')).toBeInTheDocument()
  })

  it('lets a doctor look but not register', async () => {
    mockStaffApi({ role: 'doctor' })
    renderStaff('/staff/equipment')
    expect(await screen.findByRole('region', { name: 'Equipment' })).toBeInTheDocument()
    expect(screen.getByText('View only: your role can’t register equipment.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Register equipment' })).not.toBeInTheDocument()
  })

  it('lets a nurse register a machine and shows it in the list', async () => {
    mockStaffApi({ role: 'nurse' })
    renderStaff('/staff/equipment')
    await userEvent.click(await screen.findByRole('button', { name: 'Register equipment' }))
    const form = within(await screen.findByRole('region', { name: 'Register equipment' }))
    await userEvent.type(form.getByLabelText('Identifier'), 'VENT-99')
    await userEvent.selectOptions(form.getByLabelText('Type'), 'Dialysis')
    await userEvent.selectOptions(form.getByLabelText('Location'), 'Dialysis unit')
    await userEvent.click(form.getByRole('button', { name: 'Register' }))

    const panel = await screen.findByRole('region', { name: 'Equipment' })
    const row = within(panel).getByRole('row', { name: /VENT-99/ })
    expect(row).toHaveTextContent('Dialysis')
    expect(row).toHaveTextContent('Dialysis unit')
    expect(row).toHaveTextContent('Available')
    expect(screen.getByRole('button', { name: 'Register equipment' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Register equipment' })).not.toBeInTheDocument()
  })
})
