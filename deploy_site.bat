@echo off
echo ==========================================
echo   CyberScryb Deploy Script
echo ==========================================

echo [1/5] Syncing index.html...
copy /Y "content-site\index.html" "public\index.html"
copy /Y "content-site\tools.html" "public\tools.html"
copy /Y "content-site\sitemap.xml" "public\sitemap.xml"
copy /Y "content-site\v2.html" "public\v2.html"
copy /Y "content-site\google*.html" "public\" >nul 2>&1

echo [2/5] Syncing styles and scripts...
copy /Y "content-site\style.css" "public\style.css"
xcopy "content-site\css" "public\css\" /E /I /Y
xcopy "content-site\js" "public\js\" /E /I /Y
xcopy "content-site\images" "public\images\" /E /I /Y

echo [3/5] Syncing tools directory...
xcopy "content-site\tools" "public\tools" /E /I /Y

echo [4/5] Generating SEO pages...
node generate-pages.js

echo [5/5] Deploying to Firebase...
call firebase deploy --only hosting

echo ==========================================
echo   DEPLOY COMPLETE! 🚀
echo ==========================================
pause
