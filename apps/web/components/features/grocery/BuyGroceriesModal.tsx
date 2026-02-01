'use client'

import { useState } from 'react'
import { ShoppingCart, ExternalLink, Loader2, Store, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  getInstacartUrl
} from '@acme/integrations/grocery-delivery/service-urls'

interface GroceryItem {
  id: string
  name: string
  sort_name: string
  original_quantity_min?: number
  original_unit?: string
  checked: boolean
}

interface BuyGroceriesModalProps {
  isOpen: boolean
  onClose: () => void
  items: GroceryItem[]
  groceryListTitle?: string
  groceryListId?: string
}

interface InstacartResult {
  availability: {
    available: boolean
    stores: string[]
    deliveryWindows: string[]
  }
  storeOptions: Array<{
    store: string
    itemCount: number
    pricing: {
      subtotal: string
      deliveryFee: string
      serviceFee: string
      tax: string
      total: string
    }
  }>
  unmatchedItems: GroceryItem[]
  recommendedStore?: any
}

export default function BuyGroceriesModal({ isOpen, onClose, items, groceryListTitle, groceryListId }: BuyGroceriesModalProps) {
  const [loading, setLoading] = useState(false)

  const uncheckedItems = items.filter(item => !item.checked)

  // Helper function to clean ingredient names and extract quantities
  const parseIngredientData = (item: any) => {
    let cleanName = item.sort_name
    let quantity = item.original_quantity_min || 1
    let unit = item.original_unit || ''

    // Check if sort_name contains embedded quantities (problematic pattern)
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ')
      if (parts.length >= 2) {
        cleanName = parts[0].trim()
        const quantityPart = parts[1].trim()

        // Parse quantity from the embedded text
        const rangeMatch = quantityPart.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
        if (rangeMatch) {
          quantity = parseFloat(rangeMatch[1]) // Take lower value of range
          // Extract unit if present
          const unitMatch = quantityPart.match(/(?:\d+(?:\.\d+)?)\s*-\s*(?:\d+(?:\.\d+)?)\s*(.+)/)
          if (unitMatch) {
            unit = unitMatch[1].trim()
          }
        } else {
          // Handle other quantity patterns like "3", "1/2 cup", "4 tbsp"
          const simpleMatch = quantityPart.match(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)/)
          if (simpleMatch) {
            const qtyStr = simpleMatch[1]
            // Handle fractions
            if (qtyStr.includes('/')) {
              const [num, den] = qtyStr.split('/')
              quantity = parseFloat(num) / parseFloat(den)
            } else {
              quantity = parseFloat(qtyStr)
            }
            unit = simpleMatch[2].trim() || ''
          }
        }
      }
    }

    // Capitalize ingredient name properly
    cleanName = cleanName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return { name: cleanName, quantity, unit }
  }

  const handleShopOnInstacart = async () => {
    setLoading(true)
    try {
      const itemsForService = uncheckedItems.map(item => parseIngredientData(item))

      const response = await fetch('/api/grocery-delivery/instacart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsForService,
          groceryListTitle,
          groceryListId
        })
      })

      const data = await response.json()

      if (data.success && data.recipePageUrl) {
        console.log('Opening Instacart shopping list:', data.recipePageUrl);
        window.open(data.recipePageUrl, '_blank');
        onClose();
      } else {
        console.error('Failed to create Instacart shopping list:', data.error)
        // Fallback to basic Instacart search
        const searchQuery = uncheckedItems.slice(0, 3).map(item => item.sort_name).join(' ')
        const fallbackUrl = `https://www.instacart.com/store/search?q=${encodeURIComponent(searchQuery)}`
        window.open(fallbackUrl, '_blank');
        onClose();
      }
    } catch (error) {
      console.error('Error creating Instacart shopping list:', error)
      // Fallback to basic Instacart search
      const searchQuery = uncheckedItems.slice(0, 3).map(item => item.sort_name).join(' ')
      const fallbackUrl = `https://www.instacart.com/store/search?q=${encodeURIComponent(searchQuery)}`
      window.open(fallbackUrl, '_blank');
      onClose();
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1f26] rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              Shop for {uncheckedItems.length} ingredients
            </h2>
            <p className="text-white/70 mb-6">
              We'll create a shopping list on Instacart with all your ingredients
            </p>

            {/* Instacart CTA Button */}
            <button
              onClick={handleShopOnInstacart}
              disabled={loading}
              className="w-full bg-[#003D29] hover:bg-[#003D29]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-full transition-colors flex items-center justify-center gap-3 mb-4"
              style={{ minHeight: '56px' }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Shopping List...
                </>
              ) : (
                <>
                  {/* Instacart Carrot Logo */}
                  <div className="flex items-center">
                    <svg width="24" height="24" viewBox="0 0 42.3 52.9" className="w-6 h-6">
                      <path className="fill-[#0AAD0A]" d="M36.4,8.6c-2.3,0-4,1-5.5,3.2l-4.4,6.4V0H15.9v18.2l-4.4-6.4C9.9,9.6,8.2,8.6,5.9,8.6C2.4,8.6,0,11.2,0,14.4c0,2.7,1.3,4.5,4,6.3l17.1,11l17.1-11c2.7-1.8,4-3.5,4-6.3C42.3,11.2,39.9,8.6,36.4,8.6z"/>
                      <path className="fill-[#FF7009]" d="M21.1,34.4c10.2,0,18.5,7.6,18.5,18.5h-37C2.6,42,11,34.4,21.1,34.4z"/>
                    </svg>
                  </div>
                  Shop on Instacart
                </>
              )}
            </button>



            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}