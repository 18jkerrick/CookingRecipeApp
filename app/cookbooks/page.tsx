'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import PushNotificationPrompt from '../../components/PushNotificationPrompt'
import RecipeCard from '../../components/RecipeCard'
import RecipeDetailModal from '../../components/RecipeDetailModal'
import { BookOpen, Search, Filter, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'

export default function Cookbooks() {
  const { user, signOut, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const router = useRouter()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Recipe state management
  const [recipes, setRecipes] = useState<any[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())
  const [url, setUrl] = useState('')
  const [extractionPhase, setExtractionPhase] = useState<'text' | 'audio' | 'video'>('text')
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOption, setFilterOption] = useState<'recent' | 'oldest' | 'alphabetical'>('recent')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFilterMenu(false)
    }
    
    if (showFilterMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showFilterMenu])

  // Load saved recipes on mount
  useEffect(() => {
    if (user) {
      loadSavedRecipes()
    }
  }, [user])

  const loadSavedRecipes = async () => {
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
        
        // Convert saved recipes to our format and track their IDs
        const formattedRecipes = savedRecipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.thumbnail || '',
          processing: false,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          platform: recipe.platform,
          source: recipe.source,
          thumbnail: recipe.thumbnail || '',
          saved_id: recipe.id, // Track the database ID
          created_at: recipe.created_at // Preserve the creation timestamp
        }))

        // Preserve any existing processing cards at the front when loading saved recipes
        setRecipes(prev => {
          const processingCards = prev.filter(recipe => recipe.processing)
          return [...processingCards, ...formattedRecipes]
        })
        setSavedRecipeIds(new Set(savedRecipes.map((r: any) => r.id)))
      }
    } catch (error) {
      console.error('Error loading saved recipes:', error)
    }
  }

  const saveRecipe = async (recipe: any, originalUrl?: string) => {
    if (!user) {
      console.log('Cannot save recipe: No user')
      return null
    }

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        console.log('Cannot save recipe: No session token')
        return null
      }
      console.log('Saving recipe with auth token...')

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          title: recipe.title,
          thumbnail: recipe.thumbnail,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          platform: recipe.platform,
          source: recipe.source,
          original_url: originalUrl,
          normalizedIngredients: recipe.normalizedIngredients
        })
      })

      if (response.ok) {
        const { recipe: savedRecipe } = await response.json()
        console.log('Recipe saved successfully:', savedRecipe.id)
        setSavedRecipeIds(prev => new Set([...prev, savedRecipe.id]))
        return savedRecipe.id
      } else {
        const errorData = await response.json()
        console.error('Failed to save recipe:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
    }
    return null
  }

  const deleteRecipe = async (savedId: string) => {
    if (!user) return false

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) return false

      const response = await fetch(`/api/recipes/${savedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      })

      if (response.ok) {
        setSavedRecipeIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(savedId)
          return newSet
        })
        
        // Remove from recipes list
        setRecipes(prev => prev.filter(recipe => recipe.saved_id !== savedId))
        return true
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
    return false
  }

  useEffect(() => {
    // Redirect to sign-in page if not authenticated
    if (isClient && !loading && !user) {
      router.push('/')
      return
    }

    // Check if we should show the notification prompt
    if (isClient && user && !loading) {
      const hasRequestedPermission = localStorage.getItem('notificationPermissionRequested')
      if (!hasRequestedPermission && 'Notification' in window) {
        // Show prompt after a short delay for better UX
        const timer = setTimeout(() => {
          setShowNotificationPrompt(true)
        }, 1500)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isClient, loading, user, router])

  const handleUrlSubmit = async (urlToExtract: string, processingId: number) => {
    console.log('Extracting recipe from URL:', urlToExtract)
    setIsExtracting(true)
    setUrl('') // Clear the input

    // Simulate phase progression for better UX
    setExtractionPhase('text')
    setTimeout(() => setExtractionPhase('audio'), 2000) // After 2 seconds
    setTimeout(() => setExtractionPhase('video'), 5000) // After 5 seconds

    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToExtract, mode: 'full' }), // Add mode parameter
        signal: controller.signal
      })

      clearTimeout(timeoutId); // Clear timeout if request completes

      const data = await response.json()

      if (response.ok && data.ingredients && data.ingredients.length > 0) {
        // Use the title from API or fallback to generated title
        const recipeTitle = data.title || 
          (data.ingredients.length > 0 
            ? `Recipe with ${data.ingredients[0].split(' ').slice(-1)[0]}${data.ingredients.length > 1 ? ' and more' : ''}`
            : 'Extracted Recipe')

        // Create the recipe object
        const newRecipe = {
          id: Date.now(),
          title: recipeTitle,
          imageUrl: data.thumbnail || '', // Use thumbnail from API
          processing: false,
          ingredients: data.ingredients,
          instructions: data.instructions,
          platform: data.platform,
          source: data.source,
          thumbnail: data.thumbnail || '',
          normalizedIngredients: data.normalizedIngredients || []
        }

        // Auto-save the recipe to database
        console.log('Attempting to save recipe:', newRecipe.title)
        const savedId = await saveRecipe(newRecipe, urlToExtract)
        console.log('Recipe save result:', savedId)
        
        // Replace the processing card with the actual recipe (maintain front position)
        setRecipes(prev => 
          prev.map(recipe => 
            recipe.id === processingId 
              ? {
                  ...newRecipe,
                  saved_id: savedId, // Track the database ID
                  created_at: new Date().toISOString() // Add current timestamp
                }
              : recipe
          )
        )
        
        console.log('Recipe extracted and saved successfully:', data)
      } else {
        // Remove the processing card and show error
        setRecipes(prev => prev.filter(recipe => recipe.id !== processingId))
        alert(data.error || data.message || 'Failed to extract recipe. Please try a different URL.')
      }
    } catch (error) {
      console.error('Error extracting recipe:', error)
      // Remove the processing card and show error
      setRecipes(prev => prev.filter(recipe => recipe.id !== processingId))
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          alert('Request timed out after 10 minutes. Please try a shorter video or try again later.')
        } else {
          alert(`Failed to extract recipe: ${error.message}`)
        }
      } else {
        alert('Failed to extract recipe. Please check your internet connection and try again.')
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const handleRecipeClick = (recipe: any) => {
    // Only show detail for non-processing recipes that have ingredients
    if (!recipe.processing && recipe.ingredients && recipe.ingredients.length > 0) {
      setSelectedRecipe(recipe)
      setShowRecipeModal(true)
    }
  }

  const handleSubmit = () => {
    if (url.trim()) {
      // Add processing card immediately before any API calls
      const processingId = Date.now()
      setRecipes(prev => [{
        id: processingId,
        title: '',
        imageUrl: '',
        processing: true,
        ingredients: [],
        instructions: [],
        platform: '',
        source: '',
        thumbnail: '',
        extractionPhase: 'text'
      }, ...prev])
      
      // Start extraction with the processing ID
      handleUrlSubmit(url.trim(), processingId)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  // Filter and sort recipes
  const getFilteredAndSortedRecipes = () => {
    let filteredRecipes = recipes;

    // Separate processing and completed recipes
    const processingRecipes = filteredRecipes.filter(recipe => recipe.processing);
    const completedRecipes = filteredRecipes.filter(recipe => !recipe.processing);

    // Apply search filter only to completed recipes
    let searchFilteredRecipes = completedRecipes;
    if (searchTerm) {
      searchFilteredRecipes = completedRecipes.filter(recipe =>
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting only to completed recipes
    let sortedCompletedRecipes = searchFilteredRecipes;
    switch (filterOption) {
      case 'recent':
        sortedCompletedRecipes = [...searchFilteredRecipes].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Newest first
        });
        break;
      case 'oldest':
        sortedCompletedRecipes = [...searchFilteredRecipes].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB; // Oldest first
        });
        break;
      case 'alphabetical':
        sortedCompletedRecipes = [...searchFilteredRecipes].sort((a, b) => 
          (a.title || '').localeCompare(b.title || '')
        );
        break;
    }

    // Always return processing recipes first, then sorted completed recipes
    return [...processingRecipes, ...sortedCompletedRecipes];
  }

  // Show loading until client-side hydration is complete
  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  // This should rarely be seen since we redirect above, but just in case
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
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
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
          <button onClick={() => router.push('/cookbooks')} className="text-white hover:text-white transition-colors">
            Cookbooks
          </button>
          <button onClick={() => router.push('/meal-planner')} className="text-white/80 hover:text-white transition-colors">
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-12 text-center">
        <div className="relative inline-block">
          <h1 className="text-7xl md:text-9xl font-bold italic text-[#a5a6ff] tracking-tight font-serif relative z-20">
            RECIPES
          </h1>
          {/* Star decoration overlapping text on the left */}
          <svg className="absolute -left-12 -top-4 md:-left-16 md:-top-8 w-32 md:w-40 h-32 md:h-40 text-[#FF3A25]" viewBox="0 0 100 100" fill="none">
            <path 
              d="M50 5 L61 35 L95 35 L70 55 L81 85 L50 65 L19 85 L30 55 L5 35 L39 35 Z" 
              stroke="currentColor" 
              strokeWidth="6"
              fill="none"
              transform="rotate(15 50 50)"
            />
          </svg>
          {/* Books icon */}
          <div className="absolute -right-12 -bottom-8 md:-right-20 md:-bottom-8 w-24 md:w-32 z-0">
            <div className="relative w-full h-full">
              <div className="absolute transform rotate-12">
                <BookOpen className="h-24 md:h-32 w-24 md:w-32 text-[#FF3A25]" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-8 md:mt-12 p-6 md:p-8 rounded-xl bg-[#1e1f26]">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Cookbooks</h2>
          <p className="text-white/70 mb-6 relative z-20">
            Extract recipes from any website and organize them in your personal cookbooks
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Paste a recipe URL here..."
              className="bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isExtracting}
            />
            <Button 
              className="bg-[#FF3A25] hover:bg-[#FF3A25]/90 text-white"
              onClick={handleSubmit}
              disabled={!url.trim() || isExtracting}
            >
              {isExtracting ? 'Extracting...' : 'Extract Recipe'}
            </Button>
          </div>
        </div>
      </section>

      {/* Recipe Grid */}
      <section className="container mx-auto px-4 py-4 md:py-6">
        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search recipes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1e1f26] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e1f26] rounded-md hover:bg-[#1e1f26]/80 transition-colors"
            >
              <Filter className="h-5 w-5" />
              <span className="capitalize">{filterOption}</span>
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1e1f26] rounded-md shadow-lg z-10 border border-white/10">
                <button
                  onClick={() => { setFilterOption('recent'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-white/10 transition-colors"
                >
                  Most Recent
                </button>
                <button
                  onClick={() => { setFilterOption('oldest'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-white/10 transition-colors"
                >
                  Oldest
                </button>
                <button
                  onClick={() => { setFilterOption('alphabetical'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-white/10 transition-colors"
                >
                  Alphabetical
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {getFilteredAndSortedRecipes().map((recipe) => (
            <div key={recipe.id} onClick={() => handleRecipeClick(recipe)}>
              <RecipeCard
                title={recipe.title}
                imageUrl={recipe.imageUrl}
                processing={recipe.processing}
                extractionPhase={recipe.processing ? extractionPhase : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      <PushNotificationPrompt
        isOpen={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
      />

      <RecipeDetailModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        recipe={selectedRecipe}
        isSaved={selectedRecipe?.saved_id ? savedRecipeIds.has(selectedRecipe.saved_id) : false}
        onSave={() => {/* Already saved automatically */}}
        onUpdate={(updatedRecipe) => {
          // Update the recipe in the recipes list
          setRecipes(prev => prev.map(recipe => 
            recipe.saved_id === updatedRecipe.saved_id 
              ? { ...recipe, ...updatedRecipe, imageUrl: updatedRecipe.thumbnail || recipe.imageUrl }
              : recipe
          ));
          // Update the selected recipe for the modal
          setSelectedRecipe(updatedRecipe);
        }}
        onDelete={async () => {
          if (selectedRecipe?.saved_id) {
            const success = await deleteRecipe(selectedRecipe.saved_id)
            if (success) {
              setShowRecipeModal(false)
            }
          }
        }}
      />
    </div>
  )
}