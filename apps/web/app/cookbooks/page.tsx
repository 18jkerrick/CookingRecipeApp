'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import PushNotificationPrompt from '../../components/shared/PushNotificationPrompt'
import RecipeCard from '../../components/features/recipe/RecipeCard'
import RecipeDetailModal from '../../components/features/recipe/RecipeDetailModal'
import { Navigation } from '../../components/shared/Navigation'
import { Search, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'
import { useRecipes, useDeleteRecipe } from '../../hooks/useRecipes'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { RecipeGridSkeleton } from '../../components/skeletons'

export default function Cookbooks() {
  const { user, loading, accessToken } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const router = useRouter()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Use token directly from auth context (no extra fetch needed)
  const token = accessToken

  // Use React Query for recipes with infinite scroll
  const {
    recipes: fetchedRecipes,
    isLoading: isLoadingRecipes,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch: refetchRecipes,
  } = useRecipes(token, { enabled: !!user })

  // Delete mutation with optimistic update
  const deleteRecipeMutation = useDeleteRecipe(token)

  // Local state for processing cards (recipes being extracted)
  const [processingRecipes, setProcessingRecipes] = useState<any[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [url, setUrl] = useState('')
  const [extractionPhase, setExtractionPhase] = useState<'text' | 'audio' | 'video'>('text')
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOption, setFilterOption] = useState<'recent' | 'oldest' | 'alphabetical'>('recent')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Infinite scroll sentinel ref
  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage ?? false,
    isFetchingNextPage
  )

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

  // Convert fetched recipes to display format
  const recipes = useMemo(() => {
    const formattedRecipes = fetchedRecipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.thumbnail || '',
      processing: false,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      platform: recipe.platform,
      source: recipe.source,
      thumbnail: recipe.thumbnail || '',
      saved_id: recipe.id,
      created_at: recipe.created_at,
      normalized_ingredients: recipe.normalized_ingredients,
    }))
    // Processing cards always go first
    return [...processingRecipes, ...formattedRecipes]
  }, [fetchedRecipes, processingRecipes])

  // Track saved recipe IDs from fetched data
  const savedRecipeIds = useMemo(() => 
    new Set(fetchedRecipes.map(r => r.id)),
    [fetchedRecipes]
  )

  const saveRecipe = async (recipe: any, originalUrl?: string) => {
    if (!user || !token) {
      console.log('Cannot save recipe: No user or token')
      return null
    }

    try {
      console.log('Saving recipe with auth token...')

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        // Refetch to get the new recipe in the list
        refetchRecipes()
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
      await deleteRecipeMutation.mutateAsync(savedId)
      return true
    } catch (error) {
      console.error('Error deleting recipe:', error)
      return false
    }
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

    // Keep extraction phase at 'text' - actual progress comes from backend
    setExtractionPhase('text')

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
        
        // Refetch recipes BEFORE removing processing card to prevent visual gap
        await refetchRecipes()
        
        // Now remove the processing card - the saved recipe is already in the list
        setProcessingRecipes(prev => prev.filter(recipe => recipe.id !== processingId))
        
        console.log('Recipe extracted and saved successfully:', data)
      } else {
        // Remove the processing card and show error
        setProcessingRecipes(prev => prev.filter(recipe => recipe.id !== processingId))
        alert(data.error || data.message || 'Failed to extract recipe. Please try a different URL.')
      }
    } catch (error) {
      console.error('Error extracting recipe:', error)
      // Remove the processing card and show error
      setProcessingRecipes(prev => prev.filter(recipe => recipe.id !== processingId))
      
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
      setProcessingRecipes(prev => [{
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
      <div className="min-h-screen bg-wk-bg-primary">
        <Navigation currentPath="/cookbooks" />
        <section className="container mx-auto px-4 py-8 md:py-10 text-center">
          <div className="max-w-2xl mx-auto p-6 md:p-8 rounded-xl bg-wk-bg-surface shadow-wk">
            <div className="h-8 bg-wk-bg-surface-hover rounded w-1/3 mx-auto mb-2 animate-pulse" />
            <div className="h-4 bg-wk-bg-surface-hover rounded w-2/3 mx-auto mb-6 animate-pulse" />
            <div className="h-10 bg-wk-bg-surface-hover rounded animate-pulse" />
          </div>
        </section>
        <section className="container mx-auto px-4 py-4 md:py-6">
          <RecipeGridSkeleton count={8} />
        </section>
      </div>
    )
  }

  // This should rarely be seen since we redirect above, but just in case
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary">Redirecting to sign in...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-wk-bg-primary text-wk-text-primary">
      {/* Navigation */}
      <Navigation currentPath="/cookbooks" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 md:py-10 text-center">
        <div className="max-w-2xl mx-auto p-6 md:p-8 rounded-xl bg-wk-bg-surface shadow-wk">
          <h1 className="text-h1 text-wk-text-primary mb-2 font-display">Cookbook</h1>
          <p className="text-wk-text-secondary font-body mb-6">
            Extract recipes from any website and organize them here
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Paste a recipe URL here..."
              className="bg-wk-bg-surface border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isExtracting}
            />
            <Button 
              variant="default"
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wk-text-secondary h-5 w-5" />
            <Input
              type="text"
              placeholder="Search recipes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-wk-bg-surface border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary placeholder:text-wk-text-secondary"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-wk-bg-surface border border-wk-border rounded-md hover:bg-wk-bg-surface-hover transition-colors text-wk-text-primary"
            >
              <Filter className="h-5 w-5" />
              <span className="capitalize">{filterOption}</span>
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-wk-bg-surface rounded-md shadow-wk z-10 border border-wk-border">
                <button
                  onClick={() => { setFilterOption('recent'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-wk-bg-surface-hover transition-colors text-wk-text-primary"
                >
                  Most Recent
                </button>
                <button
                  onClick={() => { setFilterOption('oldest'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-wk-bg-surface-hover transition-colors text-wk-text-primary"
                >
                  Oldest
                </button>
                <button
                  onClick={() => { setFilterOption('alphabetical'); setShowFilterMenu(false); }}
                  className="block w-full text-left px-4 py-2 hover:bg-wk-bg-surface-hover transition-colors text-wk-text-primary"
                >
                  Alphabetical
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Show skeleton while loading initial data */}
        {isLoadingRecipes && recipes.length === 0 ? (
          <RecipeGridSkeleton count={8} />
        ) : (
          <>
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
            
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            
            {/* Loading indicator for next page */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-wk-accent" />
              </div>
            )}
          </>
        )}
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
          // Refetch recipes to get updated data from server
          refetchRecipes()
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