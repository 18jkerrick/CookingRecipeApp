'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Copy, CheckCircle } from 'lucide-react'

interface Ingredient {
  name: string
  quantity: string
}

function ShopIngredientsContent() {
  const searchParams = useSearchParams()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  useEffect(() => {
    const ingredientsParam = searchParams.get('ingredients')
    if (ingredientsParam) {
      const parsedIngredients = ingredientsParam.split(',').map(item => {
        const trimmed = item.trim()
        // Try to separate quantity from name
        const match = trimmed.match(/^(\d+(?:\.\d+)?(?:\s+\w+)?)\s+(.+)/) 
        if (match) {
          return {
            quantity: match[1],
            name: match[2]
          }
        }
        return {
          quantity: '1',
          name: trimmed
        }
      })
      setIngredients(parsedIngredients)
    }
  }, [searchParams])

  const handleCopyList = async () => {
    const listText = ingredients.map(item => `${item.quantity} ${item.name}`).join('\n')
    try {
      await navigator.clipboard.writeText(listText)
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleShopOnInstacart = () => {
    // Use the first few ingredients for the search
    const keyIngredients = ingredients.slice(0, 3).map(item => item.name)
    const searchQuery = keyIngredients.join(' ')
    const instacartUrl = `https://www.instacart.com/store/search?q=${encodeURIComponent(searchQuery)}`
    window.open(instacartUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#14151a] text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Recipe Ingredients</h1>
          <p className="text-white/70">
            Here's your complete shopping list. Click below to shop on Instacart.
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Ingredients ({ingredients.length})</h2>
            <button
              onClick={handleCopyList}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
              {copiedToClipboard ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy List
                </>
              )}
            </button>
          </div>

          <ul className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                <span className="text-white/50 font-mono text-sm min-w-[60px]">
                  {ingredient.quantity}
                </span>
                <span className="flex-1">{ingredient.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instacart CTA Button - Following their design guidelines */}
        <div className="text-center">
          <button
            onClick={handleShopOnInstacart}
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#003D29] hover:bg-[#003D29]/90 text-[#FAF1E5] rounded-lg transition-colors font-medium"
            style={{ height: '46px', paddingLeft: '18px', paddingRight: '18px' }}
          >
            {/* Instacart Logo */}
            <img 
              src="/instacart-logo.svg" 
              alt="Instacart" 
              width={22} 
              height={22}
              className="flex-shrink-0"
            />
            Get Ingredients
          </button>
          
          <p className="text-xs text-white/50 mt-3">
            You'll be taken to Instacart where you can search for these ingredients
          </p>
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/grocery-list" 
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            ← Back to Grocery Lists
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ShopIngredientsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#14151a] text-white">
          <div className="text-lg">Loading...</div>
        </div>
      }
    >
      <ShopIngredientsContent />
    </Suspense>
  )
}