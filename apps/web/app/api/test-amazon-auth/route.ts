import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID;
  const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
  const AMAZON_REFRESH_TOKEN = process.env.AMAZON_REFRESH_TOKEN;
  
  // Check credentials
  const credentialCheck = {
    hasClientId: !!AMAZON_CLIENT_ID,
    clientIdLength: AMAZON_CLIENT_ID?.length || 0,
    clientIdPrefix: AMAZON_CLIENT_ID?.substring(0, 20) + '...',
    
    hasClientSecret: !!AMAZON_CLIENT_SECRET,
    clientSecretLength: AMAZON_CLIENT_SECRET?.length || 0,
    clientSecretPrefix: AMAZON_CLIENT_SECRET?.substring(0, 20) + '...',
    
    hasRefreshToken: !!AMAZON_REFRESH_TOKEN,
    refreshTokenLength: AMAZON_REFRESH_TOKEN?.length || 0,
    refreshTokenPrefix: AMAZON_REFRESH_TOKEN?.substring(0, 20) + '...',
    refreshTokenSuffix: AMAZON_REFRESH_TOKEN ? '...' + AMAZON_REFRESH_TOKEN.substring(AMAZON_REFRESH_TOKEN.length - 10) : 'N/A',
    
    solutionId: process.env.AMAZON_MARKETPLACE_ID
  };
  
  // Try to get access token
  let tokenResponse = null;
  let tokenError = null;
  
  if (AMAZON_CLIENT_ID && AMAZON_CLIENT_SECRET && AMAZON_REFRESH_TOKEN) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: AMAZON_REFRESH_TOKEN,
        client_id: AMAZON_CLIENT_ID,
        client_secret: AMAZON_CLIENT_SECRET
      });
      
      const response = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      const responseText = await response.text();
      
      tokenResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      };
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          tokenResponse.parsedBody = data;
          tokenResponse.success = true;
          tokenResponse.hasAccessToken = !!data.access_token;
        } catch (e) {
          tokenResponse.parseError = 'Failed to parse JSON response';
        }
      }
      
    } catch (error) {
      tokenError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      };
    }
  }
  
  return NextResponse.json({
    credentialCheck,
    tokenResponse,
    tokenError,
    timestamp: new Date().toISOString(),
    instructions: {
      refreshTokenFormat: 'Amazon refresh tokens typically start with "Atzr|" or are 200+ characters long',
      checkYourToken: 'Make sure you copied the complete refresh token from Amazon',
      solutionId: 'The solution ID should be used for app identification, not as marketplace ID'
    }
  }, { status: 200 });
}