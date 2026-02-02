'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@acme/db/client'
import { Search, Filter, Plus, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { convertMealPlansToWeekPlan, convertWeekPlanToMealPlans, MEAL_TYPES, DayPlan, getStartOfWeek } from '@/lib/meal-plan'
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'

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
  const { user, signOut, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Recipe state management
  const [recipes, setRecipes] = useState<Recipe[]>([])
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
      loadRecipes()
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

  const loadRecipes = async () => {
    if (!user) return

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) return

      const response = await fetch('/api/recipes', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      })

      if (response.ok) {
        const { recipes: savedRecipes } = await response.json()
        const formattedRecipes = savedRecipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.thumbnail || '',
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          created_at: recipe.created_at,
          saved_id: recipe.id
        }))
        setRecipes(formattedRecipes)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    }
  }

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
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Redirecting to sign in...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#14151a] text-white">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="bg-[#FF3A25] rounded-md p-1.5">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12V15C21 18.3137 18.3137 21 15 21H3V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
              <path d="M12 9C10.3431 9 9 10.3431 9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-2xl font-serif italic">Remy</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => router.push('/cookbooks')} className="text-white/80 hover:text-white transition-colors">
            Cookbooks
          </button>
          <button onClick={() => router.push('/meal-planner')} className="text-white hover:text-white transition-colors">
            Meal Planner
          </button>
          <button onClick={() => router.push('/grocery-list')} className="text-white/80 hover:text-white transition-colors">
            Grocery Lists
          </button>
          <button onClick={() => router.push('/discover')} className="text-white/80 hover:text-white transition-colors">
            Discover
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="text-sm text-white/70">Welcome back, {user.email?.split('@')[0]}!</div>
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-5 w-5 text-white/70 hover:text-white" />
          </button>
          <button
            className="px-6 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 text-white font-medium rounded-full transition-colors"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Recipe Sidebar */}
        <div className="sidebar w-72 bg-[#1e1f26] border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl font-bold mb-4">Your Recipes</h2>
            
            {/* Search and Filter */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500 text-sm h-9"
                />
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFilterMenu(!showFilterMenu)
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-[#14151a] rounded-md hover:bg-[#14151a]/80 transition-colors text-sm h-9"
                >
                  <Filter className="h-4 w-4" />
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-[#14151a] rounded-md shadow-lg z-10 border border-white/10">
                    <button
                      onClick={() => { setFilterOption('recent'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
                    >
                      Most Recent
                    </button>
                    <button
                      onClick={() => { setFilterOption('oldest'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => { setFilterOption('alphabetical'); setShowFilterMenu(false); }}
                      className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
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
            <div className="space-y-3">
              {getFilteredAndSortedRecipes().map((recipe) => (
                <div
                  key={recipe.id}
                  className="recipe-card bg-[#14151a] rounded-lg p-3 cursor-pointer hover:bg-[#14151a]/80 transition-colors"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(recipe))
                  }}
                >
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-600 text-lg">🍽️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-sm leading-tight line-clamp-2">
                        {recipe.title}
                      </h3>
                      <div className="meta text-xs text-white/60 mt-1">
                        {recipe.ingredients?.length || 0} ingredients · {recipe.instructions?.length || 0} steps
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">Meal Planner</h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-white font-medium px-4">
                  {getWeekStartDate(0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setCurrentWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-white/70 hover:text-white transition-colors"
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
                  <h3 className="font-semibold text-center mb-3 text-white">
                    {DAYS_OF_WEEK[dayIndex]}
                    <br />
                    <span className="text-sm text-white/60">{new Date(day.date).getDate()}</span>
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
                          className={`calendar-cell ${flexClass} bg-[#1e1f26] rounded-lg border-2 border-dashed border-white/20 relative overflow-hidden`}
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
                                  <div className="recipe-title title text-xs text-white line-clamp-2 font-semibold flex-grow overflow-hidden" style={{ 
                                    letterSpacing: '0.5px',
                                    wordBreak: 'break-word',
                                    hyphens: 'auto',
                                    lineHeight: '1.2'
                                  }}>
                                    {meal.recipe.title}
                                  </div>
                                  <div 
                                    className="meal-type text-xs font-medium mt-1 flex-shrink-0"
                                    style={{ color: mealType.color }}
                                  >
                                    {mealType.label}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeRecipeFromMeal(globalDayIndex, mealIndex)}
                                  className="text-white/60 hover:text-white text-xs ml-1"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center">
                              <div className="text-xs text-white/40 mb-1">
                                {mealType.label}
                              </div>
                              <button 
                                onClick={() => handlePlusButtonClick(globalDayIndex, mealIndex)}
                                className="text-white/60 hover:opacity-80 transition-colors"
                                style={{ color: mealType.color }}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-[#1e1f26] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Select Recipe</h2>
              <button 
                onClick={() => {
                  setShowRecipeModal(false)
                  setSelectedSlot(null)
                }}
                className="text-[#FF3A25] font-medium text-lg"
              >
                Cancel
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="p-6 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
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
                    className="bg-[#14151a] rounded-lg p-4 cursor-pointer hover:bg-[#14151a]/80 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-gray-600 text-xl">🍽️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm leading-tight line-clamp-2 mb-1">
                          {recipe.title}
                        </h3>
                        <p className="text-white/60 text-xs">
                          {recipe.ingredients?.length || 0} ingredients
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getFilteredAndSortedRecipes().length === 0 && (
                <div className="text-center py-8">
                  <p className="text-white/60">No recipes found. Add some recipes to your cookbook first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}