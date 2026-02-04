import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroceryList from '@/components/features/grocery/GroceryList'

vi.mock('@acme/core/utils/exportTxt', () => ({
  exportTxt: vi.fn(),
}))

describe('GroceryList', () => {
  afterEach(() => {
    cleanup()
  })

  const baseItems = [
    { name: 'flour', quantity: 2, unit: 'cup' },
    { name: 'eggs', quantity: 3, unit: '' },
    { name: 'milk', quantity: 1, unit: 'cup' },
  ]

  it('renders item rows with editable inputs', () => {
    render(<GroceryList items={baseItems} />)

    expect(screen.getByDisplayValue('flour')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('cup')).toHaveLength(2)

    expect(screen.getByDisplayValue('eggs')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
  })

  it('updates quantity input as the user types', async () => {
    const user = userEvent.setup()
    render(<GroceryList items={baseItems} />)

    const quantityInput = screen.getAllByDisplayValue('2')[0]
    await user.clear(quantityInput)
    await user.type(quantityInput, '2.5')

    expect(quantityInput).toHaveValue('2.5')
  })

  it('calls onAddToExisting with current items', async () => {
    const user = userEvent.setup()
    const onAddToExisting = vi.fn()
    render(<GroceryList items={baseItems} onAddToExisting={onAddToExisting} />)

    await user.click(
      screen.getByRole('button', { name: 'Add to Existing List' })
    )

    expect(onAddToExisting).toHaveBeenCalledTimes(1)
    expect(onAddToExisting).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'flour' }),
        expect.objectContaining({ name: 'eggs' }),
      ])
    )
  })

  it('disables create button until list name is provided', async () => {
    const user = userEvent.setup()
    const onCreateNew = vi.fn()
    render(<GroceryList items={baseItems} onCreateNew={onCreateNew} />)

    const createButton = screen.getByRole('button', {
      name: 'Create New List',
    })
    expect(createButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Enter list name...'), 'Dinner')
    expect(createButton).toBeEnabled()

    await user.click(createButton)
    expect(onCreateNew).toHaveBeenCalledWith('Dinner', expect.any(Array))
  })

  it('removes an item after delete confirmation', async () => {
    const user = userEvent.setup()
    render(<GroceryList items={baseItems} />)

    expect(screen.getByDisplayValue('flour')).toBeInTheDocument()

    const minusButtons = screen.getAllByText('−')
    await user.click(minusButtons[0])

    await user.click(screen.getByText('✕'))

    expect(screen.queryByDisplayValue('flour')).not.toBeInTheDocument()
  })
})
