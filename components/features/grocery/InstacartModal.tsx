'use client'

import { useState } from 'react'

interface GroceryItem {
  id: string
  name: string
  sort_name: string
  original_quantity_min?: number
  original_unit?: string
  checked: boolean
  recipeId?: string
}

interface InstacartModalProps {
  isOpen: boolean
  onClose: () => void
  items: GroceryItem[]
}

export default function InstacartModal({ isOpen, onClose, items }: InstacartModalProps) {
  if (!isOpen) return null

  const handleGetIngredients = () => {
    // Use the working recipe ID that displays grocery list properly
    const instacartUrl = `https://customers.dev.instacart.tools/store/recipes/7289260`
    
    // Add UTM parameters for tracking (when you have affiliate setup)
    const urlWithTracking = `${instacartUrl}?utm_source=remy&utm_medium=affiliate&utm_campaign=recipe_ingredients`
    
    window.open(urlWithTracking, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1e1f26] border border-white/10 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-6 text-white">
            Shop for {items.length} ingredients
          </h2>
          
          {/* Instacart CTA Button - Matching the target screenshot */}
          <button
            onClick={handleGetIngredients}
            className="w-full bg-[#003D29] hover:bg-[#003D29]/90 text-white font-medium py-4 px-6 rounded-full transition-colors flex items-center justify-center gap-3 mb-6"
            style={{ minHeight: '56px' }}
          >
            {/* Instacart Carrot Logo */}
            <div className="flex items-center">
              <svg width="24" height="24" viewBox="0 0 42.3 52.9" className="w-6 h-6">
                <path className="fill-[#0AAD0A]" d="M36.4,8.6c-2.3,0-4,1-5.5,3.2l-4.4,6.4V0H15.9v18.2l-4.4-6.4C9.9,9.6,8.2,8.6,5.9,8.6C2.4,8.6,0,11.2,0,14.4c0,2.7,1.3,4.5,4,6.3l17.1,11l17.1-11c2.7-1.8,4-3.5,4-6.3C42.3,11.2,39.9,8.6,36.4,8.6z"/>
                <path className="fill-[#FF7009]" d="M21.1,34.4c10.2,0,18.5,7.6,18.5,18.5h-37C2.6,42,11,34.4,21.1,34.4z"/>
              </svg>
            </div>
            Get Recipe Ingredients
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
  )
}