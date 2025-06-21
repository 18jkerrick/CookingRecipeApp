import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const LAST_VISITED_PAGE_KEY = 'remy_last_visited_page'

// Pages that should be remembered
const PERSISTABLE_PAGES = [
  '/cookbooks',
  '/meal-planner',
  '/grocery-list',
  '/settings'
]

export function useNavigationPersistence() {
  const pathname = usePathname()

  // Save current page if it's a persistable page
  useEffect(() => {
    if (PERSISTABLE_PAGES.includes(pathname)) {
      console.log('📍 Saving page to localStorage:', pathname)
      localStorage.setItem(LAST_VISITED_PAGE_KEY, pathname)
    }
  }, [pathname])
}

export function getLastVisitedPage(): string {
  if (typeof window === 'undefined') return '/cookbooks'
  
  const lastPage = localStorage.getItem(LAST_VISITED_PAGE_KEY)
  console.log('🔍 Getting last visited page from localStorage:', lastPage)
  
  // Validate that it's still a valid page
  if (lastPage && PERSISTABLE_PAGES.includes(lastPage)) {
    console.log('✅ Valid page found:', lastPage)
    return lastPage
  }
  
  console.log('❌ No valid page found, defaulting to cookbooks')
  // Default to cookbooks
  return '/cookbooks'
}

export function clearLastVisitedPage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAST_VISITED_PAGE_KEY)
  }
}