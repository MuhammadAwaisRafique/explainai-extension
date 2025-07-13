@echo off
echo Starting AI Web Annotator Backend Server...
echo.

cd backend

echo Installing dependencies...
npm install

echo.
echo Starting server on http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev 