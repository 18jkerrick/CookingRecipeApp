describe('test-retailers route imports', () => {
  it('imports instacart parser from packages/integrations', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const route = fs.readFileSync('apps/web/app/api/test-retailers/route.ts', 'utf8')

    expect(route.includes("from '../../../../../lib/instacartParser'")).toBe(false)
    expect(route.includes("from '@acme/integrations/grocery-delivery/instacart-parser'")).toBe(true)
  })
})
