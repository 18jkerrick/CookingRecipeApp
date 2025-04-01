import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';

export const exportAsText = async (recipe) => {
  try {
    const title = recipe.title || 'Recipe';
    let textContent = `${title}\n\nGrocery List:\n`;
    
    // Check if ingredients is an array and has the expected structure
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach(item => {
        if (typeof item === 'string') {
          textContent += `- ${item}\n`;
        } else if (item && typeof item === 'object') {
          textContent += `- ${item.name || 'Unknown'}: ${item.amount || ''}\n`;
        }
      });
    } else {
      textContent += '- No ingredients found\n';
    }
    
    await Share.share({
      message: textContent,
      title: 'Grocery List',
    });
    
    return true;
  } catch (error) {
    console.error('Error sharing text:', error);
    return false;
  }
};

export const exportAsHTML = async (recipe) => {
  try {
    const title = recipe.title || 'Recipe';
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Grocery List</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4CAF50; }
          ul { list-style-type: none; padding: 0; }
          li { padding: 8px 0; border-bottom: 1px solid #eee; }
          .amount { color: #666; float: right; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <h2>Grocery List</h2>
        <ul>
    `;
    
    recipe.ingredients.forEach(item => {
      htmlContent += `<li>${item.name} <span class="amount">${item.amount}</span></li>`;
    });
    
    htmlContent += `
        </ul>
      </body>
      </html>
    `;
    
    const fileUri = `${FileSystem.documentDirectory}grocery-list.html`;
    await FileSystem.writeAsStringAsync(fileUri, htmlContent);
    
    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(fileUri);
    } else {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Share Grocery List',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting HTML:', error);
    return false;
  }
};

export const exportAsExcel = async (recipe) => {
  try {
    const title = recipe.title || 'Recipe';
    
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Grocery List');
    
    // Add headers
    worksheet.columns = [
      { header: 'Ingredient', key: 'ingredient', width: 30 },
      { header: 'Amount', key: 'amount', width: 20 }
    ];
    
    // Add rows
    recipe.ingredients.forEach(item => {
      worksheet.addRow({
        ingredient: item.name,
        amount: item.amount
      });
    });
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    
    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Convert buffer to base64
    const base64 = Buffer.from(buffer).toString('base64');
    
    // Save to file
    const fileUri = `${FileSystem.documentDirectory}${title.replace(/\s+/g, '-')}-grocery-list.xlsx`;
    
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share Grocery List',
    });
    
    return true;
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return false;
  }
};