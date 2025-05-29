"use client";

import { useState, useEffect } from 'react';
import { exportTxt } from '../lib/utils/exportTxt';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  displayQuantity?: string;
}

interface GroceryListProps {
  items: GroceryItem[];
  onAddToExisting?: (currentItems: GroceryItem[]) => void;
  onCreateNew?: (name: string, items: GroceryItem[]) => void;
}

export default function GroceryList({ items, onAddToExisting, onCreateNew }: GroceryListProps) {
  // Initialize with display values
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(
    items.map(item => ({
      ...item,
      displayQuantity: item.quantity.toString()
    }))
  );
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<Set<number>>(new Set());

  const updateQuantity = (index: number, newQuantity: string) => {
    const updatedItems = [...groceryItems];
    // Only convert to number for storage, but always preserve the display string
    const numericValue = newQuantity === '' ? 0 : (parseFloat(newQuantity) || 0);
    updatedItems[index] = { 
      ...updatedItems[index], 
      quantity: numericValue,
      displayQuantity: newQuantity // Always preserve exactly what the user typed
    };
    setGroceryItems(updatedItems);
  };

  const updateName = (index: number, newName: string) => {
    const updatedItems = [...groceryItems];
    updatedItems[index] = { ...updatedItems[index], name: newName };
    setGroceryItems(updatedItems);
  };

  const updateUnit = (index: number, newUnit: string) => {
    const updatedItems = [...groceryItems];
    updatedItems[index] = { ...updatedItems[index], unit: newUnit };
    setGroceryItems(updatedItems);
  };

  const handleExport = () => {
    const exportName = listName.trim() || 'Grocery List';
    exportTxt(groceryItems, exportName);
  };

  const handleCreateNew = async () => {
    if (!listName.trim()) {
      alert('Please enter a list name');
      return;
    }

    if (onCreateNew) {
      onCreateNew(listName, groceryItems);
    } else {
      // Fallback to original save logic if no handler provided
      setIsSaving(true);
      try {
        const response = await fetch('/api/grocery-lists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: listName,
            items: groceryItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit
            }))
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert('Grocery list saved successfully!');
          setListName('');
        } else {
          alert('Failed to save grocery list: ' + data.error);
        }
      } catch (error) {
        console.error('Error saving grocery list:', error);
        alert('Failed to save grocery list');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddToExisting = () => {
    if (onAddToExisting) {
      onAddToExisting(groceryItems);
    }
  };

  const handleDeleteItem = (index: number) => {
    const newItems = groceryItems.filter((_, i) => i !== index);
    setGroceryItems(newItems);
    // Clear all delete confirmations after deletion
    setItemsToDelete(new Set());
  };

  // Add click outside handler with delay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Add a small delay to allow the button click to complete first
      setTimeout(() => {
        const target = event.target as Element;
        // Check if the clicked element is a delete button (either - or ✕)
        const isDeleteButton = target.closest('button')?.textContent?.trim() === '−' || 
                              target.closest('button')?.textContent?.trim() === '✕';
        
        if (!isDeleteButton) {
          console.log('Clicked outside delete button, clearing delete confirmations');
          setItemsToDelete(new Set());
        }
      }, 10);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleDeleteConfirmation = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Toggle delete for index:', index);
    setItemsToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.clear();
        newSet.add(index);
      }
      console.log('New itemsToDelete set:', newSet);
      return newSet;
    });
  };

  return (
    <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-lg shadow-md p-6 grocery-list-container">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Grocery List</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-700 font-medium">Item</th>
              <th className="text-left py-2 px-3 text-gray-700 font-medium">Quantity</th>
              <th className="text-left py-2 px-3 text-gray-700 font-medium">Unit</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {groceryItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateName(index, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={item.displayQuantity !== undefined ? item.displayQuantity : item.quantity.toString()}
                    onChange={(e) => updateQuantity(index, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateUnit(index, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="cups, lbs, etc."
                  />
                </td>
                <td className="py-2 px-3">
                  {itemsToDelete.has(index) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Deleting item at index:', index);
                        handleDeleteItem(index);
                      }}
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs font-bold"
                      title="Delete item"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        console.log('Clicked minus button for index:', index);
                        toggleDeleteConfirmation(index, e);
                      }}
                      className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors text-sm font-bold"
                      title="Delete item"
                    >
                      −
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <input
            type="text"
            placeholder="Enter list name..."
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={handleAddToExisting}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Add to Existing List
          </button>
          <button
            onClick={handleCreateNew}
            disabled={isSaving || !listName.trim()}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Create New List'}
          </button>
        </div>
      </div>
    </div>
  );
} 