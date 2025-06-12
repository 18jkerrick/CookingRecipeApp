'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Clock, DollarSign, Check } from 'lucide-react'
import { 
  DeliveryService, 
  DELIVERY_SERVICES, 
  UniversalCartItem,
  PriceEstimate,
  generateDeepLink,
  estimatePrices,
  convertToUniversalCart
} from '../lib/deliveryIntegration'
import { GroceryList } from '../lib/groceryStorage'

interface DeliveryServiceModalProps {
  isOpen: boolean
  onClose: () => void
  groceryList: GroceryList
}

export default function DeliveryServiceModal({ isOpen, onClose, groceryList }: DeliveryServiceModalProps) {
  const [selectedService, setSelectedService] = useState<DeliveryService | null>(null)
  const [zipCode, setZipCode] = useState('')
  const [priceEstimates, setPriceEstimates] = useState<PriceEstimate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load saved zip code
    const savedZip = localStorage.getItem('userZipCode')
    if (savedZip) setZipCode(savedZip)
  }, [])

  const handleGetPrices = async () => {
    if (!zipCode) return
    
    setLoading(true)
    localStorage.setItem('userZipCode', zipCode)
    
    try {
      const cartItems = convertToUniversalCart(groceryList)
      const services: DeliveryService[] = Object.keys(DELIVERY_SERVICES) as DeliveryService[]
      const estimates = await estimatePrices(cartItems, services, zipCode)
      setPriceEstimates(estimates)
    } catch (error) {
      console.error('Error fetching price estimates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (service: DeliveryService) => {
    const cartItems = convertToUniversalCart(groceryList)
    const deepLink = generateDeepLink(cartItems, service, zipCode)
    window.open(deepLink, '_blank')
  }

  const getEstimateForService = (service: DeliveryService) => {
    return priceEstimates.find(e => e.service === service)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 70}}>
      <div className="bg-[#1e1f26] border border-white/10 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Order Groceries</h2>
            <p className="text-sm text-white/60 mt-1">
              {groceryList.items.filter(i => !i.checked).length} items from "{groceryList.name}"
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Zip Code Input */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-white/60 mb-1 block">Delivery Zip Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter your zip code"
                className="w-full px-3 py-2 bg-[#14151a] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF3A25] focus:border-transparent"
                maxLength={5}
              />
            </div>
            <button
              onClick={handleGetPrices}
              disabled={!zipCode || zipCode.length !== 5 || loading}
              className="px-6 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors mt-6"
            >
              {loading ? 'Loading...' : 'Compare Prices'}
            </button>
          </div>
        </div>

        {/* Service List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(DELIVERY_SERVICES) as [DeliveryService, typeof DELIVERY_SERVICES[DeliveryService]][]).map(([serviceKey, config]) => {
              const estimate = getEstimateForService(serviceKey)
              const isAvailable = estimate?.availability === 'available'
              
              return (
                <div
                  key={serviceKey}
                  className={`bg-[#14151a] border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedService === serviceKey 
                      ? 'border-[#FF3A25] ring-2 ring-[#FF3A25]/20' 
                      : 'border-white/10 hover:border-white/20'
                  } ${!isAvailable && estimate ? 'opacity-60' : ''}`}
                  onClick={() => isAvailable && setSelectedService(serviceKey)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <h3 className="font-medium text-white">{config.name}</h3>
                        {estimate && (
                          <p className={`text-xs mt-1 ${isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                            {isAvailable ? 'Available' : 'Limited availability'}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedService === serviceKey && (
                      <Check className="h-5 w-5 text-[#FF3A25]" />
                    )}
                  </div>

                  {estimate && (
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Subtotal</span>
                        <span className="text-white">${estimate.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Delivery</span>
                        <span className="text-white">${estimate.deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pt-2 border-t border-white/10">
                        <span className="text-white">Total</span>
                        <span className="text-white">${estimate.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {config.features.realTimeInventory && (
                      <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">
                        Real-time stock
                      </span>
                    )}
                    {config.features.deliveryScheduling && (
                      <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Schedule delivery
                      </span>
                    )}
                    {config.features.substituteOptions && (
                      <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">
                        Substitutions
                      </span>
                    )}
                  </div>

                  {selectedService === serviceKey && estimate && isAvailable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleServiceSelect(serviceKey)
                      }}
                      className="w-full mt-4 px-4 py-2 bg-[#FF3A25] hover:bg-[#FF3A25]/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Continue to {config.name}
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {!priceEstimates.length && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">Enter your zip code to compare prices and availability</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}