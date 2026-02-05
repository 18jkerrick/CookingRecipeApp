'use client'

import { useAuth } from '../../context/AuthContext'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useUnitPreference, formatMeasurement } from '../../hooks/useUnitPreference'
import { Filter, Plus, ChevronDown, Edit3, Trash2, ShoppingCart, Share } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Navigation } from '../../components/shared/Navigation'
import NetflixCarousel from '../../components/features/grocery/NetflixCarousel'
import { useRecipes as useRecipesQuery } from '../../hooks/useRecipes'
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
} from '@acme/db/client'
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence'
import BuyGroceriesModal from '../../components/features/grocery/BuyGroceriesModal'
import RecipeDetailModal from '../../components/features/recipe/RecipeDetailModal'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import jsPDF from 'jspdf'

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

// Individual Card Image Component
const CardImage = ({ item, recipes, sortBy }: {
  item: GroceryItem | CondensedGroceryItem,
  recipes: Recipe[],
  sortBy: 'aisle' | 'recipe'
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (sortBy === 'aisle') {
    // Show recipe thumbnails (with carousel if multiple)
    const recipeIds = 'isCondensed' in item && item.isCondensed
      ? item.originalItems.map(origItem => origItem.recipeId)
      : [(item as GroceryItem).recipeId]

    const uniqueRecipeIds = Array.from(new Set(recipeIds))
    const recipeImages = uniqueRecipeIds
      .map(id => recipes.find(r => r.id === id))
      .filter(recipe => recipe?.imageUrl)
      .map(recipe => recipe!.imageUrl!)

    useEffect(() => {
      if (recipeImages.length > 1) {
        const interval = setInterval(() => {
          setCurrentImageIndex(prev => (prev + 1) % recipeImages.length)
        }, 3000)
        return () => clearInterval(interval)
      }
    }, [recipeImages.length])

    if (recipeImages.length === 0) {
    return (
      <div className="w-full h-full rounded-t-lg bg-wk-bg-surface-hover flex items-center justify-center">
        <span className="text-wk-text-muted text-2xl">🍽️</span>
      </div>
    )
    }

  return (
    <div className="w-full h-full rounded-t-lg overflow-hidden bg-wk-bg-surface-hover">
      <img
        src={recipeImages[currentImageIndex]}
        alt="Recipe"
        className="w-full h-full object-cover"
      />
    </div>
  )
  } else {
    // Show aisle category image
    const category = 'isCondensed' in item && item.isCondensed
      ? item.category
      : (item as GroceryItem).category

    const getCategoryImage = (category: GroceryItem['category']) => {
      const categoryMap: { [key: string]: string } = {
        'produce': '/produce.png',
        'bakery': '/bakery.png',
        'oils-vinegars': '/oils-vinegars.png',
        'dairy-eggs-fridge': '/Dairy-eggs-fridge.png',
        'herbs-spices': '/herbs-spices.png',
        'meat-seafood': '/meat-seafood.png',
        'frozen': '/frozen.png',
        'flours-sugars': '/flours-sugars.png',
        'pantry': '/pantry.png',
        'pastas-grains-legumes': '/pastas-grains-legumes.png',
        'uncategorized': '/uncategorized.png'
      }
      return categoryMap[category] || '/uncategorized.png'
    }

  return (
    <div className="w-full h-full rounded-t-lg overflow-hidden bg-wk-bg-surface-hover">
      <img
        src={getCategoryImage(category)}
        alt="Category"
        className="w-full h-full object-cover"
      />
    </div>
  )
  }
}



export default function GroceryLists() {
  const { user, signOut, loading, accessToken } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const unitPreference = useUnitPreference()
  
  // Save this page as the last visited
  useNavigationPersistence()

  // Use token directly from auth context
  const token = accessToken

  // Use React Query for recipes
  const { recipes: fetchedRecipes, isLoading: isLoadingRecipes } = useRecipesQuery(token, { enabled: !!user })

  // Convert fetched recipes to local format
  const recipes = useMemo(() => {
    return fetchedRecipes.map((recipe) => ({
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
  }, [fetchedRecipes])
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([])
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null)

  // UI state
  const [sortBy, setSortBy] = useState<'aisle' | 'recipe'>('aisle')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([])
  const [newListName, setNewListName] = useState('')

  const [editingItem, setEditingItem] = useState<string | null>(null)
  // Temporary changes object to hold all modifications until Save/Cancel
  const [tempChanges, setTempChanges] = useState<Record<string, {
    quantity?: string
    unit?: string
    name?: string
  }>>({})
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
  const [showShareDropdown, setShowShareDropdown] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)
  const [isAddingRecipe, setIsAddingRecipe] = useState(false)
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null)

  // Scroll position preservation
  const scrollPositions = useRef<{ [key: string]: number }>({})

  // Save scroll position for a section
  const saveScrollPosition = (sectionKey: string, scrollLeft: number) => {
    scrollPositions.current[sectionKey] = scrollLeft
  }

  // Restore scroll position for a section
  const restoreScrollPosition = (sectionKey: string, element: HTMLElement) => {
    const savedPosition = scrollPositions.current[sectionKey]
    if (savedPosition !== undefined) {
      element.scrollLeft = savedPosition
    }
  }



  useEffect(() => {
    setIsClient(true)
  }, [])


  useEffect(() => {
    if (isClient && !loading && !user) {
      router.push('/')
      return
    }
    if (user) {
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

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.share-dropdown')) {
        setShowShareDropdown(null);
        setDropdownPosition(null);
      }
    };

    if (showShareDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareDropdown]);

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

    // Initialize temp changes for this item if not already present
    if (!tempChanges[item.id]) {
      // Handle ranges properly - if min and max are different, show as range
      const hasRange = item.original_quantity_max && item.original_quantity_min !== item.original_quantity_max
      const initialQuantity = hasRange
        ? `${item.original_quantity_min}-${item.original_quantity_max}`
        : (item.original_quantity_min || 1).toString()

      setTempChanges(prev => ({
        ...prev,
        [item.id]: {
          quantity: initialQuantity,
          unit: item.original_unit || '',
          name: item.sort_name
        }
      }))
    }
  }

  const handleSaveEdit = async () => {
    if (selectedList && Object.keys(tempChanges).length > 0) {
      // Process all pending changes
      const updates: Array<{ itemId: string; changes: any }> = []
      let hasValidationError = false

      // Validate all changes first
      for (const [itemId, changes] of Object.entries(tempChanges)) {
        if (changes.quantity) {
          const validation = validateQuantity(changes.quantity)
          if (!validation.isValid) {
            setQuantityError(validation.error)
            hasValidationError = true
            break
          }

          updates.push({
            itemId,
            changes: {
              original_quantity_min: validation.min!,
              original_quantity_max: validation.max!,
              original_unit: changes.unit || undefined,
              name: changes.name
            }
          })
        }
      }

      if (hasValidationError) {
        return // Don't save if any validation fails
      }

      // Clear error if all validations pass
      setQuantityError('')

      // Apply all updates to database
      let allSuccessful = true
      for (const update of updates) {
        const success = await updateGroceryItem(selectedList.id, update.itemId, update.changes)
        if (!success) {
          allSuccessful = false
          break
        }
      }

      if (allSuccessful) {
        // Update local state with all changes
        setSelectedList(prev => {
          if (!prev) return null
          return {
            ...prev,
            items: prev.items.map(item => {
              const update = updates.find(u => u.itemId === item.id)
              return update ? { ...item, ...update.changes } : item
            })
          }
        })

        // Clear all temporary changes and exit editing mode
        setTempChanges({})
        setEditingItem(null)
        setQuantityError('')
      }
    }
  }

  const handleCancelEdit = () => {
    // Clear all temporary changes and exit editing mode
    setTempChanges({})
    setEditingItem(null)
    setQuantityError('')
  }

  // Real-time validation as user types
  const handleQuantityChange = (itemId: string, value: string) => {
    setTempChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: value
      }
    }))

    // Clear error when user starts typing
    if (quantityError && value.trim()) {
      setQuantityError('')
    }
  }

  // Helper function to update unit for an item
  const handleUnitChange = (itemId: string, value: string) => {
    setTempChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        unit: value
      }
    }))
  }

  // Helper function to update name for an item
  const handleNameChange = (itemId: string, value: string) => {
    setTempChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        name: value
      }
    }))
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
    
    setIsAddingRecipe(true)
    console.log('Adding recipe to list:', recipe.title, 'to list:', selectedList.name)
    
    try {
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
    } finally {
      setIsAddingRecipe(false)
    }
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipeForDetail(recipe)
    setShowRecipeDetailModal(true)
  }

  // Share export functions
  const handleExport = (list: GroceryList, format: string) => {
    switch (format) {
      case 'txt':
        exportListAsTxt(list);
        break;
      case 'pdf':
        exportListAsPdf(list);
        break;
      case 'docx':
        exportListAsDocx(list);
        break;
      case 'html':
        exportListAsHtml(list);
        break;
      case 'excel':
        exportListAsExcel(list);
        break;
      case 'url':
        shareListUrl(list);
        break;
      case 'clipboard':
        copyListToClipboard(list);
        break;
    }
    setShowShareDropdown(null);
    setDropdownPosition(null);
  };

  const exportListAsTxt = (list: GroceryList) => {
    let content = `${list.name}\n`;
    content += '='.repeat(list.name.length) + '\n\n';

    content += 'GROCERY LIST:\n';
    list.items.forEach((item) => {
      const quantity = item.original_quantity_min === item.original_quantity_max
        ? item.original_quantity_min?.toString() || '1'
        : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
      const unit = item.original_unit ? ` ${item.original_unit}` : '';
      content += `• ${quantity}${unit} ${item.sort_name}\n`;
    });

    content += `\nTotal items: ${list.items.length}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportListAsPdf = (list: GroceryList) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(list.name, 20, 30);

    // Items
    doc.setFontSize(12);
    let yPosition = 50;

    list.items.forEach((item) => {
      const quantity = item.original_quantity_min === item.original_quantity_max
        ? item.original_quantity_min?.toString() || '1'
        : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
      const unit = item.original_unit ? ` ${item.original_unit}` : '';
      const text = `• ${quantity}${unit} ${item.sort_name}`;

      doc.text(text, 20, yPosition);
      yPosition += 10;

      // Add new page if needed
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });

    // Footer
    doc.setFontSize(10);
    doc.text(`Total items: ${list.items.length}`, 20, yPosition + 10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition + 20);

    doc.save(`${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const exportListAsDocx = async (list: GroceryList) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: list.name,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "",
          }),
          ...list.items.map((item) => {
            const quantity = item.original_quantity_min === item.original_quantity_max
              ? item.original_quantity_min?.toString() || '1'
              : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
            const unit = item.original_unit ? ` ${item.original_unit}` : '';
            return new Paragraph({
              children: [
                new TextRun(`• ${quantity}${unit} ${item.sort_name}`)
              ],
            });
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun(`Total items: ${list.items.length}`)
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`Generated on: ${new Date().toLocaleDateString()}`)
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportListAsHtml = (list: GroceryList) => {
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>${list.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        ul { list-style-type: disc; padding-left: 20px; }
        li { margin: 5px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <h1>${list.name}</h1>
    <ul>`;

    list.items.forEach((item) => {
      const quantity = item.original_quantity_min === item.original_quantity_max
        ? item.original_quantity_min?.toString() || '1'
        : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
      const unit = item.original_unit ? ` ${item.original_unit}` : '';
      html += `        <li>${quantity}${unit} ${item.sort_name}</li>\n`;
    });

    html += `    </ul>
    <div class="footer">
        <p>Total items: ${list.items.length}</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportListAsExcel = (list: GroceryList) => {
    // Create CSV content (Excel can open CSV files)
    let content = `Item,Quantity,Unit\n`;
    list.items.forEach(item => {
      const quantity = item.original_quantity_min === item.original_quantity_max
        ? item.original_quantity_min?.toString() || '1'
        : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
      const unit = item.original_unit || '';
      content += `"${item.sort_name}","${quantity}","${unit}"\n`;
    });

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareListUrl = (list: GroceryList) => {
    const listUrl = `${window.location.origin}/grocery-list/${encodeURIComponent(list.name)}`;

    navigator.clipboard.writeText(listUrl).then(() => {
      alert('Grocery list URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      alert('Failed to copy URL to clipboard.');
    });
  };

  const copyListToClipboard = (list: GroceryList) => {
    let content = `${list.name}\n`;
    content += '='.repeat(list.name.length) + '\n\n';

    content += 'GROCERY LIST:\n';
    list.items.forEach((item) => {
      const quantity = item.original_quantity_min === item.original_quantity_max
        ? item.original_quantity_min?.toString() || '1'
        : `${item.original_quantity_min || 1}-${item.original_quantity_max || 1}`;
      const unit = item.original_unit ? ` ${item.original_unit}` : '';
      content += `• ${quantity}${unit} ${item.sort_name}\n`;
    });

    content += `\nTotal items: ${list.items.length}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;

    navigator.clipboard.writeText(content).then(() => {
      alert('Grocery list copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy list:', err);
      alert('Failed to copy list to clipboard.');
    });
  };

  const handleRemoveRecipeFromList = async (recipeId: string) => {
    if (!selectedList) return
    
    setRemovingRecipeId(recipeId)
    console.log('Removing recipe from list:', recipeId, 'from list:', selectedList.name)
    
    try {
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
    } finally {
      setRemovingRecipeId(null)
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

      // Group all items by category (both checked and unchecked)
      sortedItems.forEach(item => {
        const category = getCategoryDisplayName(item.category)
        if (!grouped[category]) grouped[category] = []
      })

      // For each category, separate checked and unchecked, condense unchecked, then combine
      Object.keys(grouped).forEach(category => {
        const categoryItems = sortedItems.filter(item => getCategoryDisplayName(item.category) === category)
        const unchecked = categoryItems.filter(item => !item.checked)
        const checked = categoryItems.filter(item => item.checked)

        const condensedUnchecked = condenseIngredients(unchecked)
        const condensedChecked = condenseIngredients(checked)

        // Put unchecked items first, then checked items at the end
        grouped[category] = [...condensedUnchecked, ...condensedChecked]
      })

      return grouped
    } else if (sortBy === 'recipe') {
      const grouped: { [recipe: string]: GroceryItem[] } = {}

      // Group all items by recipe
      sortedItems.forEach(item => {
        const recipeName = getRecipeName(item.recipeId)
        if (!grouped[recipeName]) grouped[recipeName] = []
      })

      // For each recipe, put unchecked items first, then checked items at the end
      Object.keys(grouped).forEach(recipeName => {
        const recipeItems = sortedItems.filter(item => getRecipeName(item.recipeId) === recipeName)
        const unchecked = recipeItems.filter(item => !item.checked)
        const checked = recipeItems.filter(item => item.checked)

        grouped[recipeName] = [...unchecked, ...checked]
      })

      return grouped
    }

    // For 'all' view, put unchecked first, then checked
    const unchecked = sortedItems.filter(item => !item.checked)
    const checked = sortedItems.filter(item => item.checked)
    return { 'All Items': [...unchecked, ...checked] }
  }

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
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
    <div className="min-h-screen bg-wk-bg-primary">
      {/* Navigation */}
      <Navigation currentPath="/grocery-list" />

      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Sidebar - Grocery Lists */}
        <div className="w-72 bg-wk-bg-surface border-r border-wk-border flex flex-col">
          <div className="p-4 border-b border-wk-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-wk-text-primary font-display">Your Lists</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-wk-accent hover:text-wk-accent-hover transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Grocery Lists */}
          <div className="flex-1 overflow-y-auto p-4 themed-scrollbar">
            <div className="space-y-3">
              {groceryLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedList(list)}
                  className={`rounded-lg p-4 cursor-pointer transition-all overflow-hidden relative hover:shadow-wk ${
                    selectedList?.id === list.id ? 'ring-2 ring-wk-accent' : 'hover:opacity-90'
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
                        <div className="relative share-dropdown z-[10000]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const button = e.currentTarget
                              const rect = button.getBoundingClientRect()

                              if (showShareDropdown === list.id) {
                                setShowShareDropdown(null)
                                setDropdownPosition(null)
                              } else {
                                setShowShareDropdown(list.id)
                                setDropdownPosition({
                                  top: rect.bottom + 8,
                                  right: window.innerWidth - rect.right
                                })
                              }
                            }}
                            className="text-white hover:text-gray-200 transition-colors drop-shadow-lg translate-y-px"
                          >
                            <Share className="h-4 w-4" />
                          </button>

                          {showShareDropdown === list.id && dropdownPosition && createPortal(
                            <div
                              className="fixed w-48 bg-wk-bg-surface border border-wk-border rounded-lg shadow-wk-lg z-[99999]"
                              style={{
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`
                              }}
                            >
                              <div className="py-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'url')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span>Share URL</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'clipboard')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy to Clipboard</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'pdf')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Export as PDF</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'docx')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Export as DOC</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'txt')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Export as TXT</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'excel')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  <span>Export as Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExport(list, 'html')
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-wk-text-primary font-body hover:bg-wk-bg-surface-hover flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                  <span>Export as HTML</span>
                                </button>
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>
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
                    <p className="text-white/90 text-sm drop-shadow-lg font-body font-medium tracking-wide">
                      {list.items.length} items • {list.recipeIds.length} recipes
                    </p>
                  </div>
                </div>
              ))}
              
              {groceryLists.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-wk-text-secondary text-sm font-body">No grocery lists yet. Create your first one!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedList ? (
            <>
              {/* Top Section - Recipes in List */}
              <div className="p-4 border-b border-wk-border bg-wk-bg-surface/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-h3 text-wk-text-primary font-display">Recipes</h3>
                  <button 
                    onClick={() => setRecipesCollapsed(!recipesCollapsed)}
                    aria-label="Toggle recipes section"
                    className="p-1 hover:bg-wk-bg-surface-hover rounded transition-colors"
                  >
                    <ChevronDown className={`h-4 w-4 text-wk-text-secondary transition-transform ${recipesCollapsed ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {!recipesCollapsed && (
                  <div className="flex gap-3 overflow-x-auto pb-2 themed-scrollbar">
                    {getFilteredRecipes().map((recipe) => (
                      <div key={recipe.id} className="flex-shrink-0 bg-wk-bg-surface rounded-lg overflow-hidden w-32 h-36 flex flex-col shadow-wk">
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemoveRecipeFromList(recipe.id)
                            }}
                            disabled={removingRecipeId === recipe.id}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-wk-error/80 rounded-full flex items-center justify-center text-white text-xs transition-colors disabled:opacity-50"
                          >
                            {removingRecipeId === recipe.id ? (
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : '✕'}
                          </button>
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-20 object-cover"
                            />
                          ) : (
                            <div className="w-full h-20 bg-wk-bg-surface-hover flex items-center justify-center">
                              <span className="text-wk-text-muted text-lg">🍽️</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <h4 className="text-xs font-medium text-wk-text-primary font-body line-clamp-2 h-8 overflow-hidden">{recipe.title}</h4>
                          <button 
                            onClick={() => handleViewRecipe(recipe)}
                            className="text-xs text-wk-text-secondary hover:text-wk-accent transition-colors cursor-pointer text-left font-body"
                          >
                            View recipe →
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Recipe Button */}
                    <div className="flex-shrink-0 bg-wk-bg-surface border-2 border-dashed border-wk-border rounded-lg overflow-hidden w-32 h-36 hover:border-wk-accent hover:bg-wk-accent-muted transition-all">
                      <button
                        onClick={() => setShowAddRecipeModal(true)}
                        aria-label="Add recipe to list"
                        className="w-full h-full text-wk-text-secondary hover:text-wk-accent flex items-center justify-center"
                      >
                        <Plus className="h-8 w-8" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Ingredients Section */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden themed-scrollbar">
                <div className="p-4 max-w-full">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      onClick={() => setShowBuyGroceriesModal(true)}
                      variant="default"
                      disabled={!selectedList || selectedList.items.filter(item => !item.checked).length === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Groceries
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowSortMenu(!showSortMenu)
                          }}
                        >
                          <Filter className="h-4 w-4 mr-1" />
                          Sort by {sortBy === 'aisle' ? 'Aisle' : 'Recipe'}
                        </Button>
                        {showSortMenu && (
                          <div className="absolute right-0 mt-2 w-40 bg-wk-bg-surface rounded-md shadow-wk-lg z-10 border border-wk-border">
                            <button
                              onClick={() => { setSortBy('aisle'); setShowSortMenu(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-wk-bg-surface-hover transition-colors text-sm text-wk-text-primary font-body"
                            >
                              By Aisle
                            </button>
                            <button
                              onClick={() => { setSortBy('recipe'); setShowSortMenu(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-wk-bg-surface-hover transition-colors text-sm text-wk-text-primary font-body"
                            >
                              By Recipe
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grouped Ingredients */}
                  <div className="space-y-8">
                    {Object.entries(getGroupedItems()).map(([groupName, items], groupIndex) => (
                      <div key={`${groupName}-${sortBy}`} className="w-full overflow-hidden">
                        {(sortBy === 'aisle' || sortBy === 'recipe') && (
                          <h3 className="text-h3 text-wk-text-primary font-display mb-4 capitalize">{groupName}</h3>
                        )}
                        <NetflixCarousel
                          key={`carousel-${groupName}-${sortBy}-${selectedList?.id || 'none'}`}
                          carouselId={`${selectedList?.id || 'none'}-${groupName}-${sortBy}`}
                          itemWidth={288}
                          gap={16}
                          resetKey={`${sortBy}-${selectedList?.id || 'none'}-${items.length}`}
                        >
                          {items.flatMap((item) => {
                            // Check if this is a condensed item
                            const isCondensed = 'isCondensed' in item && item.isCondensed

                            if (isCondensed) {
                              const condensedItem = item as CondensedGroceryItem

                              // Check if the condensed group is in editing mode
                              const hasEditingItem = condensedItem.originalItems.some(origItem => editingItem === origItem.id)

                              if (hasEditingItem) {
                                // Show single editing card with all entries
                                return [
                                  <div
                                    key={`${condensedItem.id}-editing`}
                                    className="flex-shrink-0 w-72 h-64 bg-wk-bg-surface rounded-lg overflow-hidden flex flex-col shadow-wk"
                                  >
                                    {/* Compressed image area when editing */}
                                    <div className="h-16 overflow-hidden">
                                      <CardImage item={condensedItem} recipes={recipes} sortBy={sortBy} />
                                    </div>

                                    {/* Editing content area */}
                                    <div className="flex-1 p-3 flex flex-col">
                                      {/* Ingredient name input */}
                                      <Input
                                        type="text"
                                        value={tempChanges[condensedItem.originalItems[0].id]?.name || condensedItem.sort_name}
                                        onChange={(e) => handleNameChange(condensedItem.originalItems[0].id, e.target.value)}
                                        className="w-full h-8 mb-2 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-sm font-semibold font-body"
                                        placeholder="Item name"
                                      />

                                      {/* Compact entries container - only as tall as needed */}
                                      <div className="space-y-2">
                                        {condensedItem.originalItems.map((origItem, index) => {
                                          const isCurrentlyEditing = editingItem === origItem.id
                                          // Get current values from tempChanges or fallback to original values
                                          const currentQuantity = tempChanges[origItem.id]?.quantity ??
                                            ((origItem.original_quantity_max && origItem.original_quantity_min !== origItem.original_quantity_max)
                                              ? `${origItem.original_quantity_min}-${origItem.original_quantity_max}`
                                              : origItem.original_quantity_min?.toString() || '')
                                          const currentUnit = tempChanges[origItem.id]?.unit ?? (origItem.original_unit || '')

                                          return (
                                            <div key={origItem.id} className="flex items-center gap-2">
                                              <div className="flex gap-1 flex-1">
                                                <Input
                                                  type="text"
                                                  value={currentQuantity}
                                                  onChange={(e) => {
                                                    handleQuantityChange(origItem.id, e.target.value)
                                                  }}
                                                  onFocus={() => {
                                                    if (!isCurrentlyEditing) {
                                                      handleStartEdit(origItem)
                                                    }
                                                  }}
                                                  className={`flex-1 h-6 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-xs font-body ${
                                                    isCurrentlyEditing && quantityError ? 'ring-1 ring-wk-error' : ''
                                                  }`}
                                                  placeholder="4 or 4-5"
                                                />
                                                <Input
                                                  type="text"
                                                  value={currentUnit}
                                                  onChange={(e) => {
                                                    handleUnitChange(origItem.id, e.target.value)
                                                  }}
                                                  onFocus={() => {
                                                    if (!isCurrentlyEditing) {
                                                      handleStartEdit(origItem)
                                                    }
                                                  }}
                                                  className="flex-1 h-6 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-xs font-body"
                                                  placeholder="Unit"
                                                />
                                              </div>
                                              {/* Consistent spacing - invisible placeholder for first item, trash icon for others */}
                                              <div className="w-6 h-6 flex items-center justify-center">
                                                {index > 0 ? (
                                                  <button
                                                    onClick={() => handleDeleteItem(origItem.id)}
                                                    className="p-1 text-wk-text-muted hover:text-wk-error hover:bg-wk-error/10 rounded transition-all"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                ) : (
                                                  // Invisible placeholder to maintain alignment
                                                  <div className="w-5 h-5"></div>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>

                                      {/* Error message */}
                                      {quantityError && (
                                        <span className="text-wk-error text-xs mt-1 font-body">{quantityError}</span>
                                      )}

                                      {/* Action buttons - positioned right after content */}
                                      <div className="flex gap-1 mt-3">
                                        <Button
                                          onClick={handleSaveEdit}
                                          disabled={!!quantityError || Object.keys(tempChanges).length === 0}
                                          variant="default"
                                          size="sm"
                                          className="flex-1 text-xs"
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          onClick={handleCancelEdit}
                                          variant="destructive"
                                          size="sm"
                                          className="flex-1 text-xs"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ]
                              }

                              // Show condensed view when not editing
                              return [
                                <div
                                  key={condensedItem.id}
                                  onClick={() => handleToggleCondensedItem(condensedItem)}
                                  className={`flex-shrink-0 w-72 h-64 bg-wk-bg-surface rounded-lg overflow-hidden hover:bg-wk-bg-surface-hover transition-colors cursor-pointer shadow-wk ${
                                    condensedItem.checked ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="h-40">
                                    <CardImage item={condensedItem} recipes={recipes} sortBy={sortBy} />
                                  </div>
                                  <div className="flex flex-col h-full p-3">
                                    <div className="flex items-start justify-between h-full">
                                      <div className="flex-1 pr-2 flex flex-col">
                                        {/* Dynamic ingredient name - 1 or 2 lines */}
                                        <div className={`text-lg font-bold tracking-normal line-clamp-2 leading-6 mb-1 font-body ${
                                          condensedItem.checked ? 'line-through text-wk-text-muted' : 'text-wk-text-primary'
                                        }`}>
                                          {condensedItem.sort_name}
                                        </div>
                                        {/* Quantity appears right below ingredient name */}
                                        <div className="text-sm text-wk-text-secondary font-body font-normal">
                                          {condensedItem.quantities.join(' + ')}
                                        </div>
                                      </div>
                                      {!condensedItem.checked && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleStartEdit(condensedItem.originalItems[0])
                                            }}
                                            className="p-1 text-wk-text-muted hover:text-wk-accent hover:bg-wk-accent-muted rounded transition-all"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              // Delete all original items in the condensed group
                                              condensedItem.originalItems.forEach(item => handleDeleteItem(item.id))
                                            }}
                                            className="p-1 text-wk-text-muted hover:text-wk-error hover:bg-wk-error/10 rounded transition-all"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ]
                            } else {
                              // Regular item rendering
                              const regularItem = item as GroceryItem
                              return [
                                <div
                                  key={regularItem.id}
                                  onClick={() => editingItem !== regularItem.id && handleToggleItem(regularItem.id)}
                                  className={`flex-shrink-0 w-72 h-64 bg-wk-bg-surface rounded-lg overflow-hidden hover:bg-wk-bg-surface-hover transition-colors shadow-wk ${
                                    regularItem.checked ? 'opacity-60' : ''
                                  } ${editingItem !== regularItem.id ? 'cursor-pointer' : ''}`}
                                >
                                  {editingItem === regularItem.id ? (
                                    // Editing mode - use compressed layout
                                    <>
                                      {/* Compressed image area when editing */}
                                      <div className="h-16 overflow-hidden">
                                        <CardImage item={regularItem} recipes={recipes} sortBy={sortBy} />
                                      </div>

                                      {/* Editing content area */}
                                      <div className="flex-1 p-3 flex flex-col">
                                        {/* Ingredient name input */}
                                        <Input
                                          type="text"
                                          value={tempChanges[regularItem.id]?.name || regularItem.sort_name}
                                          onChange={(e) => handleNameChange(regularItem.id, e.target.value)}
                                          className="w-full h-8 mb-2 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-sm font-semibold font-body"
                                          placeholder="Item name"
                                        />

                                        {/* Single entry editing with consistent alignment */}
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="flex gap-1 flex-1">
                                            <Input
                                              type="text"
                                              value={tempChanges[regularItem.id]?.quantity ??
                                                ((regularItem.original_quantity_max && regularItem.original_quantity_min !== regularItem.original_quantity_max)
                                                  ? `${regularItem.original_quantity_min}-${regularItem.original_quantity_max}`
                                                  : regularItem.original_quantity_min?.toString() || '')}
                                              onChange={(e) => handleQuantityChange(regularItem.id, e.target.value)}
                                              className={`flex-1 h-6 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-xs font-body ${
                                                quantityError ? 'ring-1 ring-wk-error' : ''
                                              }`}
                                              placeholder="4 or 4-5"
                                            />
                                            <Input
                                              type="text"
                                              value={tempChanges[regularItem.id]?.unit ?? (regularItem.original_unit || '')}
                                              onChange={(e) => handleUnitChange(regularItem.id, e.target.value)}
                                              className="flex-1 h-6 bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary text-xs font-body"
                                              placeholder="Unit"
                                            />
                                          </div>
                                          {/* Invisible placeholder to maintain consistent alignment */}
                                          <div className="w-6 h-6"></div>
                                        </div>

                                        {/* Error message */}
                                        {quantityError && (
                                          <span className="text-wk-error text-xs mb-2 font-body">{quantityError}</span>
                                        )}

                                        {/* Action buttons - positioned right after content */}
                                        <div className="flex gap-1 mt-3">
                                          <Button
                                            onClick={handleSaveEdit}
                                            disabled={!!quantityError || Object.keys(tempChanges).length === 0}
                                            variant="default"
                                            size="sm"
                                            className="flex-1 text-xs"
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            onClick={handleCancelEdit}
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    // Normal view mode
                                    <>
                                      <div className="h-40">
                                        <CardImage item={regularItem} recipes={recipes} sortBy={sortBy} />
                                      </div>
                                      <div className="flex flex-col h-full p-3">
                                        <div className="flex items-start justify-between h-full">
                                          <div className="flex-1 pr-2 flex flex-col">
                                            {/* Dynamic ingredient name - 1 or 2 lines */}
                                            <div className={`text-lg font-bold tracking-normal line-clamp-2 leading-6 mb-1 font-body ${
                                              regularItem.checked ? 'line-through text-wk-text-muted' : 'text-wk-text-primary'
                                            }`}>
                                              {regularItem.sort_name}
                                            </div>
                                            {/* Quantity appears right below ingredient name */}
                                            <div className="text-sm text-wk-text-secondary font-body font-normal">
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
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleStartEdit(regularItem)
                                                }}
                                                className="p-1 text-wk-text-muted hover:text-wk-accent hover:bg-wk-accent-muted rounded transition-all"
                                              >
                                                <Edit3 className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleDeleteItem(regularItem.id)
                                                }}
                                                className="p-1 text-wk-text-muted hover:text-wk-error hover:bg-wk-error/10 rounded transition-all"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ]
                            }
                          })}
                        </NetflixCarousel>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-h2 text-wk-text-primary font-display mb-2">No Grocery List Selected</h2>
                <p className="text-wk-text-secondary font-body mb-4">Create or select a grocery list to get started</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="default"
                >
                  Create Grocery List
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Service Modal - Temporarily disabled for database migration */}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-md shadow-wk-lg">
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-h3 text-wk-text-primary font-display">Create Grocery List</h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false)
                  setNewListName('')
                  setSelectedRecipes([])
                }}
                className="text-wk-accent hover:text-wk-accent-hover font-medium text-lg font-body"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-wk-text-primary mb-2 font-body">List Name</label>
                <Input
                  type="text"
                  placeholder="Enter list name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary placeholder:text-wk-text-muted font-body"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-wk-text-primary mb-2 font-body">Select Recipes</label>
                <div className="max-h-60 overflow-y-auto border border-wk-border rounded-lg p-2 themed-scrollbar">
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
                          ? 'bg-wk-accent-muted border border-wk-accent' 
                          : 'hover:bg-wk-bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-wk-bg-surface-hover rounded flex items-center justify-center flex-shrink-0">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <span className="text-wk-text-muted text-sm">🍽️</span>
                          )}
                        </div>
                        <span className="text-sm text-wk-text-primary font-body">{recipe.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleCreateList}
                disabled={!newListName || selectedRecipes.length === 0}
                variant="default"
                className="w-full"
              >
                Create List
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Add Recipe Modal */}
      {showAddRecipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-wk-bg-surface rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-wk-lg border border-wk-border">
            <div className="flex items-center justify-between p-5 border-b border-wk-border">
              <h2 className="text-xl text-wk-text-primary font-display font-semibold">Add Recipe to List</h2>
              <button 
                onClick={() => setShowAddRecipeModal(false)}
                disabled={isAddingRecipe}
                className="text-wk-accent hover:text-wk-accent-hover font-medium text-base font-body disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4">
                <label className="block text-base font-medium text-wk-text-primary mb-3 font-body">Available Recipes</label>
                <div className="max-h-72 overflow-y-auto border border-wk-border rounded-lg p-3 themed-scrollbar">
                  {recipes
                    .filter(recipe => !selectedList?.recipeIds.includes(recipe.id))
                    .map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => !isAddingRecipe && handleAddRecipeToList(recipe)}
                      className={`p-3 rounded-lg transition-colors ${isAddingRecipe ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-wk-bg-surface-hover'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-wk-bg-surface-hover rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-wk-text-muted text-lg">🍽️</span>
                          )}
                        </div>
                        <span className="text-wk-text-primary text-base font-body flex-1">{recipe.title}</span>
                        {isAddingRecipe && (
                          <svg className="animate-spin h-5 w-5 text-wk-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {recipes.filter(recipe => !selectedList?.recipeIds.includes(recipe.id)).length === 0 && (
                    <div className="text-center text-wk-text-secondary py-6 font-body text-base">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{zIndex: 60}}>
          <div className="bg-wk-bg-surface border border-wk-border rounded-xl w-full max-w-md shadow-wk-lg">
            <div className="flex justify-between items-center p-6 border-b border-wk-border">
              <h2 className="text-h3 text-wk-text-primary font-display">Edit Grocery List</h2>
              <button
                onClick={() => {
                  setShowEditVisualModal(false)
                  setEditingVisualList(null)
                }}
                className="text-wk-accent hover:text-wk-accent-hover font-medium text-lg font-body"
              >
                Cancel
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-wk-text-primary mb-2 font-body">List Name</label>
                <Input
                  type="text"
                  placeholder="Enter list name..."
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  className="bg-wk-bg-primary border-wk-border focus-visible:ring-wk-accent focus-visible:ring-offset-0 text-wk-text-primary placeholder:text-wk-text-muted font-body"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-wk-text-primary mb-2 font-body">Gradient Colors</label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-wk-text-secondary mb-1 font-body">From</label>
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="w-full h-10 rounded border-wk-border bg-wk-bg-primary cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-wk-text-secondary mb-1 font-body">To</label>
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="w-full h-10 rounded border-wk-border bg-wk-bg-primary cursor-pointer"
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

              <Button
                onClick={handleSaveVisual}
                disabled={!editListName.trim()}
                variant="default"
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
