describe('grocery list page imports', () => {
  it('uses @acme/db/client for grocery utilities', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const page = fs.readFileSync('apps/web/app/grocery-list/page.tsx', 'utf8')

    expect(page.includes("from '../../../../lib/db/grocery'")).toBe(false)
    expect(page.includes("from '@acme/db/client'")).toBe(true)
  })
})
