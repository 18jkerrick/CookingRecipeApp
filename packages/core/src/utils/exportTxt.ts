interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

export function exportTxt(items: GroceryItem[], listName: string = 'Grocery List'): void {
  // Create the text content
  let content = `${listName}\n`;
  content += '='.repeat(listName.length) + '\n\n';
  
  // Add each item with bullet points
  items.forEach((item) => {
    const quantity = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(3);
    const unit = item.unit ? ` ${item.unit}` : '';
    content += `• ${quantity}${unit} ${item.name}\n`;
  });
  
  // Add footer
  content += `\nTotal items: ${items.length}\n`;
  content += `Generated on: ${new Date().toLocaleDateString()}\n`;
  
  // Create blob and download
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  // Create temporary download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
