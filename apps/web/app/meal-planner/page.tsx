'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@acme/db/client'
import { Search, Filter, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { convertMealPlansToWeekPlan, convertWeekPlanToMealPlans, MEAL_TYPES, DayPlan, getStartOfWeek } from '@/lib/meal-plan'
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'
import { Navigation } from '../../components/shared/Navigation'
import { useRecipes } from '../../hooks/useRecipes'
import { RecipeSidebarSkeleton } from '../../components/skeletons'

// Types for meal planning (Recipe interface for local use)
interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  ingredients: string[];
  instructions: string[];
  created_at: string;
  saved_id: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MealPlanner() {
  const { user, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Get auth token for API calls
  useEffect(() => {
    const getToken = async () => {
      const { data: session } = await supabase.auth.getSession()
      setToken(session?.session?.access_token ?? null)
    }
    if (user) {
      getToken()
    }
  }, [user])

  // Use React Query for recipes
  const { recipes: fetchedRecipes, isLoading: isLoadingRecipes } = useRecipes(token, { enabled: !!user })

  // Convert fetched recipes to local format
  const recipes = useMemo(() => {
    return fetchedRecipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.thumbnail || '',
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      created_at: recipe.created_at,
      saved_id: recipe.id
    }))
  }, [fetchedRecipes])

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOption, setFilterOption] = useState<'recent' | 'oldest' | 'alphabetical'>('recent')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Meal planning state
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [weeksToShow, setWeeksToShow] = useState(1) // Show 1 week at a time
  
  // Recipe selection modal state
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{dayIndex: number, mealIndex: number} | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !user) {
      router.push('/')
      return
    }
    if (user) {
      initializeWeek()
    }
  }, [isClient, loading, user, router])

  // Reload weeks when currentWeek changes
  useEffect(() => {
    if (user) {
      initializeWeek()
    }
  }, [currentWeek, weeksToShow, user])

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowFilterMenu(false)
    if (showFilterMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showFilterMenu])

  // Reload meal plans when localStorage changes (meal plans updated from modal)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mealPlans' && user) {
        initializeWeek()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user, currentWeek])

  // Also reload when the page becomes visible (fallback)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        initializeWeek()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, currentWeek])

  const initializeWeek = () => {
    // Load multiple weeks from shared meal plan storage
    const allWeeks: DayPlan[] = []
    
    for (let weekNum = 0; weekNum < weeksToShow; weekNum++) {
      const weekStart = new Date(currentWeek)
      weekStart.setDate(currentWeek.getDate() + (weekNum * 7))
      const weekPlan = convertMealPlansToWeekPlan(weekStart)
      allWeeks.push(...weekPlan)
    }
    
    setWeekPlan(allWeeks)
  }

  // Generate weeks array for display
  const getWeeksArray = () => {
    const weeks: DayPlan[][] = []
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = i * 7
      const week = weekPlan.slice(weekStart, weekStart + 7)
      if (week.length === 7) {
        weeks.push(week)
      }
    }
    return weeks
  }

  // Get week start date for a given week index
  const getWeekStartDate = (weekIndex: number) => {
    const startOfWeek = getStartOfWeek(currentWeek)
    const weekStart = new Date(startOfWeek)
    weekStart.setDate(startOfWeek.getDate() + (weekIndex * 7))
    return weekStart
  }

  const getFilteredAndSortedRecipes = () => {
    let filteredRecipes = recipes

    if (searchTerm) {
      filteredRecipes = filteredRecipes.filter(recipe =>
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    switch (filterOption) {
      case 'recent':
        filteredRecipes = [...filteredRecipes].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        })
        break
      case 'oldest':
        filteredRecipes = [...filteredRecipes].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateA - dateB
        })
        break
      case 'alphabetical':
        filteredRecipes = [...filteredRecipes].sort((a, b) => 
          (a.title || '').localeCompare(b.title || '')
        )
        break
    }

    return filteredRecipes
  }

  const addRecipeToMeal = (dayIndex: number, mealIndex: number, recipe: Recipe) => {
    setWeekPlan(prev => {
      const newPlan = [...prev]
      newPlan[dayIndex].meals[mealIndex].recipe = recipe
      
      // Save to shared storage
      convertWeekPlanToMealPlans(newPlan)
      
      return newPlan
    })
  }

  const removeRecipeFromMeal = (dayIndex: number, mealIndex: number) => {
    setWeekPlan(prev => {
      const newPlan = [...prev]
      newPlan[dayIndex].meals[mealIndex].recipe = undefined
      
      // Save to shared storage
      convertWeekPlanToMealPlans(newPlan)
      
      return newPlan
    })
  }

  const handlePlusButtonClick = (dayIndex: number, mealIndex: number) => {
    setSelectedSlot({ dayIndex, mealIndex })
    setShowRecipeModal(true)
  }

  const handleRecipeSelect = (recipe: Recipe) => {
    if (selectedSlot) {
      addRecipeToMeal(selectedSlot.dayIndex, selectedSlot.mealIndex, recipe)
      setShowRecipeModal(false)
      setSelectedSlot(null)
    }
  }

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-wk-bg-primary text-wk-text-primary">
        <Navigation currentPath="/meal-planner" />
        <div className="flex h-[calc(100vh-73px)]">
          {/* Recipe Sidebar Skeleton */}
          <div className="sidebar w-72 bg-wk-bg-surface border-r border-wk-border flex flex-col shadow-wk">
            <div className="p-4 border-b border-wk-border">
              <div className="h-6 bg-wk-bg-surface-hover rounded w-1/2 mb-4 animate-pulse" />
              <div className="h-9 bg-wk-bg-surface-hover rounded animate-pulse" />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <RecipeSidebarSkeleton count={6} />
            </div>
          </div>
          {/* Calendar Skeleton */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-wk-border">
              <div className="h-8 bg-wk-bg-surface-hover rounded w-1/4 animate-pulse" />
            </div>
            <div className="flex-1 p-4">
              <div className="grid grid-cols-7 gap-3 h-full">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex flex-col h-full">
                    <div className="h-12 bg-wk-bg-surface-hover rounded mb-3 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-20 bg-wk-bg-surface rounded border-2 border-dashed border-wk-border animate-pulse" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Redirecting to sign in...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-wk-bg-primary text-wk-text-primary">
      {/* Navigation */}
      <Navigation currentPath="/meal-planner" />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Recipe Sidebar */}
        <div className="sidebar w-72 bg-wk-bg-surface border-r border-wk-border flex flex-col shadow-wk">
          <div className="p-4 border-b border-wk-border">
            <h2 className="text-xl font-display font-semibold mb-4 text-wk-text-primary">Your Recipes</h2>
            
            {/* Search and Filter */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wk-text-muted h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary placeholder:text-wk-text-muted text-sm h-9 font-body"
                />
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFilterMenu(!showFilterMenu)
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-wk-bg-primary border border-wk-border rounded-md hover:bg-wk-bg-surface-hover transition-colors text-sm h-9 text-wk-text-secondary"
                >
                  <Filter className="h-4 w-4" />
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-wk-bg-surface rounded-md shadow-wk z-10 border border-wk-border">
                    <button
                      onClick={() => { setFilterOption('recent'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-wk-bg-surface-hover transition-colors text-sm text-wk-text-secondary font-body"
                    >
                      Most Recent
                    </button>
                    <button
                      onClick={() => { setFilterOption('oldest'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-wk-bg-surface-hover transition-colors text-sm text-wk-text-secondary font-body"
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => { setFilterOption('alphabetical'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-wk-bg-surface-hover transition-colors text-sm text-wk-text-secondary font-body"
                    >
                      Alphabetical
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recipe List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingRecipes ? (
              <RecipeSidebarSkeleton count={6} />
            ) : (
            <div className="space-y-3">
              {getFilteredAndSortedRecipes().map((recipe) => (
                <div
                  key={recipe.id}
                  className="recipe-card bg-wk-bg-primary rounded-lg p-3 cursor-pointer hover:bg-wk-bg-surface-hover transition-colors border border-wk-border shadow-wk"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(recipe))
                  }}
                >
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-wk-bg-surface rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-wk-text-muted text-lg">🍽️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-wk-text-primary text-sm leading-tight line-clamp-2 font-body">
                        {recipe.title}
                      </h3>
                      <div className="meta text-xs text-wk-text-muted mt-1 font-body">
                        {recipe.ingredients?.length || 0} ingredients · {recipe.instructions?.length || 0} steps
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Calendar Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-wk-border">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-h1 font-display text-wk-text-primary">Meal Planner</h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-wk-text-secondary hover:text-wk-text-primary transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-wk-text-primary font-medium font-body px-4">
                  {getWeekStartDate(0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-wk-text-secondary hover:text-wk-text-primary transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-7 gap-3 h-full">
              {getWeeksArray()[0]?.map((day, dayIndex) => (
                <div key={day.date} className="flex flex-col h-full">
                  <h3 className="font-semibold text-center mb-3 text-wk-text-secondary font-body">
                    {DAYS_OF_WEEK[dayIndex]}
                    <br />
                    <span className="text-sm text-wk-text-muted">{new Date(day.date).getDate()}</span>
                  </h3>
                  
                        <div className="flex flex-col gap-2 flex-1">
                          {MEAL_TYPES.map((mealType, mealIndex) => {
                            const globalDayIndex = dayIndex
                            const meal = weekPlan[globalDayIndex]?.meals[mealIndex]
                      const flexClass = 
                        mealType.type === 'breakfast' || mealType.type === 'lunch' ? 'flex-[1.5]' :
                        mealType.type === 'dinner' ? 'flex-[2]' :
                        mealType.type === 'dessert' ? 'flex-[1]' : 'flex-[1]'
                      
                      return (
                        <div
                          key={mealType.type}
                          className={`calendar-cell ${flexClass} bg-wk-bg-surface rounded-lg border-2 border-dashed border-wk-border relative overflow-hidden shadow-wk hover:bg-wk-bg-surface-hover transition-colors`}
                          style={{ 
                            minHeight: mealType.type === 'breakfast' || mealType.type === 'lunch' ? '90px' :
                                      mealType.type === 'dinner' ? '110px' :
                                      mealType.type === 'dessert' ? '80px' : '80px',
                            boxSizing: 'border-box'
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            try {
                              const recipe = JSON.parse(e.dataTransfer.getData('application/json'))
                              addRecipeToMeal(globalDayIndex, mealIndex, recipe)
                            } catch (error) {
                              console.error('Error dropping recipe:', error)
                            }
                          }}
                        >
                          {meal?.recipe ? (
                            <div 
                              className="h-full p-2 rounded-lg border box-border"
                              style={{
                                backgroundColor: `${mealType.color}10`,
                                borderColor: `${mealType.color}30`,
                                padding: '8px'
                              }}
                            >
                              <div className="flex justify-between items-start h-full overflow-hidden">
                                <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                                  <div className="recipe-title title text-xs text-wk-text-primary line-clamp-2 font-semibold font-body flex-grow overflow-hidden" style={{ 
                                    letterSpacing: '0.5px',
                                    wordBreak: 'break-word',
                                    hyphens: 'auto',
                                    lineHeight: '1.2'
                                  }}>
                                    {meal.recipe.title}
                                  </div>
                                  <div 
                                    className="meal-type text-xs font-medium font-body mt-1 flex-shrink-0"
                                    style={{ color: mealType.color }}
                                  >
                                    {mealType.label}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeRecipeFromMeal(globalDayIndex, mealIndex)}
                                  className="text-wk-text-muted hover:text-wk-text-primary text-xs ml-1 transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handlePlusButtonClick(globalDayIndex, mealIndex)}
                              className="h-full w-full flex flex-col items-center justify-center cursor-pointer hover:bg-wk-bg-surface-hover transition-colors rounded"
                            >
                              <div className="text-xs text-wk-text-muted mb-1 font-body">
                                {mealType.label}
                              </div>
                              <div 
                                className="text-wk-text-muted hover:text-wk-accent transition-colors"
                                style={{ color: mealType.color }}
                              >
                                <Plus className="h-4 w-4" />
                              </div>
                            </button>
                          )}
                        </div>
                            )
                          })}
                        </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selection Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-wk">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-xl font-display font-semibold text-wk-text-primary">Select Recipe</h2>
              <button 
                onClick={() => {
                  setShowRecipeModal(false)
                  setSelectedSlot(null)
                }}
                className="text-wk-accent font-medium text-lg font-body hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-6 border-b border-wk-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wk-text-muted h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary placeholder:text-wk-text-muted font-body"
                />
              </div>
            </div>
            
            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {getFilteredAndSortedRecipes().map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => handleRecipeSelect(recipe)}
                    className="bg-wk-bg-primary rounded-lg p-4 cursor-pointer hover:bg-wk-bg-surface-hover transition-colors border border-wk-border shadow-wk"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-wk-bg-surface rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-wk-text-muted text-xl">🍽️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-wk-text-primary text-sm leading-tight line-clamp-2 mb-1 font-body">
                          {recipe.title}
                        </h3>
                        <p className="text-wk-text-muted text-xs font-body">
                          {recipe.ingredients?.length || 0} ingredients
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getFilteredAndSortedRecipes().length === 0 && (
                <div className="text-center py-8">
                  <p className="text-wk-text-secondary font-body">No recipes found. Add some recipes to your cookbook first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}