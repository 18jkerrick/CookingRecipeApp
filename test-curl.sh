#!/bin/bash

# Test Instacart Partner API

API_KEY="keys.aZEZFBJsFfTx61vy6ufOMz31lcVPfAzjnu6QGesTkGU"
BASE_URL="https://connect.dev.instacart.tools/idp/v1"

echo "Testing Instacart Partner API"
echo "API Key: ${API_KEY:0:20}..."
echo "Base URL: $BASE_URL"

# Test 1: Retailers API
echo -e "\n=== Testing Retailers API ==="
curl -v --request GET \
  --url "${BASE_URL}/retailers?postal_code=94105&country_code=US" \
  --header "Accept: application/json" \
  --header "Authorization: Bearer ${API_KEY}"

echo -e "\n\n=== Testing Recipe API ==="
# Test 2: Recipe API
curl -v --request POST \
  --url "${BASE_URL}/products/recipe" \
  --header "Accept: application/json" \
  --header "Authorization: Bearer ${API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "Test Grocery List",
    "ingredients": [
      {"name": "chicken breast", "measurements": ["2 lbs"]},
      {"name": "broccoli", "measurements": ["1 lb"]}
    ],
    "instructions": ["Add all items to your cart and proceed to checkout."],
    "landing_page_configuration": {
      "partner_linkback_url": "https://test-app.com",
      "enable_pantry_items": true
    }
  }'