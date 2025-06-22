'use client';

import { useState } from 'react';
import { useNavigationPersistence } from '../../hooks/useNavigationPersistence';

function RetailerCard({ retailer }: { retailer: any }) {
  const [creating, setCreating] = useState(false);
  const [urls, setUrls] = useState<{ shoppingList?: string; recipe?: string }>({});
  const [error, setError] = useState('');

  const createPages = async () => {
    setCreating(true);
    setError('');
    
    try {
      // Create shopping list and recipe for this retailer
      const response = await fetch('/api/test-retailers/create-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          retailerKey: retailer.retailer_key,
          retailerName: retailer.name 
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setUrls({
          shoppingList: data.shoppingListUrl,
          recipe: data.recipeUrl
        });
      }
    } catch (err) {
      setError('Failed to create pages');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-medium">{retailer.name}</h3>
          <p className="text-sm text-gray-600">Key: {retailer.retailer_key}</p>
        </div>
        <div className="text-right">
          {retailer.retailer_logo_url && (
            <img 
              src={retailer.retailer_logo_url} 
              alt={retailer.name}
              className="h-8 w-auto"
            />
          )}
        </div>
      </div>

      {!urls.shoppingList && !urls.recipe && (
        <button
          onClick={createPages}
          disabled={creating}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {creating ? 'Creating Pages...' : 'Create Shopping List & Recipe'}
        </button>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mt-2">
          {error}
        </div>
      )}

      {(urls.shoppingList || urls.recipe) && (
        <div className="mt-4 space-y-2">
          {urls.shoppingList && (
            <div>
              <a
                href={urls.shoppingList}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
              >
                Open Shopping List →
              </a>
            </div>
          )}
          {urls.recipe && (
            <div>
              <a
                href={urls.recipe}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-center"
              >
                Open Recipe →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestRetailersPage() {
  useNavigationPersistence();
  
  const [zipCode, setZipCode] = useState('94109');
  const [retailers, setRetailers] = useState([]);
  const [retailerTests, setRetailerTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRetailers = async (testViability = false) => {
    if (!zipCode) {
      setError('Please enter a zip code');
      return;
    }

    setLoading(true);
    setError('');
    setRetailers([]);
    setRetailerTests([]);

    try {
      const response = await fetch('/api/test-retailers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zipCode, testViability }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        if (testViability) {
          setRetailerTests(data.retailerTests || []);
        } else {
          setRetailers(data.retailers || []);
        }
      }
    } catch (err) {
      setError('Failed to get retailers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Retailer API</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Enter Zip Code</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="94109"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => getRetailers(false)}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get All Retailers'}
          </button>
          <button
            onClick={() => getRetailers(true)}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Get Viable Only'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {retailers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Retailers ({retailers.length})</h2>
          <div className="grid gap-4">
            {retailers.map((retailer: any, index: number) => (
              <RetailerCard key={index} retailer={retailer} />
            ))}
          </div>
        </div>
      )}

      {retailerTests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Retailer Test Results ({retailerTests.length})</h2>
          <div className="space-y-6">
            {retailerTests.map((test: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="font-medium text-lg">{test.retailer}</h3>
                  <p className="text-sm text-gray-600">Key: {test.retailerKey}</p>
                  <p className="text-sm text-gray-600">URL: <a href={test.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{test.url}</a></p>
                  <p className="text-sm text-gray-600">Status: {test.status}</p>
                  {test.htmlLength && <p className="text-sm text-gray-600">HTML Length: {test.htmlLength} characters</p>}
                  
                  {test.parseResult && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Parsing Results:</h4>
                      <div className="text-sm space-y-1">
                        <p>Retailer Available: <span className={test.parseResult.retailerAvailable ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {test.parseResult.retailerAvailable ? 'YES' : 'NO'}
                        </span></p>
                        <p>Retailer Name: <span className="font-medium">{test.parseResult.retailerName || 'None'}</span></p>
                        <p>Total Ingredients: <span className="font-medium">{test.parseResult.totalIngredients}</span></p>
                        <p>Data Found: <span className="font-medium">{test.parseResult.dataFound ? 'YES' : 'NO (using heuristics)'}</span></p>
                      </div>
                    </div>
                  )}
                </div>
                
                {test.error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-4">
                    Error: {test.error}
                  </div>
                )}
                
                {test.fullHtml && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Full HTML Content ({test.htmlLength} characters):</h4>
                    <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {test.fullHtml}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && retailers.length === 0 && retailerTests.length === 0 && !error && (
        <div className="text-center text-gray-500 py-12">
          Enter a zip code above to get retailers
        </div>
      )}
    </div>
  );
}