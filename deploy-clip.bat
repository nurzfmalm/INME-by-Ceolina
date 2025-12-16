@echo off
echo ================================
echo CLIP Analysis Deployment Script
echo ================================
echo.

echo [1/3] Setting Hugging Face API Key...
supabase secrets set HUGGINGFACE_API_KEY=your_huggingface_api_key
if errorlevel 1 (
    echo ERROR: Failed to set secrets
    pause
    exit /b 1
)
echo SUCCESS: Secrets configured
echo.

echo [2/3] Deploying analyze-image-clip function...
supabase functions deploy analyze-image-clip
if errorlevel 1 (
    echo ERROR: Failed to deploy function
    pause
    exit /b 1
)
echo SUCCESS: Function deployed
echo.

echo [3/3] Verifying deployment...
supabase functions list
echo.

echo ================================
echo Deployment Complete!
echo ================================
echo.
echo You can now use CLIP analysis in the PhotoAnalysis component.
echo Function URL: https://ragmaoabxrzcndasyggy.supabase.co/functions/v1/analyze-image-clip
echo.
pause
