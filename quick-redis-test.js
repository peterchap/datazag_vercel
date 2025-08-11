// Quick Redis connectivity test
const REDIS_API_URL = 'https://redis-api-705890714749.europe-west2.run.app';
const INTERNAL_TOKEN = 'BG-b6WuywK7NWFoUP';

async function quickRedisTest() {
  console.log('🔍 Quick Redis API Test\n');
  
  // Test the endpoints we found in the GitHub repo
  const tests = [
    {
      name: 'Health Check',
      url: `${REDIS_API_URL}/health`,
      method: 'GET'
    },
    {
      name: 'Redis Ping',
      url: `${REDIS_API_URL}/redis/ping`,
      method: 'GET'
    },
    {
      name: 'Redis Sync Status',
      url: `${REDIS_API_URL}/redis/sync-status`,
      method: 'GET'
    }
  ];
  
  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'X-Internal-Token': INTERNAL_TOKEN
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('   ✅ Response:', JSON.stringify(data, null, 2));
        } catch (e) {
          const text = await response.text();
          console.log('   ✅ Response (text):', text);
        }
      } else {
        const text = await response.text();
        console.log('   ❌ Error:', text);
      }
      
    } catch (error) {
      console.log('   ❌ Exception:', error.message);
    }
    
    console.log(''); // Empty line for readability
  }
}

quickRedisTest().catch(console.error);
