import { getPinterestSourceUrl, isLikelyCookingWebsite } from './lib/parser/pinterest.js';

async function testPinterest() {
  // Test with a Pinterest recipe URL (you'll need to replace with a real one)
  const testUrl = 'https://www.pinterest.com/pin/123456789/'; // Replace with actual Pinterest recipe URL
  
  try {
    console.log('🧪 Testing Pinterest URL extraction...');
    console.log(`📌 Test URL: ${testUrl}`);
    
    const result = await getPinterestSourceUrl(testUrl);
    console.log('\n📊 Results:');
    console.log(`   Source URL: ${result.sourceUrl || 'not found'}`);
    console.log(`   Title: ${result.title || 'not found'}`);
    console.log(`   Description: ${result.description || 'not found'}`);
    
    if (result.sourceUrl) {
      const isCooking = isLikelyCookingWebsite(result.sourceUrl);
      console.log(`   Is cooking website: ${isCooking}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPinterest(); 