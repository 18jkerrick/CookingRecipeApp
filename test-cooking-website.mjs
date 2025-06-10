import fetch from 'node-fetch';

const TEST_URLS = [
  'https://www.indianhealthyrecipes.com/butter-chicken/',
  'https://sugarspunrun.com/nutella-cookies/',
  'https://www.spendwithpennies.com/bolognese-sauce/'
];

async function testCookingWebsite(url) {
  console.log(`\n🧪 Testing: ${url}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/parse-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: url,
        mode: 'fast'  // Use fast mode for quicker testing
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCCESS`);
      console.log(`📝 Title: "${data.title}"`);
      console.log(`🖼️ Thumbnail: ${data.thumbnail ? 'Found' : 'Not found'}`);
      console.log(`🥗 Ingredients: ${data.ingredients.length} found`);
      console.log(`📋 Instructions: ${data.instructions.length} found`);
    } else {
      console.log(`❌ FAILED: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Cooking Website Parser with Title and Thumbnail Extraction');
  
  for (const url of TEST_URLS) {
    await testCookingWebsite(url);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
  }
  
  console.log('\n✅ Testing complete!');
}

runTests().catch(console.error); 