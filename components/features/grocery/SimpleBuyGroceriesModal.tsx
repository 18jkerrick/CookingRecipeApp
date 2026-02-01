'use client'

import { useState } from 'react'
import { ShoppingCart, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
  getInstacartUrl,
  copyGroceryListToClipboard
} from '@acme/integrations/grocery-delivery/service-urls'

interface GroceryItem {
  id: string
  name: string
  sort_name: string
  original_quantity_min?: number
  original_unit?: string
  checked: boolean
}

interface SimpleBuyGroceriesModalProps {
  isOpen: boolean
  onClose: () => void
  items: GroceryItem[]
}

export default function SimpleBuyGroceriesModal({ isOpen, onClose, items }: SimpleBuyGroceriesModalProps) {
  const [zipCode, setZipCode] = useState('')
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  if (!isOpen) return null

  const handleInstacartRedirect = () => {
    // Convert grocery items to the format expected by the shopping page
    const formattedItems = items.map(item => ({
      name: item.name,
      quantity: item.original_quantity_min || 1,
      unit: item.original_unit || ''
    }))

    // Create URL to our ingredient shopping page
    const params = new URLSearchParams({
      ingredients: formattedItems.map(item => `${item.quantity} ${item.unit || ''} ${item.name}`.trim()).join(',')
    })
    
    const shopUrl = `/shop-ingredients?${params.toString()}`
    window.open(shopUrl, '_blank')
  }

  const handleCopyList = async () => {
    const formattedItems = items.map(item => ({
      name: item.name,
      quantity: item.original_quantity_min || 1,
      unit: item.original_unit || ''
    }))

    const success = await copyGroceryListToClipboard(formattedItems)
    if (success) {
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Buy Groceries Online
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Shopping for {items.length} items
            </p>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <ul className="text-sm space-y-1">
                {items.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-gray-400">•</span>
                    {item.original_quantity_min && item.original_unit && (
                      <span className="text-gray-600">
                        {item.original_quantity_min} {item.original_unit}
                      </span>
                    )}
                    <span>{item.name}</span>
                  </li>
                ))}
                {items.length > 5 && (
                  <li className="text-gray-500 text-xs">
                    ...and {items.length - 5} more items
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code (optional)
            </label>
            <Input
              type="text"
              placeholder="Enter your ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleInstacartRedirect}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Shop on Instacart
            </button>

            <button
              onClick={handleCopyList}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              {copiedToClipboard ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy grocery list
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>Powered by Instacart</p>
            <p>We may earn a commission from purchases made through this link.</p>
          </div>
        </div>
      </div>
    </div>
  )
}