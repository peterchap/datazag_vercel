// Simple Redis API Explorer
const REDIS_API_URL = 'https://redis-api-705890714749.europe-west2.run.app';
const INTERNAL_TOKEN = 'BG-b6WuywK7NWFoUP';

async function exploreAPI() {
  console.log('🔍 Exploring Redis API...\n');
  
  // Test basic health/info endpoints
  const basicTests = [
    '/',
    '/health',
    '/info',
    '/redis',
    '/docs',
    '/api',
    '/v1'
  ];
  
  for (const path of basicTests) {
    console.log(`🧪 Testing: ${path}`);
    try {
      const response = await fetch(`${REDIS_API_URL}${path}`, {
        method: 'GET',
        headers: {
          'X-Internal-Token': INTERNAL_TOKEN
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok || response.status === 307) {
        try {
          const data = await response.json();
          console.log('   ✅ JSON Response:', JSON.stringify(data, null, 2));
        } catch (e) {
          const text = await response.text();
          console.log('   ✅ Text Response:', text.substring(0, 200));
        }
      }
      
    } catch (error) {
      console.log('   ❌ Exception:', error.message);
    }
    console.log('');
  }
}

exploreAPI().catch(console.error);
