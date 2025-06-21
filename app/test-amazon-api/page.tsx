'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function TestAmazonAPI() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [authCheck, setAuthCheck] = useState<any>(null)
  
  const testItems = [
    { name: 'organic apples', quantity: 2, unit: 'lb' },
    { name: 'whole milk', quantity: 1, unit: 'gallon' },
    { name: 'bread', quantity: 1, unit: 'loaf' },
    { name: 'eggs', quantity: 1, unit: 'dozen' },
    { name: 'bananas', quantity: 5, unit: 'count' }
  ]
  
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/test-amazon-auth')
      const data = await response.json()
      setAuthCheck(data)
    } catch (err) {
      console.error('Auth check failed:', err)
    }
  }
  
  const runTest = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    await checkAuth()
    
    try {
      const response = await fetch('/api/grocery-delivery/amazon-fresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: testItems,
          zipCode: '10001' // NYC ZIP for testing
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'API request failed')
        setResults(data)
      } else {
        setResults(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-[#14151a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Amazon SP-API Test</h1>
        <p className="text-yellow-400 mb-8">🔧 Currently using mock/sandbox data while awaiting API approval</p>
        
        {authCheck && authCheck.tokenResponse?.status === 400 && (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 mb-8">
            <h3 className="text-yellow-400 font-semibold mb-2">Authentication Issue</h3>
            <p className="text-white/70 mb-4">
              Your refresh token appears to be invalid. This usually means:
            </p>
            <ul className="list-disc list-inside text-white/70 space-y-1 mb-4">
              <li>The refresh token wasn't obtained through the proper OAuth flow</li>
              <li>The app permissions weren't granted correctly</li>
              <li>You're using sandbox credentials but haven't been approved for sandbox access</li>
            </ul>
            <p className="text-sm text-white/60">
              To fix this, you need to authorize your app through Amazon's OAuth flow.
              See <code className="bg-black/30 px-2 py-1 rounded">/docs/amazon-sp-api-setup.md</code> for instructions.
            </p>
          </div>
        )}
        
        <div className="bg-[#1e1f26] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Items</h2>
          <div className="space-y-2">
            {testItems.map((item, index) => (
              <div key={index} className="text-sm text-white/70">
                • {item.quantity} {item.unit} {item.name}
              </div>
            ))}
          </div>
          
          <button
            onClick={runTest}
            disabled={loading}
            className="mt-6 px-6 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 mb-8">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-white/70">{error}</p>
            {results && (
              <div className="mt-4">
                {results.details && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-400 mb-2">Error Details:</h4>
                    <p className="text-sm text-white/70">{results.details}</p>
                  </div>
                )}
                {results.debug && (
                  <div className="mb-4 p-3 bg-black/30 rounded">
                    <h4 className="text-sm font-medium text-white/80 mb-2">Debug Info:</h4>
                    <div className="text-xs text-white/60 space-y-1">
                      <p>Has Client ID: {results.debug.hasClientId ? '✓' : '✗'}</p>
                      <p>Has Client Secret: {results.debug.hasClientSecret ? '✓' : '✗'}</p>
                      <p>Has Refresh Token: {results.debug.hasRefreshToken ? '✓' : '✗'}</p>
                      <p>Refresh Token Length: {results.debug.refreshTokenLength || 'N/A'}</p>
                      <p>Marketplace ID: {results.debug.marketplaceId || 'N/A'}</p>
                    </div>
                  </div>
                )}
                <details>
                  <summary className="cursor-pointer text-xs text-white/50">Full Response</summary>
                  <pre className="mt-2 text-xs overflow-x-auto p-2 bg-black/30 rounded">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500 rounded">
              <p className="text-sm text-yellow-400">Need help?</p>
              <p className="text-sm text-white/70 mt-1">
                Check the setup guide at <code className="bg-black/30 px-2 py-1 rounded">/docs/amazon-sp-api-setup.md</code>
              </p>
            </div>
          </div>
        )}
        
        {results && !error && (
          <div className="bg-[#1e1f26] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#FF9900]">Results</h3>
            
            {results.debug && (
              <div className="mb-6 p-4 bg-[#14151a] rounded">
                <h4 className="font-medium mb-2">Debug Info</h4>
                <div className="text-sm text-white/70 space-y-1">
                  <p>✓ Credentials Present: {results.debug.credentialsPresent ? 'Yes' : 'No'}</p>
                  <p>✓ Token Received: {results.debug.tokenReceived ? 'Yes' : 'No'}</p>
                  <p>✓ Marketplace ID: {results.debug.marketplaceId}</p>
                  <p>✓ Items Searched: {results.debug.itemCount}</p>
                  <p>✓ Matches Found: {results.debug.searchResultCount}/{results.debug.itemCount}</p>
                  <p>✓ Total Results: {results.debug.totalMatches}</p>
                  <p>✓ Mode: {results.debug.sandbox ? 'Sandbox (Mock Data)' : 'Production'}</p>
                  <p>✓ Timestamp: {new Date(results.debug.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
            
            {results.results && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Item Matches</h4>
                <div className="space-y-3">
                  {results.results.map((result: any, index: number) => (
                    <div key={index} className="p-4 bg-[#14151a] rounded">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{result.originalItem.name}</p>
                          {result.amazonMatch ? (
                            <div className="mt-1">
                              <p className="text-sm text-white/70">
                                {result.amazonMatch.brand && `${result.amazonMatch.brand} - `}
                                {result.amazonMatch.name}
                              </p>
                              <p className="text-sm text-[#FF9900] mt-1">
                                ${result.amazonMatch.price.toFixed(2)} 
                                {result.amazonMatch.salesRank && (
                                  <span className="text-white/50"> • Rank: #{result.amazonMatch.salesRank}</span>
                                )}
                              </p>
                              <p className="text-xs text-white/50 mt-1">
                                ASIN: {result.amazonMatch.asin} • {result.matchCount} matches found
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-red-400 mt-1">No match found</p>
                          )}
                        </div>
                        {result.amazonMatch?.image && (
                          <img 
                            src={result.amazonMatch.image} 
                            alt={result.amazonMatch.name}
                            className="w-16 h-16 object-cover rounded ml-4"
                          />
                        )}
                      </div>
                      <div className="text-right border-t border-white/10 pt-2">
                        <p className="text-sm">
                          {result.originalItem.quantity} {result.originalItem.unit} × ${result.amazonMatch?.price || 0} = 
                          <span className="font-medium ml-2">${result.subtotal.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {results.pricing && (
              <div className="mb-6 p-4 bg-[#14151a] rounded">
                <h4 className="font-medium mb-2">Pricing Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${results.pricing.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Tax:</span>
                    <span>${results.pricing.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span>${results.pricing.delivery}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2 border-t border-white/10">
                    <span>Total:</span>
                    <span>${results.pricing.total}</span>
                  </div>
                </div>
              </div>
            )}
            
            {results.cartUrl && (
              <div className="mt-6">
                <a
                  href={results.cartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9900] hover:bg-[#FF9900]/90 text-white font-medium rounded-lg transition-colors"
                >
                  Open in Amazon Fresh
                </a>
              </div>
            )}
            
            <details className="mt-8">
              <summary className="cursor-pointer text-sm text-white/50 hover:text-white/70">
                View Raw Response
              </summary>
              <pre className="mt-4 text-xs overflow-x-auto p-4 bg-[#14151a] rounded">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}