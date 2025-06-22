'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/db/supabase'
import { useUnitPreference, formatMeasurement } from '../../hooks/useUnitPreference'
import { Filter, Plus, ChevronDown, Edit3, Trash2, Settings, ShoppingCart, Copy, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
  GroceryList, 
  GroceryItem, 
  getGroceryLists, 
  createGroceryList, 
  updateGroceryList,
  deleteGroceryList,
  toggleGroceryItem,
  sortGroceryItems,
  getCategoryDisplayName,
  updateGroceryItem,
  deleteGroceryItem,
  addRecipeToGroceryList,
  removeRecipeFromGroceryList,
} from '../../lib/db/grocery'
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'
import BuyGroceriesModal from '../../components/features/grocery/BuyGroceriesModal'
import RecipeDetailModal from '../../components/features/recipe/RecipeDetailModal'

// Recipe interface for local use
interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnail?: string;
  ingredients: string[];
  instructions: string[];
  platform: string;
  source: string;
  original_url?: string;
  created_at: string;
  saved_id?: string;
  normalized_ingredients?: any[]; // AI-normalized ingredient data
}

// Condensed grocery item for ingredient grouping
interface CondensedGroceryItem {
  id: string; // Combined ID for the condensed item
  sort_name: string; // The ingredient name (e.g., "Chuck Roast")
  category: GroceryItem['category'];
  checked: boolean;
  isCondensed: true;
  originalItems: GroceryItem[]; // All the original items that were condensed
  quantities: string[]; // Array of formatted quantities (e.g., ["4 lbs", "2 lbs"])
}

export default function GroceryLists() {
  const { user, signOut, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const unitPreference = useUnitPreference()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Data state
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([])
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null)

  // UI state
  const [sortBy, setSortBy] = useState<'aisle' | 'recipe'>('aisle')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([])
  const [newListName, setNewListName] = useState('')

  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editName, setEditName] = useState('')
  const [quantityError, setQuantityError] = useState('')
  const [showEditVisualModal, setShowEditVisualModal] = useState(false)
  const [editingVisualList, setEditingVisualList] = useState<GroceryList | null>(null)
  const [gradientFrom, setGradientFrom] = useState('#667eea')
  const [gradientTo, setGradientTo] = useState('#764ba2')
  const [editListName, setEditListName] = useState('')
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false)
  const [recipesCollapsed, setRecipesCollapsed] = useState(false)
  const [showBuyGroceriesModal, setShowBuyGroceriesModal] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [priceComparison, setPriceComparison] = useState<any>(null)
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false)
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<Recipe | null>(null)



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
      loadGroceryLists()
    }
  }, [isClient, loading, user, router])

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSortMenu(false)
    if (showSortMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSortMenu])

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
          thumbnail: recipe.thumbnail,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          platform: recipe.platform || '',
          source: recipe.source || '',
          original_url: recipe.original_url,
          created_at: recipe.created_at,
          saved_id: recipe.id,
          normalized_ingredients: recipe.normalized_ingredients || []
        }))
        setRecipes(formattedRecipes)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    }
  }

  const loadGroceryLists = async () => {
    try {
      console.log('Loading grocery lists...')
      const lists = await getGroceryLists()
      console.log('Loaded grocery lists:', lists)
      setGroceryLists(lists)
      if (lists.length > 0 && !selectedList) {
        setSelectedList(lists[0])
      }
    } catch (error) {
      console.error('Error loading grocery lists:', error)
      // Don't redirect on error, just show empty state
    }
  }

  const handleCreateList = async () => {
    if (newListName && selectedRecipes.length > 0) {
      const newList = await createGroceryList(newListName, selectedRecipes)
      if (newList) {
        setGroceryLists(prev => [...prev, newList])
        setSelectedList(newList)
        setShowCreateModal(false)
        setNewListName('')
        setSelectedRecipes([])
      }
    }
  }

  const handleDeleteList = async (listId: string) => {
    const success = await deleteGroceryList(listId)
    if (success) {
      setGroceryLists(prev => prev.filter(list => list.id !== listId))
      if (selectedList?.id === listId) {
        const remaining = groceryLists.filter(list => list.id !== listId)
        setSelectedList(remaining.length > 0 ? remaining[0] : null)
      }
    }
  }

  const handleToggleItem = async (itemId: string) => {
    if (selectedList) {
      const success = await toggleGroceryItem(selectedList.id, itemId)
      if (success) {
        setSelectedList(prev => {
          if (!prev) return null
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            )
          }
        })
      }
    }
  }

  const handleToggleCondensedItem = async (condensedItem: CondensedGroceryItem) => {
    if (selectedList) {
      // Toggle all original items in the condensed group
      const newCheckedState = !condensedItem.checked

      for (const originalItem of condensedItem.originalItems) {
        const success = await toggleGroceryItem(selectedList.id, originalItem.id)
        if (!success) {
          console.error('Failed to toggle item:', originalItem.id)
          return
        }
      }

      // Update the local state
      setSelectedList(prev => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items.map(item => {
            const isInGroup = condensedItem.originalItems.some(origItem => origItem.id === item.id)
            return isInGroup ? { ...item, checked: newCheckedState } : item
          })
        }
      })
    }
  }


  // Validate quantity format
  const validateQuantity = (quantity: string): { isValid: boolean; error: string; min?: number; max?: number } => {
    if (!quantity.trim()) {
      return { isValid: false, error: 'Quantity is required' }
    }

    // Remove extra spaces
    const cleanQuantity = quantity.trim()

    // Check for range formats: "4-5" or "4 to 5"
    if (cleanQuantity.includes('-')) {
      const parts = cleanQuantity.split('-').map(p => p.trim())
      if (parts.length !== 2) {
        return { isValid: false, error: 'Range format should be "4-5"' }
      }

      const min = parseFloat(parts[0])
      const max = parseFloat(parts[1])

      if (isNaN(min) || isNaN(max)) {
        return { isValid: false, error: 'Range values must be numbers (e.g., "4-5")' }
      }

      if (min <= 0 || max <= 0) {
        return { isValid: false, error: 'Quantities must be positive numbers' }
      }

      if (min >= max) {
        return { isValid: false, error: 'First number must be less than second (e.g., "4-5")' }
      }

      return { isValid: true, error: '', min, max }
    }

    // Check for "X to Y" format
    if (cleanQuantity.toLowerCase().includes(' to ')) {
      const parts = cleanQuantity.toLowerCase().split(' to ').map(p => p.trim())
      if (parts.length !== 2) {
        return { isValid: false, error: 'Range format should be "4 to 5"' }
      }

      const min = parseFloat(parts[0])
      const max = parseFloat(parts[1])

      if (isNaN(min) || isNaN(max)) {
        return { isValid: false, error: 'Range values must be numbers (e.g., "4 to 5")' }
      }

      if (min <= 0 || max <= 0) {
        return { isValid: false, error: 'Quantities must be positive numbers' }
      }

      if (min >= max) {
        return { isValid: false, error: 'First number must be less than second (e.g., "4 to 5")' }
      }

      return { isValid: true, error: '', min, max }
    }

    // Single number
    const singleValue = parseFloat(cleanQuantity)
    if (isNaN(singleValue)) {
      return { isValid: false, error: 'Enter a number (e.g., "4") or range (e.g., "4-5" or "4 to 5")' }
    }

    if (singleValue <= 0) {
      return { isValid: false, error: 'Quantity must be a positive number' }
    }

    return { isValid: true, error: '', min: singleValue, max: singleValue }
  }

  const handleStartEdit = (item: GroceryItem) => {
    setEditingItem(item.id)
    setQuantityError('') // Clear any previous errors

    // Handle ranges properly - if min and max are different, show as range
    const hasRange = item.original_quantity_max && item.original_quantity_min !== item.original_quantity_max
    if (hasRange) {
      setEditQuantity(`${item.original_quantity_min}-${item.original_quantity_max}`)
    } else {
      setEditQuantity((item.original_quantity_min || 1).toString())
    }

    setEditUnit(item.original_unit || '')
    setEditName(item.sort_name)
  }

  const handleSaveEdit = async () => {
    if (selectedList && editingItem) {
      // Validate quantity format
      const validation = validateQuantity(editQuantity)

      if (!validation.isValid) {
        setQuantityError(validation.error)
        return // Don't save if validation fails
      }

      // Clear error if validation passes
      setQuantityError('')

      const quantityMin = validation.min!
      const quantityMax = validation.max!

      const success = await updateGroceryItem(selectedList.id, editingItem, {
        original_quantity_min: quantityMin,
        original_quantity_max: quantityMax,
        original_unit: editUnit || undefined,
        name: editName
      })

      if (success) {
        setSelectedList(prev => {
          if (!prev) return null
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === editingItem
                ? { ...item, original_quantity_min: quantityMin, original_quantity_max: quantityMax, original_unit: editUnit || undefined, name: editName }
                : item
            )
          }
        })

        setEditingItem(null)
        setEditQuantity('')
        setEditUnit('')
        setEditName('')
        setQuantityError('')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditQuantity('')
    setEditUnit('')
    setEditName('')
    setQuantityError('')
  }

  // Real-time validation as user types
  const handleQuantityChange = (value: string) => {
    setEditQuantity(value)

    // Clear error when user starts typing
    if (quantityError && value.trim()) {
      setQuantityError('')
    }
  }

  const handleEditVisual = (list: GroceryList) => {
    setEditingVisualList(list)
    setGradientFrom(list.visual?.gradient?.from || '#667eea')
    setGradientTo(list.visual?.gradient?.to || '#764ba2')
    setEditListName(list.name)
    setShowEditVisualModal(true)
  }

  const handleSaveVisual = async () => {
    if (editingVisualList) {
      const newVisual: GroceryList['visual'] = {
        type: 'gradient',
        gradient: { from: gradientFrom, to: gradientTo }
      }

      const updatedList = { ...editingVisualList, visual: newVisual, name: editListName }
      const success = await updateGroceryList(updatedList)

      if (success) {
        setGroceryLists(prev => prev.map(list =>
          list.id === editingVisualList.id ? updatedList : list
        ))

        if (selectedList?.id === editingVisualList.id) {
          setSelectedList(updatedList)
        }

        setShowEditVisualModal(false)
        setEditingVisualList(null)
      }
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (selectedList) {
      const success = await deleteGroceryItem(selectedList.id, itemId)
      if (success) {
        setSelectedList(prev => {
          if (!prev) return null
          return {
            ...prev,
            items: prev.items.filter(item => item.id !== itemId)
          }
        })
      }
    }
  }





  const getFilteredRecipes = () => {
    if (!selectedList) return []
    return recipes.filter(recipe => selectedList.recipeIds.includes(recipe.id))
  }

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId)
    return recipe?.title || `Recipe ${recipeId.slice(0, 8)}`
  }

  const handleAddRecipeToList = async (recipe: Recipe) => {
    if (!selectedList) return
    
    console.log('Adding recipe to list:', recipe.title, 'to list:', selectedList.name)
    const success = await addRecipeToGroceryList(selectedList.id, recipe)
    console.log('Add recipe result:', success)
    if (success) {
      // Reload to get updated items from database
      await loadGroceryLists()
      
      // Update selectedList to reflect the changes
      const updatedLists = await getGroceryLists()
      const updatedList = updatedLists.find(list => list.id === selectedList.id)
      if (updatedList) {
        setSelectedList(updatedList)
        setGroceryLists(updatedLists)
      }
      
      setShowAddRecipeModal(false)
    } else {
      console.error('Failed to add recipe to list')
    }
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipeForDetail(recipe)
    setShowRecipeDetailModal(true)
  }

  const handleRemoveRecipeFromList = async (recipeId: string) => {
    if (!selectedList) return
    
    console.log('Removing recipe from list:', recipeId, 'from list:', selectedList.name)
    const success = await removeRecipeFromGroceryList(selectedList.id, recipeId)
    console.log('Remove recipe result:', success)
    if (success) {
      // Reload to get updated items and recipes from database
      await loadGroceryLists()
      
      // Update selectedList to reflect the changes
      const updatedLists = await getGroceryLists()
      const updatedList = updatedLists.find(list => list.id === selectedList.id)
      if (updatedList) {
        setSelectedList(updatedList)
        setGroceryLists(updatedLists)
      }
    } else {
      console.error('Failed to remove recipe from list')
    }
  }


  const getSortedItems = () => {
    if (!selectedList) return []

    // Use the regular items for all sorting methods in database version
    return sortGroceryItems(selectedList.items, sortBy)
  }

  // Condense ingredients with the same sort_name
  const condenseIngredients = (items: GroceryItem[]): (GroceryItem | CondensedGroceryItem)[] => {
    const grouped: { [sortName: string]: GroceryItem[] } = {}

    // Group items by sort_name (ingredient name)
    items.forEach(item => {
      const key = item.sort_name.toLowerCase()
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(item)
    })

    // Convert groups to condensed items or return single items
    return Object.values(grouped).map(group => {
      if (group.length === 1) {
        return group[0] // Return single item as-is
      }

      // Create condensed item for multiple ingredients with same sort_name
      const firstItem = group[0]
      const quantities = group.map(item =>
        formatMeasurement(
          item.original_quantity_min,
          item.original_quantity_max,
          item.original_unit,
          item.metric_quantity_min,
          item.metric_quantity_max,
          item.metric_unit,
          item.imperial_quantity_min,
          item.imperial_quantity_max,
          item.imperial_unit,
          unitPreference
        )
      )

      const condensedItem: CondensedGroceryItem = {
        id: `condensed-${firstItem.sort_name.toLowerCase().replace(/\s+/g, '-')}`,
        sort_name: firstItem.sort_name,
        category: firstItem.category,
        checked: group.every(item => item.checked), // All must be checked for condensed to be checked
        isCondensed: true,
        originalItems: group,
        quantities: quantities
      }

      return condensedItem
    })
  }

  const getGroupedItems = () => {
    const sortedItems = getSortedItems()

    if (sortBy === 'aisle') {
      const grouped: { [category: string]: (GroceryItem | CondensedGroceryItem)[] } = {}
      const unchecked = sortedItems.filter(item => !item.checked)
      const checked = sortedItems.filter(item => item.checked)

      // Group unchecked items by category, then condense by sort_name
      unchecked.forEach(item => {
        const category = getCategoryDisplayName(item.category)
        if (!grouped[category]) grouped[category] = []
      })

      // For each category, condense ingredients with same sort_name
      Object.keys(grouped).forEach(category => {
        const categoryItems = unchecked.filter(item => getCategoryDisplayName(item.category) === category)
        const condensedItems = condenseIngredients(categoryItems)
        grouped[category] = condensedItems
      })

      if (checked.length > 0) {
        grouped['Completed'] = checked
      }

      return grouped
    } else if (sortBy === 'recipe') {
      const grouped: { [recipe: string]: GroceryItem[] } = {}
      const unchecked = sortedItems.filter(item => !item.checked)
      const checked = sortedItems.filter(item => item.checked)

      unchecked.forEach(item => {
        const recipeName = getRecipeName(item.recipeId)
        if (!grouped[recipeName]) grouped[recipeName] = []
        grouped[recipeName].push(item)
      })

      if (checked.length > 0) {
        grouped['Completed'] = checked
      }

      return grouped
    }

    return { 'All Items': sortedItems }
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
          <button onClick={() => router.push('/meal-planner')} className="text-white/80 hover:text-white transition-colors">
            Meal Planner
          </button>
          <button onClick={() => router.push('/grocery-list')} className="text-white hover:text-white transition-colors">
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
        {/* Left Sidebar - Grocery Lists */}
        <div className="w-72 bg-[#1e1f26] border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Your Lists</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[#FF3A25] hover:text-[#FF3A25]/80 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Grocery Lists */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {groceryLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedList(list)}
                  className={`rounded-lg p-4 cursor-pointer transition-all overflow-hidden relative ${
                    selectedList?.id === list.id ? 'ring-2 ring-[#FF3A25]' : 'hover:opacity-90'
                  }`}
                  style={{
                    background: list.visual?.type === 'gradient' && list.visual.gradient
                      ? `linear-gradient(135deg, ${list.visual.gradient.from}, ${list.visual.gradient.to})`
                      : `linear-gradient(135deg, #667eea, #764ba2)`
                  }}
                >
                  {/* Semi-transparent overlay for better text readability */}
                  <div className="absolute inset-0 bg-black/40 rounded-lg"></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white text-base line-clamp-1 drop-shadow-lg tracking-wide">
                        {list.name}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditVisual(list)
                          }}
                          className="text-white hover:text-gray-200 transition-colors drop-shadow-lg"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteList(list.id)
                          }}
                          className="text-white hover:text-gray-200 transition-colors drop-shadow-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white text-sm drop-shadow-lg font-medium tracking-wide">
                      {list.items.length} items • {list.recipeIds.length} recipes
                    </p>
                  </div>
                </div>
              ))}
              
              {groceryLists.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-white/60 text-sm">No grocery lists yet. Create your first one!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedList ? (
            <>
              {/* Top Section - Recipes in List */}
              <div className="p-4 border-b border-white/10 bg-[#1e1f26]/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Recipes</h3>
                  <button 
                    onClick={() => setRecipesCollapsed(!recipesCollapsed)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${recipesCollapsed ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {!recipesCollapsed && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {getFilteredRecipes().map((recipe) => (
                      <div key={recipe.id} className="flex-shrink-0 bg-[#14151a] rounded-lg overflow-hidden w-32 h-36 flex flex-col">
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemoveRecipeFromList(recipe.id)
                            }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-600/80 rounded-full flex items-center justify-center text-white text-xs transition-colors"
                          >
                            ✕
                          </button>
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-20 object-cover"
                            />
                          ) : (
                            <div className="w-full h-20 bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-600 text-lg">🍽️</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <h4 className="text-xs font-medium text-white line-clamp-2 h-8 overflow-hidden">{recipe.title}</h4>
                          <button 
                            onClick={() => handleViewRecipe(recipe)}
                            className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer text-left"
                          >
                            View recipe →
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Recipe Button */}
                    <div className="flex-shrink-0 bg-[#14151a] border-2 border-dashed border-white/20 rounded-lg overflow-hidden w-32 h-36 hover:border-[#2B966F] hover:bg-[#2B966F]/10 transition-all">
                      <button
                        onClick={() => setShowAddRecipeModal(true)}
                        className="w-full h-full text-white/60 hover:text-white flex items-center justify-center"
                      >
                        <Plus className="h-8 w-8" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Ingredients Section */}
              <div className="flex-1 overflow-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setShowBuyGroceriesModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2B966F] hover:bg-[#2B966F]/90 text-white rounded-md transition-colors text-sm font-medium"
                      disabled={!selectedList || selectedList.items.filter(item => !item.checked).length === 0}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Buy Groceries
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSortMenu(!showSortMenu)
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-[#1e1f26] rounded-md hover:bg-[#1e1f26]/80 transition-colors text-sm"
                        >
                          <Filter className="h-4 w-4" />
                          Sort by {sortBy === 'aisle' ? 'Aisle' : 'Recipe'}
                        </button>
                        {showSortMenu && (
                          <div className="absolute right-0 mt-2 w-40 bg-[#1e1f26] rounded-md shadow-lg z-10 border border-white/10">
                            <button
                              onClick={() => { setSortBy('aisle'); setShowSortMenu(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
                            >
                              By Aisle
                            </button>
                            <button
                              onClick={() => { setSortBy('recipe'); setShowSortMenu(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
                            >
                              By Recipe
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grouped Ingredients */}
                  <div className="space-y-6">
                    {Object.entries(getGroupedItems()).map(([groupName, items]) => (
                      <div key={groupName}>
                        {(sortBy === 'aisle' || sortBy === 'recipe') && (
                          <h3 className="text-lg font-semibold mb-3 text-white/90">{groupName}</h3>
                        )}
                        <div className="space-y-2">
                          {items.map((item) => {
                            // Check if this is a condensed item
                            const isCondensed = 'isCondensed' in item && item.isCondensed

                            if (isCondensed) {
                              const condensedItem = item as CondensedGroceryItem

                              // Check if the condensed group is in editing mode
                              const hasEditingItem = condensedItem.originalItems.some(origItem => editingItem === origItem.id)

                              if (hasEditingItem) {
                                // Show all items as edit forms when condensed group is being edited
                                return (
                                  <div key={condensedItem.id} className="space-y-2">
                                    {condensedItem.originalItems.map((origItem, index) => {
                                      // Get the current values for this specific item
                                      const isCurrentlyEditing = editingItem === origItem.id
                                      const currentQuantity = isCurrentlyEditing ? editQuantity :
                                        (origItem.original_quantity_max && origItem.original_quantity_min !== origItem.original_quantity_max)
                                          ? `${origItem.original_quantity_min}-${origItem.original_quantity_max}`
                                          : origItem.original_quantity_min.toString()
                                      const currentUnit = isCurrentlyEditing ? editUnit : (origItem.original_unit || '')
                                      const currentName = isCurrentlyEditing ? editName : origItem.sort_name

                                      return (
                                        <div
                                          key={origItem.id}
                                          className="flex items-center gap-3 p-3 bg-[#1e1f26] rounded-lg"
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <div className="flex flex-col">
                                              <Input
                                                type="text"
                                                value={currentQuantity}
                                                onChange={(e) => {
                                                  if (isCurrentlyEditing) {
                                                    handleQuantityChange(e.target.value)
                                                  } else {
                                                    // Start editing this item
                                                    handleStartEdit(origItem)
                                                    // The value will be set by handleStartEdit
                                                  }
                                                }}
                                                onFocus={() => {
                                                  if (!isCurrentlyEditing) {
                                                    handleStartEdit(origItem)
                                                  }
                                                }}
                                                className={`w-20 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm ${
                                                  isCurrentlyEditing && quantityError ? 'ring-1 ring-red-500' : ''
                                                }`}
                                                placeholder="4 or 4-5"
                                              />
                                              {isCurrentlyEditing && quantityError && (
                                                <span className="text-red-400 text-xs mt-1 w-20">{quantityError}</span>
                                              )}
                                            </div>
                                            <Input
                                              type="text"
                                              value={currentUnit}
                                              onChange={(e) => {
                                                if (isCurrentlyEditing) {
                                                  setEditUnit(e.target.value)
                                                } else {
                                                  handleStartEdit(origItem)
                                                }
                                              }}
                                              onFocus={() => {
                                                if (!isCurrentlyEditing) {
                                                  handleStartEdit(origItem)
                                                }
                                              }}
                                              className="w-24 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm"
                                              placeholder="Unit"
                                            />
                                            <Input
                                              type="text"
                                              value={currentName}
                                              onChange={(e) => {
                                                if (isCurrentlyEditing) {
                                                  setEditName(e.target.value)
                                                } else {
                                                  handleStartEdit(origItem)
                                                }
                                              }}
                                              onFocus={() => {
                                                if (!isCurrentlyEditing) {
                                                  handleStartEdit(origItem)
                                                }
                                              }}
                                              className="flex-1 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm"
                                              placeholder="Item name"
                                            />
                                            {index === 0 && (
                                              <>
                                                <button
                                                  onClick={handleSaveEdit}
                                                  disabled={isCurrentlyEditing && (!!quantityError || !editQuantity.trim())}
                                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={handleCancelEdit}
                                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                              </>
                                            )}
                                            {index > 0 && (
                                              <button
                                                onClick={() => handleDeleteItem(origItem.id)}
                                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                                              >
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              }

                              // Show condensed view when not editing
                              return (
                                <div
                                  key={condensedItem.id}
                                  className={`flex items-center gap-3 p-3 bg-[#1e1f26] rounded-lg hover:bg-[#1e1f26]/80 transition-colors ${
                                    condensedItem.checked ? 'opacity-60' : ''
                                  }`}
                                >
                                  <button
                                    onClick={() => handleToggleCondensedItem(condensedItem)}
                                    className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center flex-shrink-0"
                                  >
                                    {condensedItem.checked && <span className="text-[#2B966F] text-sm">✓</span>}
                                  </button>
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="text-sm font-medium flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <div className={condensedItem.checked ? 'line-through text-white/60' : 'text-white text-base font-semibold'}>
                                            {condensedItem.sort_name}
                                          </div>
                                          <div className="text-sm text-white/70 mt-1">
                                            {condensedItem.quantities.join(' + ')}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {!condensedItem.checked && (
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        onClick={() => handleStartEdit(condensedItem.originalItems[0])}
                                        className="p-2 text-white/40 hover:text-[#2B966F] hover:bg-[#2B966F]/10 rounded transition-all"
                                      >
                                        <Edit3 className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          // Delete all original items in the condensed group
                                          condensedItem.originalItems.forEach(item => handleDeleteItem(item.id))
                                        }}
                                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            } else {
                              // Regular item rendering
                              const regularItem = item as GroceryItem
                              return (
                                <div
                                  key={regularItem.id}
                                  className={`flex items-center gap-3 p-3 bg-[#1e1f26] rounded-lg hover:bg-[#1e1f26]/80 transition-colors ${
                                    regularItem.checked ? 'opacity-60' : ''
                                  }`}
                                >
                                  <button
                                    onClick={() => handleToggleItem(regularItem.id)}
                                    className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center flex-shrink-0"
                                  >
                                    {regularItem.checked && <span className="text-[#2B966F] text-sm">✓</span>}
                                  </button>
                                  <div className="flex items-center gap-2 flex-1">
                                    {editingItem === regularItem.id ? (
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-col">
                                            <Input
                                              type="text"
                                              value={editQuantity}
                                              onChange={(e) => handleQuantityChange(e.target.value)}
                                              className={`w-16 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm ${
                                                quantityError ? 'ring-1 ring-red-500' : ''
                                              }`}
                                              placeholder="4 or 4-5"
                                            />
                                            {quantityError && (
                                              <span className="text-red-400 text-xs mt-1 w-16">{quantityError}</span>
                                            )}
                                          </div>
                                          <Input
                                            type="text"
                                            value={editUnit}
                                            onChange={(e) => setEditUnit(e.target.value)}
                                            className="w-20 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm"
                                            placeholder="Unit"
                                          />
                                          <Input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm"
                                            placeholder="Item name"
                                          />
                                          <button
                                            onClick={handleSaveEdit}
                                            disabled={!!quantityError || !editQuantity.trim()}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm font-medium flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1">
                                            <div className={regularItem.checked ? 'line-through text-white/60' : 'text-white text-base font-semibold'}>
                                              {regularItem.sort_name}
                                            </div>
                                            <div className="text-sm text-white/70 mt-1">
                                              {formatMeasurement(
                                                regularItem.original_quantity_min,
                                                regularItem.original_quantity_max,
                                                regularItem.original_unit,
                                                regularItem.metric_quantity_min,
                                                regularItem.metric_quantity_max,
                                                regularItem.metric_unit,
                                                regularItem.imperial_quantity_min,
                                                regularItem.imperial_quantity_max,
                                                regularItem.imperial_unit,
                                                unitPreference
                                              )}
                                            </div>
                                          </div>
                                          {!regularItem.checked && (
                                            <div className="flex items-center gap-1 ml-auto">
                                              <button
                                                onClick={() => handleStartEdit(regularItem)}
                                                className="p-2 text-white/40 hover:text-[#2B966F] hover:bg-[#2B966F]/10 rounded transition-all"
                                              >
                                                <Edit3 className="h-5 w-5" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteItem(regularItem.id)}
                                                className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                              >
                                                <Trash2 className="h-5 w-5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            }
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">No Grocery List Selected</h2>
                <p className="text-white/60 mb-4">Create or select a grocery list to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 text-white font-medium rounded-full transition-colors"
                >
                  Create Grocery List
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Service Modal - Temporarily disabled for database migration */}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-[#1e1f26] border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Create Grocery List</h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false)
                  setNewListName('')
                  setSelectedRecipes([])
                }}
                className="text-[#FF3A25] font-medium text-lg"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">List Name</label>
                <Input
                  type="text"
                  placeholder="Enter list name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">Select Recipes</label>
                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg p-2">
                  {recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => {
                        if (selectedRecipes.find(r => r.id === recipe.id)) {
                          setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id))
                        } else {
                          setSelectedRecipes(prev => [...prev, recipe])
                        }
                      }}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        selectedRecipes.find(r => r.id === recipe.id) 
                          ? 'bg-[#FF3A25]/20 border border-[#FF3A25]/50' 
                          : 'hover:bg-[#14151a]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <span className="text-gray-600 text-sm">🍽️</span>
                          )}
                        </div>
                        <span className="text-sm text-white">{recipe.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleCreateList}
                disabled={!newListName || selectedRecipes.length === 0}
                className="w-full px-4 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Add Recipe Modal */}
      {showAddRecipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1f26] rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Add Recipe to List</h2>
              <button 
                onClick={() => setShowAddRecipeModal(false)}
                className="text-[#FF3A25] font-medium text-lg"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Available Recipes</label>
                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg p-2">
                  {recipes
                    .filter(recipe => !selectedList?.recipeIds.includes(recipe.id))
                    .map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => handleAddRecipeToList(recipe)}
                      className="p-2 rounded cursor-pointer transition-colors hover:bg-[#14151a]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <span className="text-gray-600 text-sm">🍽️</span>
                          )}
                        </div>
                        <span className="text-white text-sm">{recipe.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {recipes.filter(recipe => !selectedList?.recipeIds.includes(recipe.id)).length === 0 && (
                    <div className="text-center text-white/60 py-4">
                      All recipes are already in this list
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Groceries Modal */}
      <BuyGroceriesModal
        isOpen={showBuyGroceriesModal}
        onClose={() => setShowBuyGroceriesModal(false)}
        items={selectedList?.items || []}
        groceryListTitle={selectedList?.name}
        groceryListId={selectedList?.id}
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        isOpen={showRecipeDetailModal}
        onClose={() => setShowRecipeDetailModal(false)}
        recipe={selectedRecipeForDetail}
        showActionButtons={false}
      />

      {/* Edit List Modal */}
      {showEditVisualModal && editingVisualList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-[#1e1f26] border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Edit Grocery List</h2>
              <button
                onClick={() => {
                  setShowEditVisualModal(false)
                  setEditingVisualList(null)
                }}
                className="text-[#FF3A25] font-medium text-lg"
              >
                Cancel
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">List Name</label>
                <Input
                  type="text"
                  placeholder="Enter list name..."
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  className="bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">Gradient Colors</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-white/70 mb-1">From</label>
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="w-full h-10 rounded border-none bg-[#14151a] cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-white/70 mb-1">To</label>
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="w-full h-10 rounded border-none bg-[#14151a] cursor-pointer"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <div
                    className="w-full h-8 rounded"
                    style={{background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`}}
                  ></div>
                </div>
              </div>

              <button
                onClick={handleSaveVisual}
                disabled={!editListName.trim()}
                className="w-full px-4 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
