"use client";

import { useState, useEffect } from 'react';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

interface SavedList {
  id: string;
  name: string;
  grocery_items: GroceryItem[];
}

interface MergeListManagerProps {
  items: GroceryItem[];
  onMergeWith: (savedListId: string, items: GroceryItem[]) => void;
  onClose: () => void;
}

export default function MergeListManager({ items, onMergeWith, onClose }: MergeListManagerProps) {
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchSavedLists();
  }, []);

  const fetchSavedLists = async () => {
    try {
      const response = await fetch('/api/grocery-lists');
      const data = await response.json();
      
      if (response.ok) {
        setSavedLists(data.lists);
      } else {
        console.error('Failed to fetch saved lists:', data.error);
      }
    } catch (error) {
      console.error('Error fetching saved lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = () => {
    if (selectedList) {
      onMergeWith(selectedList, items);
      onClose();
    }
  };

  const getSelectedListItems = () => {
    const selected = savedLists.find(list => list.id === selectedList);
    return selected ? selected.grocery_items : [];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center py-4">Loading saved lists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Merge with Existing List</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Saved List Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-800">
                Select a saved list to merge with:
              </label>
              {savedLists.length > 0 ? (
                <select
                  value={selectedList}
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Choose a saved list...</option>
                  {savedLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.grocery_items.length} items)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-600 italic">No saved lists available. Save a list first!</p>
              )}
            </div>

            {/* Current Items Preview */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Current grocery list ({items.length} items):
              </label>
              <div className="max-h-32 overflow-y-auto bg-blue-50 rounded p-3 border border-blue-200">
                {items.map((item, index) => (
                  <div key={index} className="text-sm text-blue-800">
                    {item.quantity} {item.unit} {item.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected List Preview */}
            {selectedList && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Selected saved list ({getSelectedListItems().length} items):
                </label>
                <div className="max-h-32 overflow-y-auto bg-green-50 rounded p-3 border border-green-200">
                  {getSelectedListItems().map((item, index) => (
                    <div key={index} className="text-sm text-green-800">
                      {item.quantity} {item.unit} {item.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merge Info */}
            {selectedList && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Items with the same name will have their quantities combined. 
                  The merged list will update the existing saved list.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!selectedList || items.length === 0}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Merge Lists
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 