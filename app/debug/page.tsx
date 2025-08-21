// Simple test page to debug API key creation
'use client'

export const dynamic = 'force-dynamic'; // debug page uses runtime fetch

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApiKeys = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      // Test 1: GET /api/api-keys
      console.log('Testing GET /api/api-keys');
      const getResponse = await fetch('/api/api-keys');
      console.log('GET response status:', getResponse.status);
      
      if (getResponse.ok) {
        const getData = await getResponse.json();
        console.log('GET data:', getData);
        setResult(prev => prev + '\n✅ GET Success: ' + JSON.stringify(getData));
      } else {
        const getError = await getResponse.text();
        console.log('GET error:', getError);
        setResult(prev => prev + '\n❌ GET Error: ' + getError);
      }
      
      // Test 2: POST /api/api-keys
      console.log('Testing POST /api/api-keys');
      const postResponse = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Key from Debug Page' })
      });
      
      console.log('POST response status:', postResponse.status);
      
      if (postResponse.ok) {
        const postData = await postResponse.json();
        console.log('POST data:', postData);
        setResult(prev => prev + '\n✅ POST Success: ' + JSON.stringify(postData));
      } else {
        const postError = await postResponse.text();
        console.log('POST error:', postError);
        setResult(prev => prev + '\n❌ POST Error: ' + postError);
      }
      
    } catch (error: any) {
      console.error('Test error:', error);
      setResult(prev => prev + '\n❌ Exception: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Keys Debug Page</h1>
      
      <button 
        onClick={testApiKeys}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Key Endpoints'}
      </button>
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Results:</h2>
        <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
          {result || 'Click the button to test'}
        </pre>
      </div>
    </div>
  );
}
