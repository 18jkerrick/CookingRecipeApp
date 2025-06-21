'use client'

import { useState } from 'react'
import { ShoppingCart, Copy, CheckCircle, ExternalLink, Loader2, Store, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
  getInstacartUrl,
  copyGroceryListToClipboard
} from '@/lib/grocery-delivery/service-urls'

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

export default function BuyGroceriesModal({ isOpen, onClose, items }: BuyGroceriesModalProps) {
  const [zipCode, setZipCode] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [loading, setLoading] = useState(false)
  const [instacartResults, setInstacartResults] = useState<InstacartResult | null>(null)
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = useState<string>('')

  const uncheckedItems = items.filter(item => !item.checked)
  
  const handleCopyList = async () => {
    const itemsForCopy = uncheckedItems.map(item => ({
      name: item.sort_name,
      quantity: item.original_quantity_min,
      unit: item.original_unit
    }))
    
    const success = await copyGroceryListToClipboard(itemsForCopy)
    if (success) {
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 3000)
    }
  }

  const handleCheckAvailability = async () => {
    setLoading(true)
    try {
      const itemsForService = uncheckedItems.map(item => ({
        name: item.sort_name,
        quantity: item.original_quantity_min || 1,
        unit: item.original_unit || ''
      }))

      const response = await fetch('/api/grocery-delivery/instacart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsForService, zipCode })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setInstacartResults(data)
        setSelectedStore(data.recommendedStore?.store || data.storeOptions[0]?.store || '')
        setShowResults(true)
      } else {
        console.error('Instacart availability check failed:', data.error)
      }
    } catch (error) {
      console.error('Error checking Instacart availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShopNow = async () => {
    // If we have a selected store and no recipe URL yet, or if we want to update the store preference,
    // make a new API call with the selected store
    if (selectedStore && instacartResults) {
      console.log(`Creating recipe page for selected store: ${selectedStore}`);
      
      try {
        const response = await fetch('/api/grocery-delivery/instacart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: uncheckedItems.map(item => ({
              name: item.sort_name,
              quantity: item.original_quantity_min,
              unit: item.original_unit
            })),
            zipCode,
            selectedStore // Pass the selected store
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.recipePageUrl) {
          console.log(`Opening store-specific URL for ${selectedStore}:`, data.recipePageUrl);
          console.log('Retailer key used:', data.debug?.retailerKeyUsed);
          window.open(data.recipePageUrl, '_blank');
          return;
        }
      } catch (error) {
        console.error('Error creating store-specific recipe:', error);
      }
    }
    
    // Fallback to existing URL or create generic URL
    let url = instacartResults?.recipePageUrl || instacartResults?.cartUrl;
    
    if (!url) {
      const itemsForUrl = uncheckedItems.map(item => ({
        name: item.sort_name,
        quantity: item.original_quantity_min,
        unit: item.original_unit
      }));
      url = getInstacartUrl(itemsForUrl, zipCode);
    }
    
    console.log('Opening fallback Instacart URL:', url);
    window.open(url, '_blank');
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1f26] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Buy Groceries Online</h2>
            <p className="text-xs text-white/60 mt-1">Powered by Instacart</p>
          </div>
          <button 
            onClick={() => {
              onClose()
              setShowResults(false)
              setZipCode('')
              setInstacartResults(null)
            }}
            className="text-[#FF3A25] font-medium text-lg"
          >
            Cancel
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!showResults ? (
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Enter your ZIP code</h3>
              <p className="text-white/70 mb-4">We'll check Instacart availability using Partner API to find real retailers and create a recipe page</p>
              
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="ZIP Code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="flex-1 bg-[#14151a] border-none focus-visible:ring-[#00C851] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
                  maxLength={5}
                />
                <button
                  onClick={handleCheckAvailability}
                  disabled={zipCode.length !== 5 || loading}
                  className="px-6 py-2 bg-[#00C851] hover:bg-[#00C851]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Finding Retailers...' : 'Check Availability'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-white">Shopping for {uncheckedItems.length} items</h3>
                  <p className="text-white/70">ZIP: {zipCode}</p>
                </div>
                <button
                  onClick={handleCopyList}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  {copiedToClipboard ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-[#00C851]" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy List
                    </>
                  )}
                </button>
              </div>

              {instacartResults?.unmatchedItems && instacartResults.unmatchedItems.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-400 mb-1">
                        {instacartResults.unmatchedItems.length} items couldn't be matched
                      </p>
                      <p className="text-xs text-white/60">
                        These items may need to be searched manually:
                      </p>
                      <div className="mt-2 text-xs text-white/80">
                        {instacartResults.unmatchedItems.map((item, idx) => (
                          <div key={idx}>• {item.name}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Store Selection */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Choose a Store
                </h4>
                <div className="space-y-2">
                  {instacartResults?.storeOptions.map((option) => (
                    <div
                      key={option.store}
                      onClick={() => setSelectedStore(option.store)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedStore === option.store
                          ? 'border-[#00C851] bg-[#00C851]/10'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-white">{option.store}</h5>
                          <p className="text-sm text-white/60">
                            {option.itemCount} of {uncheckedItems.length} items found
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white">${option.pricing.total}</p>
                          <p className="text-xs text-white/60">
                            {parseFloat(option.pricing.deliveryFee) > 0 
                              ? `$${option.pricing.deliveryFee} delivery` 
                              : 'Free delivery'}
                          </p>
                        </div>
                      </div>
                      
                      {selectedStore === option.store && (
                        <div className="mt-3 pt-3 border-t border-white/10 text-sm">
                          <div className="flex justify-between text-white/60 mb-1">
                            <span>Subtotal:</span>
                            <span>${option.pricing.subtotal}</span>
                          </div>
                          <div className="flex justify-between text-white/60 mb-1">
                            <span>Service fee:</span>
                            <span>${option.pricing.serviceFee}</span>
                          </div>
                          <div className="flex justify-between text-white/60 mb-1">
                            <span>Est. tax:</span>
                            <span>${option.pricing.tax}</span>
                          </div>
                          {parseFloat(option.pricing.deliveryFee) > 0 && (
                            <div className="flex justify-between text-white/60">
                              <span>Delivery:</span>
                              <span>${option.pricing.deliveryFee}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Window Selection */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Choose Delivery Time
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {instacartResults?.availability.deliveryWindows.map((window) => (
                    <button
                      key={window}
                      onClick={() => setSelectedDeliveryWindow(window)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        selectedDeliveryWindow === window
                          ? 'border-[#00C851] bg-[#00C851]/10 text-white'
                          : 'border-white/20 hover:border-white/40 text-white/80'
                      }`}
                    >
                      {window}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShopNow}
                  disabled={instacartResults?.storeOptions?.length > 0 ? (!selectedStore || !selectedDeliveryWindow) : (!selectedDeliveryWindow || !instacartResults?.recipePageUrl)}
                  className="flex-1 px-6 py-3 bg-[#00C851] hover:bg-[#00C851]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {instacartResults?.recipePageUrl ? 'Open Recipe Page' : 'Shop Now on Instacart'}
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>

              {/* Debug Information */}
              {instacartResults?.debug && (
                <div className="mt-6 p-3 bg-gray-800/50 rounded-lg">
                  <h5 className="text-xs font-medium text-white/70 mb-2">Debug Information</h5>
                  <div className="text-xs text-white/50 space-y-1">
                    <div>API: {instacartResults.debug.apiType} • Environment: {instacartResults.debug.environment}</div>
                    <div>Items: {instacartResults.debug.matchedItems}/{instacartResults.debug.totalItems} matched</div>
                    <div>Retailers: {instacartResults.debug.retailersFound} found</div>
                    {instacartResults.debug.recipeError && (
                      <div className="text-red-400">Recipe Error: {instacartResults.debug.recipeError}</div>
                    )}
                    {instacartResults?.recipePageUrl && (
                      <div className="text-green-400 break-all">
                        ✓ Recipe URL: {instacartResults.recipePageUrl}
                      </div>
                    )}
                    {!instacartResults?.recipePageUrl && (
                      <div className="text-yellow-400">⚠ No recipe page URL - using fallback</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowResults(false)
                    setZipCode('')
                    setInstacartResults(null)
                  }}
                  className="text-[#00C851] hover:text-[#00C851]/80 text-sm font-medium"
                >
                  ← Change ZIP code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}