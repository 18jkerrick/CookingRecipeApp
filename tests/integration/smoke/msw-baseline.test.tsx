import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

function FetchProbe() {
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const res = await fetch('http://localhost/api/test')
          const json = await res.json()
          const el = document.getElementById('out')
          if (el) el.textContent = json.ok ? 'ok' : 'not-ok'
        }}
      >
        Load
      </button>
      <div id="out" aria-label="result" />
    </div>
  )
}

describe('MSW (baseline)', () => {
  it('intercepts fetch and returns mocked response', async () => {
    const user = userEvent.setup()

    render(<FetchProbe />)
    await user.click(screen.getByRole('button', { name: 'Load' }))

    expect(await screen.findByLabelText('result')).toHaveTextContent('ok')
  })
})
