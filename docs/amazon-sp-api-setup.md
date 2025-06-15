# Amazon SP-API Setup Guide

## Prerequisites
1. Amazon Developer account
2. Registered SP-API application
3. Proper IAM permissions

## Getting Your Refresh Token

The refresh token you need is different from the one shown in the Amazon Developer Console. You need to authorize your app and get a refresh token through the OAuth flow.

### Method 1: Using Amazon's Authorization Flow

1. **Generate Authorization URL**:
   ```
   https://sellercentral.amazon.com/apps/authorize/consent?application_id=YOUR_APP_ID&state=xyz&version=beta
   ```
   Replace `YOUR_APP_ID` with your actual application ID.

2. **Authorize the App**:
   - Log in to your Amazon account
   - Grant the necessary permissions
   - You'll be redirected with an authorization code

3. **Exchange Code for Tokens**:
   ```bash
   curl -X POST https://api.amazon.com/auth/o2/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_AUTH_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET"
   ```

### Method 2: For Sandbox Testing

If you're using the SP-API sandbox:

1. Check if Amazon provided a sandbox refresh token in your app settings
2. Make sure you're using the sandbox endpoints
3. Verify your app has the correct permissions (catalog items, etc.)

## Common Issues

1. **Invalid Grant Error**: 
   - The refresh token is incorrect or expired
   - The app doesn't have the required permissions
   - You're mixing production and sandbox credentials

2. **Token Format**:
   - Refresh tokens typically start with `Atzr|`
   - They're usually 200-400 characters long
   - Don't include any extra characters or the client secret

## Testing Your Setup

Use the test endpoint to verify your credentials:
```
http://localhost:3000/api/test-amazon-auth
```

This will show you:
- Whether your credentials are present
- The token exchange response
- Any errors in the authentication process

## Required Permissions

For grocery/catalog functionality, your app needs:
- `catalog:read` - To search for products
- `pricing:read` - To get pricing information (optional)

## Environment Variables

```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxx
AMAZON_REFRESH_TOKEN=Atzr|xxx
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace
```