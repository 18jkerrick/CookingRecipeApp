describe('meal plan module location', () => {
  it('meal planner page imports from apps/web/lib (not root lib/db)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    const page = fs.readFileSync('apps/web/app/meal-planner/page.tsx', 'utf8')

    expect(page.includes("from '../../../../lib/db/meal-plan'")).toBe(false)
    expect(page.includes("from '@/lib/meal-plan'")).toBe(true)
    expect(fs.existsSync('apps/web/lib/meal-plan.ts')).toBe(true)
    expect(fs.existsSync('lib/db/meal-plan.ts')).toBe(false)
  })
})
