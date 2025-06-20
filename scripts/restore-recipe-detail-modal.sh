#!/bin/bash

# Script to restore RecipeDetailModal.tsx from git

echo "Restoring RecipeDetailModal.tsx from git..."

# First, check if the file exists in git history
if git ls-tree HEAD -- components/RecipeDetailModal.tsx > /dev/null 2>&1; then
    # Restore the file from the last commit
    git checkout HEAD -- components/RecipeDetailModal.tsx
    echo "✅ RecipeDetailModal.tsx restored successfully!"
    
    # Show the first few lines to confirm
    echo "First 20 lines of restored file:"
    head -20 components/RecipeDetailModal.tsx
else
    echo "❌ File not found in current HEAD. Checking recent commits..."
    
    # Find the last commit that had this file
    LAST_COMMIT=$(git log --oneline -n 1 --pretty=format:"%H" -- components/RecipeDetailModal.tsx)
    
    if [ ! -z "$LAST_COMMIT" ]; then
        echo "Found file in commit: $LAST_COMMIT"
        git checkout $LAST_COMMIT -- components/RecipeDetailModal.tsx
        echo "✅ RecipeDetailModal.tsx restored from commit $LAST_COMMIT"
    else
        echo "❌ Could not find RecipeDetailModal.tsx in git history"
    fi
fi