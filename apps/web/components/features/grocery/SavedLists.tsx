"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { exportTxt } from '@acme/core/utils/exportTxt';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  displayQuantity?: string; // For editing
}

interface GroceryList {
  id: string;
  name: string;
  created_at: string;
  grocery_items: GroceryItem[];
}

const SavedLists = forwardRef<{ refreshLists: () => void }>((props, ref) => {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editedList, setEditedList] = useState<GroceryList | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLists();
  }, []);

  useImperativeHandle(ref, () => ({
    refreshLists: fetchLists
  }));

  const fetchLists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/grocery-lists');
      
      // Check if response exists (network connection successful)
      if (!response) {
        throw new Error('Network error: No response received');
      }
      
      if (!response.ok) {
        // Check if it's a network-related HTTP error
        if (response.status >= 500 || response.status === 0) {
          throw new Error('Network error: Server unavailable');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle the correct response structure - data.lists is the array
      if (data.lists && Array.isArray(data.lists)) {
        setLists(data.lists);
      } else if (Array.isArray(data)) {
        // Fallback in case API structure changes
        setLists(data);
      } else {
        console.error('API returned non-array data:', data);
        setLists([]); // Fallback to empty array
      }
    } catch (error) {
      // Only log non-network errors to avoid console spam
      const isNetworkError = error instanceof TypeError || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Network error') ||
            error.message.includes('HTTP 5') ||
            error.message.includes('Server unavailable')
          ));
      
      if (!isNetworkError) {
        console.error('Failed to fetch lists:', error);
      }
      
      // Show user-friendly error message for different error types
      if (isNetworkError) {
        // Network-related errors (disconnected wifi, server down, etc.)
        alert('Unable to load grocery lists. Please check your internet connection and try again.');
      } else {
        // Other errors
        alert('Failed to load grocery lists. Please try again later.');
      }
      
      // Set empty lists so UI doesn't break
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleListClick = (listId: string) => {
    setExpandedList(expandedList === listId ? null : listId);
  };

  const startEditing = (list: GroceryList) => {
    console.log('Starting to edit list:', list);
    setEditingList(list.id);
    setExpandedList(list.id);
    setEditedList({ ...list });
    setItemsToDelete(new Set()); // Clear delete confirmations when starting edit
  };

  const cancelEditing = () => {
    setEditingList(null);
    setEditedList(null);
    setItemsToDelete(new Set()); // Clear delete confirmations when canceling
  };

  const updateListName = (newName: string) => {
    if (editedList) {
      setEditedList({ ...editedList, name: newName });
    }
  };

  const updateItem = (index: number, field: keyof GroceryItem, value: string) => {
    console.log('updateItem called:', { index, field, value, valueType: typeof value });
    
    if (editedList) {
      const updatedItems = [...editedList.grocery_items];
      
      if (field === 'displayQuantity') {
        const numericValue = parseFloat(value) || 0;
        console.log('Updating quantity:', { 
          originalValue: value, 
          numericValue, 
          willStore: value 
        });
        
        updatedItems[index] = {
          ...updatedItems[index],
          quantity: numericValue,
          displayQuantity: value
        };
      } else {
        updatedItems[index] = { 
          ...updatedItems[index], 
          [field]: value 
        };
      }
      
      console.log('Updated item:', updatedItems[index]);
      setEditedList({ ...editedList, grocery_items: updatedItems });
    }
  };

  const updateItemQuantity = (itemIndex: number, quantity: number) => {
    if (!editedList) return;
    const newItems = [...editedList.grocery_items];
    newItems[itemIndex] = { ...newItems[itemIndex], quantity };
    setEditedList({ ...editedList, grocery_items: newItems });
  };

  const updateItemUnit = (itemIndex: number, unit: string) => {
    if (!editedList) return;
    const newItems = [...editedList.grocery_items];
    newItems[itemIndex] = { ...newItems[itemIndex], unit };
    setEditedList({ ...editedList, grocery_items: newItems });
  };

  const updateItemName = (itemIndex: number, name: string) => {
    if (!editedList) return;
    const newItems = [...editedList.grocery_items];
    newItems[itemIndex] = { ...newItems[itemIndex], name };
    setEditedList({ ...editedList, grocery_items: newItems });
  };

  const saveChanges = async () => {
    if (!editedList) return;

    setSaving(true);
    try {
      const response = await fetch('/api/grocery-lists', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId: editedList.id,
          name: editedList.name,
          items: editedList.grocery_items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            displayQuantity: item.displayQuantity
          }))
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Grocery list updated successfully!');
        setEditingList(null);
        setEditedList(null);
        fetchLists(); // Refresh the lists
      } else {
        alert('Failed to update grocery list: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating grocery list:', error);
      alert('Failed to update grocery list');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this grocery list? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/grocery-lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Check if there's any response body before trying to parse JSON
        const contentType = response.headers.get('content-type');
        let result = null;
        
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text();
          if (text) {
            result = JSON.parse(text);
          }
        }
        
        // Remove from local state
        setLists(lists.filter(list => list.id !== listId));
        setEditingList(null);
        setEditedList(null);
        alert('Grocery list deleted successfully!');
      } else {
        // Try to get error message, but handle empty responses
        let errorMessage = 'Failed to delete grocery list';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting grocery list:', error);
      alert('Failed to delete grocery list. Please try again.');
    }
  };

  const handleExport = (list: GroceryList, format: string) => {
    switch (format) {
      case 'txt':
        exportTxt(list.grocery_items, list.name);
        break;
      case 'pdf':
        exportPdf(list.grocery_items, list.name);
        break;
      case 'docx':
        exportDocx(list.grocery_items, list.name);
        break;
      case 'html':
        exportHtml(list.grocery_items, list.name);
        break;
      case 'excel':
        exportExcel(list.grocery_items, list.name);
        break;
      case 'notes':
        exportToNotes(list.grocery_items, list.name);
        break;
    }
    setShowExportMenu(null);
  };

  const exportPdf = (items: GroceryItem[], listName: string) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(listName, 20, 30);
    
    // Underline
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Items
    doc.setFontSize(12);
    let yPosition = 50;
    
    items.forEach((item) => {
      const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
      const unit = item.unit ? ` ${item.unit}` : '';
      const text = `• ${quantity}${unit} ${item.name}`;
      
      doc.text(text, 20, yPosition);
      yPosition += 8;
      
      // Add new page if needed
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });
    
    // Footer
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Total items: ${items.length}`, 20, yPosition);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition + 8);
    
    // Save
    doc.save(`${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const exportDocx = async (items: GroceryItem[], listName: string) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: listName,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "",
          }),
          ...items.map((item) => {
            const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
            const unit = item.unit ? ` ${item.unit}` : '';
            return new Paragraph({
              children: [
                new TextRun(`• ${quantity}${unit} ${item.name}`)
              ],
            });
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun(`Total items: ${items.length}`)
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
    saveAs(blob, `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
  };

  const exportHtml = (items: GroceryItem[], listName: string) => {
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${listName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; }
          .item { margin: 5px 0; }
          .footer { margin-top: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>${listName}</h1>
        <div class="items">
    `;
    
    items.forEach((item) => {
      const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
      const unit = item.unit ? ` ${item.unit}` : '';
      content += `<div class="item">• ${quantity}${unit} ${item.name}</div>\n`;
    });
    
    content += `
        </div>
        <div class="footer">
          <p>Total items: ${items.length}</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExcel = (items: GroceryItem[], listName: string) => {
    // Create CSV content (Excel can open CSV files)
    let content = `Item,Quantity,Unit\n`;
    items.forEach(item => {
      const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
      content += `"${item.name}","${quantity}","${item.unit}"\n`;
    });
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToNotes = (items: GroceryItem[], listName: string) => {
    let content = `${listName}\n${'='.repeat(listName.length)}\n\n`;
    items.forEach((item) => {
      const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
      const unit = item.unit ? ` ${item.unit}` : '';
      content += `• ${quantity}${unit} ${item.name}\n`;
    });
    content += `\nTotal items: ${items.length}\nGenerated on: ${new Date().toLocaleDateString()}`;
    
    console.log('Content to export:', content);
    console.log('User agent:', navigator.userAgent);
    
    // Check if we're on iOS/macOS
    const isAppleDevice = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isMac = /Mac/.test(navigator.userAgent) && !isIOS;
    
    console.log('Device detection:', { isAppleDevice, isIOS, isMac });
    
    if (isAppleDevice) {
      // Copy to clipboard first
      navigator.clipboard.writeText(content).then(() => {
        console.log('Content copied to clipboard successfully');
        
        if (isMac) {
          // On macOS, the notes:// URL scheme just opens the app
          // So we'll open Notes and tell the user to paste
          try {
            window.open('notes://', '_blank');
            setTimeout(() => {
              alert('Notes app opened! Your grocery list is copied to clipboard - just paste it (Cmd+V) to create a new note.');
            }, 500);
          } catch (error) {
            console.error('Failed to open Notes app:', error);
            alert('Your grocery list has been copied to clipboard! Open Notes app and paste (Cmd+V) to create a new note.');
          }
        } else {
          // On iOS, try the URL scheme with content (this might work better on iOS)
          const encodedContent = encodeURIComponent(content);
          const notesUrl = `notes://new?body=${encodedContent}`;
          
          try {
            window.location.href = notesUrl;
            setTimeout(() => {
              alert('Attempted to create new note. If it didn\'t work, the content is copied to your clipboard!');
            }, 1000);
          } catch (error) {
            console.error('Failed to open Notes app:', error);
            alert('Could not open Notes app, but the content has been copied to your clipboard!');
          }
        }
        
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try again or copy the text manually.');
      });
      
    } else {
      console.log('Not an Apple device, using clipboard only');
      navigator.clipboard.writeText(content).then(() => {
        alert('Grocery list copied to clipboard! You can paste it into your Notes app.');
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy to clipboard. Please try again.');
      });
    }
  };

  const copyToClipboard = (items: GroceryItem[], listName: string) => {
    let content = `${listName}\n${'='.repeat(listName.length)}\n\n`;
    items.forEach((item) => {
      const quantity = item.displayQuantity || (item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3));
      const unit = item.unit ? ` ${item.unit}` : '';
      content += `• ${quantity}${unit} ${item.name}\n`;
    });
    content += `\nTotal items: ${items.length}\nGenerated on: ${new Date().toLocaleDateString()}`;
    
    navigator.clipboard.writeText(content).then(() => {
      alert('Grocery list copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please try again.');
    });
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

  const handleDeleteItem = (itemIndex: number) => {
    if (!editedList) return;
    
    const newItems = editedList.grocery_items.filter((_, i) => i !== itemIndex);
    setEditedList({
      ...editedList,
      grocery_items: newItems
    });
    
    // Clear all delete confirmations after deletion
    setItemsToDelete(new Set());
  };

  const toggleDeleteConfirmation = (itemIndex: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the click outside handler from firing
    if (!editedList) return;
    
    const item = editedList.grocery_items[itemIndex];
    const itemKey = `${editingList}-${itemIndex}-${item.name}`; // Use unique key
    setItemsToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.clear(); // Clear all other confirmations
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Add safety check before rendering
  if (loading) {
    return <div className="text-center py-8">Loading saved lists...</div>;
  }

  // Ensure lists is always an array before using .map()
  const safeListsArray = Array.isArray(lists) ? lists : [];

  if (safeListsArray.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-[#1e1f26] border border-white/10 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-white">Saved Grocery Lists</h2>
        <p className="text-white/70">No saved grocery lists yet. Create a recipe to get started!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-[#1e1f26] border border-white/10 rounded-lg shadow-md p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Saved Grocery Lists</h2>
      </div>
      
      <div className="space-y-4">
        {safeListsArray.map((list) => {
          const isEditing = editingList === list.id;
          const displayList = isEditing ? editedList! : list;
          
          return (
            <div key={list.id} className="border border-white/10 rounded-lg">
              <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayList.name}
                        onChange={(e) => updateListName(e.target.value)}
                        className="font-semibold text-white border border-white/20 rounded px-2 py-1 mr-2 bg-[#14151a]"
                      />
                    ) : (
                      <button
                        onClick={() => handleListClick(list.id)}
                        className="text-left hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#FF3A25] rounded w-full p-2"
                      >
                        <h3 className="font-semibold text-white">{list.name}</h3>
                        <p className="text-sm text-white/70">
                          {list.grocery_items.length} items • {formatDate(list.created_at)}
                        </p>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveChanges}
                          disabled={saving}
                          className="px-3 py-1 bg-[#FF3A25] text-white rounded text-sm hover:bg-[#FF3A25]/90 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(list.id)}
                          className="px-3 py-1 bg-[#FF3A25] text-white rounded text-sm hover:bg-[#FF3A25]/90"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(list)}
                          className="px-3 py-1 bg-[#FF3A25] text-white rounded text-sm hover:bg-[#FF3A25]/90"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => copyToClipboard(list.grocery_items, list.name)}
                          className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowExportMenu(showExportMenu === list.id ? null : list.id)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            title="Export options"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          
                          {showExportMenu === list.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#1e1f26] border border-white/10 rounded-md shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => handleExport(list, 'txt')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Export as TXT
                                </button>
                                <button
                                  onClick={() => handleExport(list, 'html')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Export as HTML
                                </button>
                                <button
                                  onClick={() => handleExport(list, 'excel')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Export as Excel (CSV)
                                </button>
                                <button
                                  onClick={() => handleExport(list, 'pdf')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Export as PDF
                                </button>
                                <button
                                  onClick={() => handleExport(list, 'docx')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Export as DOCX
                                </button>
                                <button
                                  onClick={() => handleExport(list, 'notes')}
                                  className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                                >
                                  Send to Notes App
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {(expandedList === list.id || isEditing) && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-200 pt-4">
                    {isEditing ? (
                      // Editable table like GroceryList component
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left py-3 px-2 font-semibold text-white">Item</th>
                              <th className="text-left py-3 px-2 font-semibold text-white">Quantity</th>
                              <th className="text-left py-3 px-2 font-semibold text-white">Unit</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayList.grocery_items.map((item, itemIndex) => (
                              <tr key={item.id} className="border-b border-white/5">
                                <td className="py-3 px-2">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItemName(itemIndex, e.target.value)}
                                    className="w-full px-2 py-1 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3A25] bg-[#14151a] text-white"
                                  />
                                </td>
                                <td className="py-3 px-2">
                                  <input
                                    type="text"
                                    value={item.displayQuantity ?? item.quantity.toString()}
                                    onChange={(e) => updateItem(itemIndex, 'displayQuantity', e.target.value)}
                                    className="w-20 px-2 py-1 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3A25] bg-[#14151a] text-white"
                                  />
                                </td>
                                <td className="py-3 px-2">
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => updateItemUnit(itemIndex, e.target.value)}
                                    className="w-24 px-2 py-1 border border-white/20 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3A25] bg-[#14151a] text-white"
                                  />
                                </td>
                                <td className="py-3 px-2">
                                  {itemsToDelete.has(`${editingList}-${itemIndex}-${item.name}`) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(itemIndex);
                                      }}
                                      className="w-5 h-5 bg-[#FF3A25] text-white rounded-full flex items-center justify-center hover:bg-[#FF3A25]/90 transition-colors text-xs font-bold"
                                      title="Delete item"
                                    >
                                      ✕
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => toggleDeleteConfirmation(itemIndex, e)}
                                      className="w-5 h-5 bg-white/10 text-white/70 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-xs font-bold"
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
                    ) : (
                      // Read-only view
                      <div className="grid gap-2">
                        {displayList.grocery_items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center justify-between p-2 bg-white/5 rounded">
                            {/* Item content - takes up most space */}
                            <div className="flex-1">
                              <span className="text-sm text-white/80">
                                {item.displayQuantity || item.quantity} {item.unit} {item.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

SavedLists.displayName = 'SavedLists';

export default SavedLists;