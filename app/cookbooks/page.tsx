'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import PushNotificationPrompt from '../../components/PushNotificationPrompt'
import PasteUrlInput from '../../components/PasteUrlInput'
import CardGrid from '../../components/CardGrid'
import RecipeCard from '../../components/RecipeCard'
import RecipeDetailModal from '../../components/RecipeDetailModal'

export default function Cookbooks() {
  const { user, signOut, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const router = useRouter()

  // Recipe state management
  const [recipes, setRecipes] = useState<any[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIsClient(true)
  }, [])

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
          saved_id: recipe.id // Track the database ID
        }))

        // Preserve any existing processing cards when loading saved recipes
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
          original_url: originalUrl
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

  const handleUrlSubmit = async (url: string) => {
    console.log('Extracting recipe from URL:', url)
    setIsExtracting(true)

    // Add a processing card immediately for better UX
    const processingId = Date.now()
    setRecipes(prev => [...prev, {
      id: processingId,
      title: '',
      imageUrl: '',
      processing: true,
      ingredients: [],
      instructions: [],
      platform: '',
      source: '',
      thumbnail: ''
    }])

    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, mode: 'full' }), // Add mode parameter
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
          thumbnail: data.thumbnail || ''
        }

        // Auto-save the recipe to database
        console.log('Attempting to save recipe:', newRecipe.title)
        const savedId = await saveRecipe(newRecipe, url)
        console.log('Recipe save result:', savedId)
        
        // Replace the processing card with the actual recipe
        setRecipes(prev => 
          prev.map(recipe => 
            recipe.id === processingId 
              ? {
                  ...newRecipe,
                  saved_id: savedId // Track the database ID
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

  // Show loading until client-side hydration is complete
  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // This should rarely be seen since we redirect above, but just in case
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting to sign in...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 font-[family-name:var(--font-dancing-script)]">
              🍳 Remy
            </h1>
            <p className="text-gray-600 mt-2">Welcome back, {user.email?.split('@')[0]}!</p>
          </div>
          
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Main Content */}
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cookbooks</h2>
          <p className="text-gray-600 mb-8">Extract recipes from any website and organize them in your personal cookbooks</p>
          
          {/* Recipe URL Input */}
          <div className="mb-12">
            <PasteUrlInput onSubmit={handleUrlSubmit} isLoading={isExtracting} />
          </div>
          
          {/* Recipe Cards Grid */}
          <CardGrid>
            {recipes.map((recipe) => (
              <div key={recipe.id} onClick={() => handleRecipeClick(recipe)}>
                <RecipeCard
                  title={recipe.title}
                  imageUrl={recipe.imageUrl}
                  processing={recipe.processing}
                />
              </div>
            ))}
          </CardGrid>
        </div>
      </div>

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