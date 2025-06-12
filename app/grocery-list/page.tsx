'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Filter, Plus, ChevronDown, Edit3, Trash2, Settings } from "lucide-react"
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
} from '../../lib/groceryStorageDB'

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
}

export default function GroceryLists() {
  const { user, signOut, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  // Data state
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([])
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null)

  // UI state
  const [sortBy, setSortBy] = useState<'aisle' | 'alphabetical' | 'recipe'>('aisle')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([])
  const [newListName, setNewListName] = useState('')
  const [showEditVisualModal, setShowEditVisualModal] = useState(false)
  const [editingVisualList, setEditingVisualList] = useState<GroceryList | null>(null)
  const [newVisualType, setNewVisualType] = useState<'gradient' | 'emoji' | 'image'>('gradient')
  const [newEmoji, setNewEmoji] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [editListName, setEditListName] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editName, setEditName] = useState('')

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
          saved_id: recipe.id
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


  const handleStartEdit = (item: GroceryItem) => {
    setEditingItem(item.id)
    setEditQuantity(item.original_quantity.toString())
    setEditUnit(item.original_unit || '')
    setEditName(item.name)
  }

  const handleSaveEdit = async () => {
    if (selectedList && editingItem) {
      const success = await updateGroceryItem(selectedList.id, editingItem, {
        original_quantity: parseFloat(editQuantity) || 1,
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
                ? { ...item, original_quantity: parseFloat(editQuantity) || 1, original_unit: editUnit || undefined, name: editName }
                : item
            )
          }
        })
        
        setEditingItem(null)
        setEditQuantity('')
        setEditUnit('')
        setEditName('')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditQuantity('')
    setEditUnit('')
    setEditName('')
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

  const handleEditVisual = (list: GroceryList) => {
    setEditingVisualList(list)
    setNewVisualType(list.visual?.type || 'gradient')
    setNewEmoji(list.visual?.emoji || '🛒')
    setNewImageUrl(list.visual?.imageUrl || '')
    setEditListName(list.name)
    setShowEditVisualModal(true)
  }

  const handleSaveVisual = async () => {
    if (editingVisualList) {
      let newVisual: GroceryList['visual']
      
      if (newVisualType === 'gradient') {
        // Generate a new random gradient
        const gradients = [
          { from: '#667eea', to: '#764ba2' }, { from: '#f093fb', to: '#f5576c' }, { from: '#4facfe', to: '#00f2fe' },
          { from: '#43e97b', to: '#38f9d7' }, { from: '#fa709a', to: '#fee140' }, { from: '#30cfd0', to: '#330867' }
        ]
        const randomGradient = gradients[Math.floor(Math.random() * gradients.length)]
        newVisual = { type: 'gradient', gradient: randomGradient }
      } else if (newVisualType === 'emoji') {
        newVisual = { type: 'emoji', emoji: newEmoji }
      } else {
        newVisual = { type: 'image', imageUrl: newImageUrl }
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

  const getFilteredRecipes = () => {
    if (!selectedList) return []
    return recipes.filter(recipe => selectedList.recipeIds.includes(recipe.id))
  }

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId)
    return recipe?.title || `Recipe ${recipeId.slice(0, 8)}`
  }

  const getDisplayMeasurement = (item: GroceryItem) => {
    // For database version, return the original quantity and unit
    return `${item.original_quantity} ${item.original_unit || ''}`
  }

  const getSortedItems = () => {
    if (!selectedList) return []
    
    // Use the regular items for all sorting methods in database version
    return sortGroceryItems(selectedList.items, sortBy)
  }

  const getGroupedItems = () => {
    const sortedItems = getSortedItems()
    
    if (sortBy === 'aisle') {
      const grouped: { [category: string]: GroceryItem[] } = {}
      const unchecked = sortedItems.filter(item => !item.checked)
      const checked = sortedItems.filter(item => item.checked)
      
      unchecked.forEach(item => {
        const category = getCategoryDisplayName(item.category)
        if (!grouped[category]) grouped[category] = []
        grouped[category].push(item)
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
          <a href="/cookbooks" className="text-white/80 hover:text-white transition-colors">
            Cookbooks
          </a>
          <a href="/meal-planner" className="text-white/80 hover:text-white transition-colors">
            Meal Planner
          </a>
          <a href="/grocery-list" className="text-white hover:text-white transition-colors">
            Grocery Lists
          </a>
          <a href="/discover" className="text-white/80 hover:text-white transition-colors">
            Discover
          </a>
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
                  className={`bg-[#14151a] rounded-lg p-3 cursor-pointer transition-all overflow-hidden ${
                    selectedList?.id === list.id ? 'ring-2 ring-[#FF3A25]' : 'hover:bg-[#14151a]/80'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Visual Element */}
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {list.visual?.type === 'gradient' && list.visual.gradient ? (
                        <div 
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${list.visual.gradient.from}, ${list.visual.gradient.to})`
                          }}
                        />
                      ) : list.visual?.type === 'emoji' && list.visual.emoji ? (
                        <span className="text-2xl">{list.visual.emoji}</span>
                      ) : list.visual?.type === 'image' && list.visual.imageUrl ? (
                        <img 
                          src={list.visual.imageUrl} 
                          alt={list.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, #667eea, #764ba2)`
                          }}
                        />
                      )}
                    </div>
                    
                    {/* List Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-white text-sm line-clamp-1">
                          {list.name}
                        </h3>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditVisual(list)
                            }}
                            className="text-white/40 hover:text-white transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteList(list.id)
                            }}
                            className="text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs">
                        {list.items.length} items • {list.recipeIds.length} recipes
                      </p>
                    </div>
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
                  <ChevronDown className="h-4 w-4 text-white/60" />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {getFilteredRecipes().map((recipe) => (
                    <div key={recipe.id} className="flex-shrink-0 bg-[#14151a] rounded-lg overflow-hidden w-32">
                      <div className="relative">
                        <button className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">
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
                      <div className="p-2">
                        <h4 className="text-xs font-medium text-white line-clamp-2">{recipe.title}</h4>
                        <p className="text-xs text-white/60 mt-1">View recipe →</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Ingredients Section */}
              <div className="flex-1 overflow-auto">
                <div className="p-4">
                  <div className="flex items-center justify-end mb-4">
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
                          Sort by {sortBy === 'aisle' ? 'Aisle' : sortBy === 'alphabetical' ? 'A-Z' : 'Recipe'}
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
                              onClick={() => { setSortBy('alphabetical'); setShowSortMenu(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm"
                            >
                              Alphabetical
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
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-[#1e1f26] rounded-lg hover:bg-[#1e1f26]/80 transition-colors ${
                                item.checked ? 'opacity-60' : ''
                              }`}
                            >
                              <button
                                onClick={() => handleToggleItem(item.id)}
                                className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center flex-shrink-0"
                              >
                                {item.checked && <span className="text-[#2B966F] text-sm">✓</span>}
                              </button>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                                {editingItem === item.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="text"
                                      value={editQuantity}
                                      onChange={(e) => setEditQuantity(e.target.value)}
                                      className="w-16 h-8 bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white text-sm"
                                      placeholder="Qty"
                                    />
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
                                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
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
                                ) : (
                                  <div className="text-sm font-medium flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={item.checked ? 'line-through text-white/60' : 'text-white'}>
                                        {getDisplayMeasurement(item)} {item.name}
                                      </span>
                                      {!item.checked && (
                                        <div className="flex items-center gap-1 ml-auto">
                                          <button
                                            onClick={() => handleStartEdit(item)}
                                            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded transition-all"
                                          >
                                            <Edit3 className="h-5 w-5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                          >
                                            <Trash2 className="h-5 w-5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {sortBy !== 'recipe' && (
                                      <div className="text-xs text-white/60 mt-1">{getRecipeName(item.recipeId)}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
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

      {/* Edit Visual Modal */}
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-3">Visual Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setNewVisualType('gradient')}
                    className={`p-3 rounded-lg border transition-colors ${
                      newVisualType === 'gradient' 
                        ? 'border-[#FF3A25] bg-[#FF3A25]/20' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="w-8 h-8 mx-auto mb-2 rounded" style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)'
                    }}></div>
                    <span className="text-xs text-white">Gradient</span>
                  </button>
                  <button
                    onClick={() => setNewVisualType('emoji')}
                    className={`p-3 rounded-lg border transition-colors ${
                      newVisualType === 'emoji' 
                        ? 'border-[#FF3A25] bg-[#FF3A25]/20' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center text-lg">
                      🛒
                    </div>
                    <span className="text-xs text-white">Emoji</span>
                  </button>
                  <button
                    onClick={() => setNewVisualType('image')}
                    className={`p-3 rounded-lg border transition-colors ${
                      newVisualType === 'image' 
                        ? 'border-[#FF3A25] bg-[#FF3A25]/20' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="w-8 h-8 mx-auto mb-2 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                      📷
                    </div>
                    <span className="text-xs text-white">Image</span>
                  </button>
                </div>
              </div>

              {newVisualType === 'emoji' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Choose Emoji</label>
                  <div className="grid grid-cols-6 gap-2 p-3 bg-[#14151a] rounded-lg">
                    {['🛒', '🍎', '🥕', '🥛', '🍞', '🧀', '🥩', '🐟', '🌽', '🍅', '🥬', '🍌', '🍊', '🥖', '🍝', '🍕', '🥗', '🍲'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewEmoji(emoji)}
                        className={`p-2 rounded text-xl hover:bg-white/10 transition-colors ${
                          newEmoji === emoji ? 'bg-[#FF3A25]/20 ring-1 ring-[#FF3A25]' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {newVisualType === 'image' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Image URL</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="bg-[#14151a] border-none focus-visible:ring-[#FF3A25] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">Preview</label>
                <div className="w-16 h-16 rounded-lg mx-auto flex items-center justify-center overflow-hidden">
                  {newVisualType === 'gradient' ? (
                    <div 
                      className="w-full h-full"
                      style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                    />
                  ) : newVisualType === 'emoji' ? (
                    <span className="text-3xl">{newEmoji}</span>
                  ) : newImageUrl ? (
                    <img 
                      src={newImageUrl} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400">
                      📷
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleSaveVisual}
                disabled={(newVisualType === 'image' && !newImageUrl) || !editListName.trim()}
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