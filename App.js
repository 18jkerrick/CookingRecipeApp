import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  Linking
} from 'react-native';
import { extractRecipeFromUrl, getPlatformFromUrl } from './services/recipeService';
import { exportAsText, exportAsHTML, exportAsExcel } from './services/exportService';

export default function App() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const handleExtractRecipe = async () => {
    if (!url) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Validate URL format
    if (!url.startsWith('http')) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    // Check if URL is from a supported platform
    const platform = getPlatformFromUrl(url);
    if (platform === 'unknown') {
      Alert.alert('Error', 'Unsupported platform. Please use TikTok, Instagram, or YouTube URLs.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const recipeData = await extractRecipeFromUrl(url);
      console.log('Recipe data received:', JSON.stringify({
        title: recipeData.title,
        ingredientsCount: recipeData.ingredients ? recipeData.ingredients.length : 0,
        ingredientsSample: recipeData.ingredients ? recipeData.ingredients.slice(0, 2) : [],
        instructionsCount: recipeData.instructions ? recipeData.instructions.length : 0
      }));
      setRecipe(recipeData);
    } catch (error) {
      console.error('Error extracting recipe:', error);
      setError('Failed to extract recipe. Please try another video.');
      Alert.alert('Error', 'Failed to extract recipe. Please try another video.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    setExportModalVisible(false);
    
    if (!recipe) return;
    
    try {
      let success = false;
      
      switch (type) {
        case 'text':
          success = await exportAsText(recipe);
          break;
        case 'html':
          success = await exportAsHTML(recipe);
          break;
        case 'excel':
          success = await exportAsExcel(recipe);
          break;
      }
      
      if (success) {
        Alert.alert('Success', 'Grocery list exported successfully!');
      } else {
        Alert.alert('Error', 'Failed to export grocery list');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during export');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recipe Extractor</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Paste TikTok, Instagram, or YouTube URL"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleExtractRecipe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Extract Recipe</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {recipe && (
        <View style={styles.resultContainer}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          
          {recipe.source && (
            <Text style={styles.sourceText}>
              Recipe extracted from: {recipe.source}
            </Text>
          )}
          
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <ScrollView style={styles.ingredientList}>
            {recipe.ingredients.map((item, index) => (
              <View key={index} style={styles.ingredientItem}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.ingredientAmount}>{item.amount}</Text>
              </View>
            ))}
          </ScrollView>
          
          {recipe.instructions && recipe.instructions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <ScrollView style={styles.instructionsList}>
                {recipe.instructions.map((step, index) => (
                  <View key={index} style={styles.instructionItem}>
                    <Text style={styles.instructionNumber}>{index + 1}.</Text>
                    <Text style={styles.instructionText}>{step}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => setExportModalVisible(true)}
          >
            <Text style={styles.buttonText}>Export Grocery List</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Export Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exportModalVisible}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Options</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleExport('text')}
            >
              <Text style={styles.modalButtonText}>Export as Text</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleExport('html')}
            >
              <Text style={styles.modalButtonText}>Export as HTML</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => handleExport('excel')}
            >
              <Text style={styles.modalButtonText}>Export as Excel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setExportModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center',
    color: '#4CAF50',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4CAF50',
  },
  sourceText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  ingredientList: {
    maxHeight: 150,
    marginBottom: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ingredientName: {
    fontSize: 16,
    flex: 3,
  },
  ingredientAmount: {
    fontSize: 16,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
  instructionsList: {
    maxHeight: 200,
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#4CAF50',
  },
  instructionText: {
    fontSize: 16,
    flex: 1,
  },
  exportButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
  },
}); 