@echo off
echo ==========================================
echo   CyberScryb Deploy Script (Fixed)
echo ==========================================

echo [1/5] Syncing root level files...
copy /Y "content-site\*.html" "public\"
copy /Y "content-site\*.xml" "public\"
copy /Y "content-site\*.txt" "public\"
copy /Y "content-site\*.svg" "public\"
copy /Y "content-site\*.png" "public\"
copy /Y "content-site\*.webp" "public\"
copy /Y "content-site\style.css" "public\style.css"

echo [2/5] Syncing assets and scripts...
xcopy "content-site\css" "public\css\" /E /I /Y
xcopy "content-site\js" "public\js\" /E /I /Y
xcopy "content-site\images" "public\images\" /E /I /Y

echo [3/5] Syncing subdirectories...
xcopy "content-site\tools" "public\tools\" /E /I /Y
xcopy "content-site\blog" "public\blog\" /E /I /Y
xcopy "content-site\distill" "public\distill\" /E /I /Y
xcopy "content-site\pro-success" "public\pro-success\" /E /I /Y

echo [4/5] Generating SEO pages...
node generate-pages.js

echo [5/5] Deploying to Firebase...
call npx firebase-tools deploy --only hosting

echo ==========================================
echo   DEPLOY COMPLETE! 🚀
echo ==========================================
pause
