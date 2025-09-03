#!/bin/bash

# Alakaifak Mover Invoice System - Quick Deployment Script
# This script helps deploy the invoice system to GitHub Pages

echo "🚀 Alakaifak Mover Invoice System - Deployment Script"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
fi

# Add all files
echo "📁 Adding files to Git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Deploy Alakaifak Invoice System - $(date)"

# Check if remote origin exists
if git remote get-url origin > /dev/null 2>&1; then
    echo "🌍 Pushing to existing remote repository..."
    git push origin main
else
    echo "⚠️  No remote repository found!"
    echo ""
    echo "To deploy to GitHub Pages:"
    echo "1. Create a new repository on GitHub"
    echo "2. Run this command (replace YOUR_USERNAME and REPO_NAME):"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
    echo "3. Run this script again"
    echo ""
    echo "Alternative deployment options:"
    echo "• Netlify: Drag and drop this folder to netlify.com"
    echo "• Vercel: Import from GitHub at vercel.com"
    echo "• GitHub Pages: Enable in repository settings after pushing"
fi

echo ""
echo "✅ Deployment script completed!"
echo ""
echo "📋 Next steps:"
echo "• Enable GitHub Pages in repository settings"
echo "• Your site will be available at: https://YOUR_USERNAME.github.io/REPO_NAME"
echo "• The invoice system is ready to use!"
