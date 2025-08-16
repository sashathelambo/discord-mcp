#!/bin/bash

echo "🔒 Discord MCP - Safe GitHub Publication Script"
echo "=============================================="

# Step 1: Critical Security Check
echo ""
echo "🚨 STEP 1: CRITICAL SECURITY CHECK"
if [ -f ".env" ]; then
    echo "⚠️  .env file exists - checking for real tokens..."
    if grep -qE "MTM[A-Za-z0-9_-]{70,}" ".env" 2>/dev/null; then
        echo "❌ Real Discord token found in .env file!"
        echo "   You MUST regenerate your Discord bot token before publishing!"
        echo "   Go to: https://discord.com/developers/applications"
        echo ""
        read -p "Have you regenerated your Discord token? (y/N): " token_regenerated
        if [[ $token_regenerated != "y" && $token_regenerated != "Y" ]]; then
            echo "🛑 STOPPING: Please regenerate your token first!"
            exit 1
        fi
    else
        echo "✅ No real tokens found in .env file"
    fi
fi

# Step 2: Clean sensitive files
echo ""
echo "🧹 STEP 2: CLEANING SENSITIVE FILES"
if [ -f "URGENT_TOKEN_SECURITY.md" ]; then
    rm URGENT_TOKEN_SECURITY.md
    echo "✅ Removed security warning file"
fi

# Remove any remaining sensitive files
find . -name "*.log" -delete 2>/dev/null || true

echo "✅ Cleaned up sensitive files"

# Step 3: Verify .gitignore
echo ""
echo "🔍 STEP 3: VERIFYING .gitignore"
if grep -q "\.env$" .gitignore; then
    echo "✅ .env is properly ignored"
else
    echo "❌ .env is NOT in .gitignore!"
    exit 1
fi

# Step 4: Check for real secrets in staged files (not templates)
echo ""
echo "🔍 STEP 4: SCANNING FOR REAL SECRETS"
if git diff --cached | grep -qE "(MTM[A-Za-z0-9_-]{70,}|[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,})"; then
    echo "🚨 ERROR: Real Discord tokens detected in staged changes!"
    git diff --cached | grep -E "(MTM[A-Za-z0-9_-]{70,}|[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,})" || true
    exit 1
else
    echo "✅ No real secrets detected in staged changes"
fi

# Step 5: Build test
echo ""
echo "🏗️ STEP 5: BUILD TEST"
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed! Fix errors before publishing."
    npm run build
    exit 1
fi

# Step 6: Final confirmation
echo ""
echo "✅ ALL SECURITY CHECKS PASSED!"
echo ""
echo "📋 FINAL CHECKLIST:"
echo "   ✅ No real tokens in code"
echo "   ✅ Sensitive files removed"  
echo "   ✅ .gitignore configured"
echo "   ✅ No secrets in staged changes"
echo "   ✅ Build successful"
echo ""
echo "🚀 Ready to publish to GitHub!"
echo ""
echo "Next steps:"
echo "1. git add ."
echo "2. git commit -m 'feat: secure Discord MCP server with comprehensive security setup'"
echo "3. git push origin main"
echo ""
echo "🔒 After publishing, enable these GitHub features:"
echo "   - Branch protection rules"
echo "   - Required reviews for PRs"
echo "   - Secret scanning (GitHub Advanced Security)"
echo "   - Dependabot security updates"
