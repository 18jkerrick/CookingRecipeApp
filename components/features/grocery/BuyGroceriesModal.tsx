'use client'

import { useState } from 'react'
import { ShoppingCart, Copy, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
  getAmazonFreshUrl, 
  getInstacartUrl, 
  getShiptUrl, 
  getGoPuffUrl, 
  getWalmartUrl,
  checkServiceAvailability,
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

const services = [
  {
    id: 'amazonFresh',
    name: 'Amazon Fresh',
    logo: 'AF',
    color: '#FF9900',
    description: 'Next-day delivery',
    getUrl: getAmazonFreshUrl
  },
  {
    id: 'instacart',
    name: 'Instacart',
    logo: 'IC',
    color: '#00C851',
    description: '2-hour delivery',
    getUrl: getInstacartUrl
  },
  {
    id: 'shipt',
    name: 'Shipt',
    logo: 'S',
    color: '#00CED1',
    description: 'Same-day delivery',
    getUrl: getShiptUrl
  },
  {
    id: 'gopuff',
    name: 'GoPuff',
    logo: 'GP',
    color: '#8B5CF6',
    description: '30-minute delivery',
    getUrl: getGoPuffUrl
  },
  {
    id: 'walmartPlus',
    name: 'Walmart',
    logo: 'W+',
    color: '#0071CE',
    description: 'Free delivery',
    getUrl: getWalmartUrl
  }
]

export default function BuyGroceriesModal({ isOpen, onClose, items }: BuyGroceriesModalProps) {
  const [zipCode, setZipCode] = useState('')
  const [showServices, setShowServices] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [testingAmazon, setTestingAmazon] = useState(false)
  const [amazonTestResults, setAmazonTestResults] = useState<any>(null)

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

  const handleServiceClick = async (service: typeof services[0]) => {
    const itemsForService = uncheckedItems.map(item => ({
      name: item.sort_name,
      quantity: item.original_quantity_min,
      unit: item.original_unit
    }))
    
    // Test Amazon SP-API integration
    if (service.id === 'amazonFresh' && process.env.NODE_ENV === 'development') {
      setTestingAmazon(true)
      try {
        const response = await fetch('/api/grocery-delivery/amazon-fresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsForService, zipCode })
        })
        const data = await response.json()
        setAmazonTestResults(data)
        console.log('Amazon SP-API Test Results:', data)
      } catch (error) {
        console.error('Amazon SP-API Test Error:', error)
      } finally {
        setTestingAmazon(false)
      }
    }
    
    const url = service.getUrl(itemsForService, zipCode)
    window.open(url, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1f26] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Buy Groceries Online</h2>
            <p className="text-xs text-yellow-400 mt-1">🔧 Currently using mock data while awaiting API approvals</p>
          </div>
          <button 
            onClick={() => {
              onClose()
              setShowServices(false)
              setZipCode('')
              setAmazonTestResults(null)
            }}
            className="text-[#FF3A25] font-medium text-lg"
          >
            Cancel
          </button>
        </div>
        
        <div className="p-6">
          {!showServices ? (
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Enter your ZIP code</h3>
              <p className="text-white/70 mb-4">We'll show you available delivery services in your area</p>
              
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="ZIP Code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="flex-1 bg-[#14151a] border-none focus-visible:ring-[#2B966F] focus-visible:ring-offset-0 text-white placeholder:text-gray-500"
                  maxLength={5}
                />
                <button
                  onClick={() => {
                    if (zipCode.length === 5) {
                      setShowServices(true)
                    }
                  }}
                  disabled={zipCode.length !== 5}
                  className="px-6 py-2 bg-[#2B966F] hover:bg-[#2B966F]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
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
                      <CheckCircle className="h-4 w-4 text-[#2B966F]" />
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
              
              <div className="mb-6 p-4 bg-[#14151a] rounded-lg">
                <p className="text-sm text-white/70 mb-2">Your list includes:</p>
                <div className="text-sm text-white space-y-1 max-h-32 overflow-y-auto">
                  {uncheckedItems.slice(0, 5).map((item, index) => (
                    <div key={item.id}>
                      • {item.original_quantity_min || 1} {item.original_unit || ''} {item.sort_name}
                    </div>
                  ))}
                  {uncheckedItems.length > 5 && (
                    <div className="text-white/50">...and {uncheckedItems.length - 5} more items</div>
                  )}
                </div>
              </div>
              
              <h4 className="text-sm font-medium text-white mb-3">Choose a delivery service:</h4>
              
              <div className="space-y-3">
                {services.map((service) => {
                  const isAvailable = checkServiceAvailability(service.id, zipCode)
                  
                  return (
                    <div
                      key={service.id}
                      onClick={() => isAvailable && !testingAmazon && handleServiceClick(service)}
                      className={`p-4 rounded-lg border ${
                        isAvailable 
                          ? 'border-white/20 hover:border-[#2B966F] cursor-pointer' 
                          : 'border-white/10 opacity-50 cursor-not-allowed'
                      } ${testingAmazon && service.id === 'amazonFresh' ? 'opacity-50' : ''} transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: service.color }}
                          >
                            {service.logo}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{service.name}</h4>
                            <p className="text-sm text-white/70">
                              {isAvailable ? service.description : 'Not available in your area'}
                            </p>
                          </div>
                        </div>
                        {isAvailable && (
                          <div className="flex items-center gap-2 text-[#2B966F]">
                            {testingAmazon && service.id === 'amazonFresh' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <span className="text-sm">Shop Now</span>
                                <ExternalLink className="h-4 w-4" />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {amazonTestResults && (
                <div className="mt-4 p-4 bg-[#14151a] rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-2">Amazon SP-API Test Results:</h4>
                  {amazonTestResults.debug?.sandbox && (
                    <p className="text-xs text-yellow-400 mb-2">🔧 Using sandbox data (awaiting API approval)</p>
                  )}
                  <pre className="text-xs text-white/70 overflow-x-auto">
                    {JSON.stringify(amazonTestResults, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowServices(false)
                    setZipCode('')
                    setAmazonTestResults(null)
                  }}
                  className="text-[#2B966F] hover:text-[#2B966F]/80 text-sm font-medium"
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