# AI Web Annotator - Setup Guide

## Quick Start

### 1. Start the Backend Server

**Windows:**
```bash
# Double-click the start-backend.bat file
# OR run in command prompt:
cd backend
npm install
npm run dev
```

**Mac/Linux:**
```bash
# Make the script executable and run:
chmod +x start-backend.sh
./start-backend.sh

# OR manually:
cd backend
npm install
npm run dev
```

The backend server should start on `http://localhost:3001`

### 2. Start the Frontend

In a new terminal:
```bash
npm install
npm run dev
```

The frontend should start on `http://localhost:5173`

### 3. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension should now appear in your extensions list

### 4. Login and Sync

1. Go to `http://localhost:5173`
2. Login with your account
3. Click "Sync Extension" button on the dashboard
4. Follow the instructions to sync your user ID with the extension

## Troubleshooting

### Dashboard Shows No Data

1. **Check Backend Server**: Make sure the backend is running on `http://localhost:3001`
2. **Check User ID**: Your user ID should be a UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
3. **Sync Extension**: Click "Sync Extension" button and follow instructions
4. **Create Sample Data**: Click "Create Sample Data" to test the system
5. **Check Console**: Open browser console (F12) for error messages

### Extension Not Working

1. **Check Installation**: Make sure extension is loaded in `chrome://extensions/`
2. **Check Permissions**: Extension needs access to all websites
3. **Sync User ID**: Go to any webpage and run in console:
   ```javascript
   chrome.storage.sync.set({userId: 'YOUR_USER_ID'}, function() {
     console.log('User ID set:', 'YOUR_USER_ID');
   });
   ```
4. **Test Extension**: On any webpage, select text and look for "Explain" button

### Backend Connection Issues

1. **Check Port**: Make sure nothing else is using port 3001
2. **Check Dependencies**: Run `npm install` in the backend folder
3. **Check Environment**: Make sure `.env` file exists with required API keys
4. **Check Logs**: Look at the terminal where backend is running for errors

### Database Issues

1. **Check Supabase**: Make sure your Supabase project is set up correctly
2. **Check Migration**: Run the database migration in Supabase
3. **Check RLS**: Make sure Row Level Security is enabled
4. **Check Policies**: Verify the policies allow authenticated users to access their data

## Environment Variables

Create a `.env` file in the backend folder:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# AI API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/explain` - Generate explanation
- `GET /api/history/:userId` - Get user's explanations
- `GET /api/check-records/:userId` - Check user's records
- `POST /api/test/create-sample` - Create sample data

## Extension Features

- **Text Selection**: Select any text on any webpage
- **AI Explanation**: Get instant AI-powered explanations
- **History Sync**: All explanations are saved to your account
- **Multiple AI Providers**: Uses Gemini with OpenAI as backup

## Support

If you're still having issues:

1. Check the browser console for errors
2. Check the backend terminal for errors
3. Verify all environment variables are set
4. Make sure the database migration has been run
5. Try creating sample data to test the system

## Common Issues

### "Invalid User ID Format"
- Log out and log back in to get a new UUID
- Make sure you're using the latest version of the app

### "Backend server error"
- Check if backend is running on port 3001
- Check backend logs for specific errors
- Verify environment variables are set correctly

### "Extension not responding"
- Reload the extension in `chrome://extensions/`
- Refresh the webpage you're trying to use the extension on
- Check if the extension has the necessary permissions 