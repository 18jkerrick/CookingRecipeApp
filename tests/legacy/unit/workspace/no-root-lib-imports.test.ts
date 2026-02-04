describe('no root lib imports', () => {
  it('apps/web does not import from root lib/', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')

    // Minimal set of “hot” files we already touched; expand later if desired
    const groceryPage = fs.readFileSync('apps/web/app/grocery-list/page.tsx', 'utf8')
    const mealPlannerPage = fs.readFileSync('apps/web/app/meal-planner/page.tsx', 'utf8')
    const testRetailersRoute = fs.readFileSync('apps/web/app/api/test-retailers/route.ts', 'utf8')

    expect(groceryPage.includes('/lib/db/')).toBe(false)
    expect(mealPlannerPage.includes('/lib/db/')).toBe(false)
    expect(testRetailersRoute.includes('/lib/')).toBe(false)
  })
})
