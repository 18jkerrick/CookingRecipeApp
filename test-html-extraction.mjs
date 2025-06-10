import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔄 Loading page...');
  await page.goto('https://www.indianhealthyrecipes.com/butter-chicken/', { 
    waitUntil: 'networkidle0' 
  });
  
  const content = await page.content();
  console.log(`📄 Page content length: ${content.length}`);
  
  // Clean HTML tags
  const cleanedContent = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  console.log(`📄 Cleaned content length: ${cleanedContent.length}`);
  
  // Find numbered steps
  const numberedSteps = cleanedContent.match(/\d+\.\s+[A-Z][^]*?(?=(?:\d+\.|$))/g);
  
  if (numberedSteps) {
    console.log(`\n🔍 Found ${numberedSteps.length} numbered steps`);
    
    // Filter and clean steps
    const cleanedSteps = numberedSteps
      .map((step, index) => {
        const cleaned = step
          .replace(/^\s*\d+\.\s*/, '') // Remove numbering
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        return { index: index + 1, content: cleaned };
      })
      .filter(step => {
        // Filter out steps that are too short, too long, or contain JSON/code
        return step.content.length > 15 && 
               step.content.length < 800 && 
               !step.content.includes('"@type"') && 
               !step.content.includes('{"') &&
               /[a-z]/.test(step.content); // Must contain lowercase letters (not just numbers/symbols)
      });
    
    console.log(`\n📝 After filtering: ${cleanedSteps.length} clean recipe steps`);
    
    cleanedSteps.slice(0, 10).forEach(step => {
      console.log(`${step.index}. ${step.content.substring(0, 100)}...`);
    });
    
    if (cleanedSteps.length > 10) {
      console.log('\n... (showing first 10 steps)');
    }
  } else {
    console.log('No numbered steps found');
  }
  
  await browser.close();
})(); 