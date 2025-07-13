// Background script for AI Web Annotator
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Web Annotator installed');
});

// Handle messages from content script and frontend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background script: Received message:', request.action);
  
  if (request.action === 'explainText') {
    console.log('🔄 Background script: Processing explainText request');
    
    explainText(request.text, request.context)
      .then(response => {
        console.log('✅ Background script: Sending success response');
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error('❌ Background script error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        sendResponse({ 
          success: false, 
          error: error.message,
          details: error.toString()
        });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'setUserId') {
    console.log('🔄 Background script: Processing setUserId request');
    
    setUserId(request.userId)
      .then(() => {
        console.log('✅ Background script: User ID set successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Error setting user ID:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'ping') {
    console.log('🏓 Background script: Received ping');
    sendResponse({ success: true, message: 'pong' });
    return false; // No async response needed
  }
  
  if (request.action === 'checkUserId') {
    console.log('🔍 Background script: Checking user ID');
    getUserId()
      .then(userId => {
        const hasUserId = !!userId;
        sendResponse({ 
          success: true, 
          hasUserId: hasUserId,
          userId: userId
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'autoDetectUserId') {
    console.log('🔍 Background script: Auto-detecting user ID');
    autoDetectAndSetUserId()
      .then(result => {
        sendResponse({ success: true, ...result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'testExplanation') {
    console.log('🧪 Background script: Testing explanation with sample text');
    explainText('This is a test explanation to verify the extension is working properly.', 'Test Context')
      .then(response => {
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  

  
  // Handle unknown actions
  console.warn('⚠️ Background script: Unknown action:', request.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Auto-detect and set user ID from dashboard
async function autoDetectAndSetUserId() {
  try {
    console.log('🔍 Auto-detecting user ID from dashboard...');
    
    // Check if user ID is already set
    const currentUserId = await getUserId();
    if (currentUserId) {
      console.log('✅ User ID already set:', currentUserId);
      return { userId: currentUserId, status: 'already_set' };
    }
    
    // Try to detect user ID from dashboard
    const dashboardUrl = 'http://localhost:5173';
    
    try {
      // Create a tab to check the dashboard
      const tab = await chrome.tabs.create({ 
        url: dashboardUrl, 
        active: false 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Inject script to get user ID from dashboard
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Try to get user ID from localStorage or sessionStorage
          const userFromStorage = localStorage.getItem('supabase.auth.token') || 
                                 sessionStorage.getItem('supabase.auth.token');
          
          if (userFromStorage) {
            try {
              const userData = JSON.parse(userFromStorage);
              return userData.currentSession?.user?.id || null;
            } catch (e) {
              return null;
            }
          }
          
          // Try to get from window object
          if (window.supabase?.auth?.session()?.user?.id) {
            return window.supabase.auth.session().user.id;
          }
          
          return null;
        }
      });
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
      
      const detectedUserId = results[0]?.result;
      
      if (detectedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(detectedUserId)) {
        console.log('✅ User ID detected from dashboard:', detectedUserId);
        
        // Save the detected user ID
        await setUserId(detectedUserId);
        
        return { userId: detectedUserId, status: 'detected_and_set' };
      } else {
        console.log('⚠️ No valid user ID detected from dashboard');
        return { userId: null, status: 'not_detected' };
      }
      
    } catch (error) {
      console.error('❌ Error detecting user ID from dashboard:', error);
      return { userId: null, status: 'error', error: error.message };
    }
    
  } catch (error) {
    console.error('❌ Error in autoDetectAndSetUserId:', error);
    throw error;
  }
}

async function setUserId(userId) {
  try {
    console.log('💾 Setting user ID in storage:', userId);
    
    // Save to sync storage
    await chrome.storage.sync.set({ userId: userId });
    console.log('✅ User ID saved to sync storage:', userId);
    
    // Also save to local storage as backup
    try {
      await chrome.storage.local.set({ userId: userId });
      console.log('✅ User ID also saved to local storage:', userId);
    } catch (localError) {
      console.warn('⚠️ Could not save to local storage:', localError);
    }
    
    // Verify the save
    const verifyResult = await chrome.storage.sync.get(['userId']);
    console.log('🔍 Verification - stored user ID:', verifyResult.userId);
    
    if (verifyResult.userId === userId) {
      console.log('✅ User ID verification successful');
    } else {
      console.warn('⚠️ User ID verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error saving user ID:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

async function explainText(text, context) {
  try {
    console.log('🔄 Sending request to backend:', { text: text.substring(0, 50) + '...', context });
    
    let userId = await getUserId();
    console.log('👤 Current user ID:', userId);
    
    // If no user ID, try to auto-detect
    if (!userId) {
      console.log('🔄 No user ID found, attempting auto-detection...');
      const detectionResult = await autoDetectAndSetUserId();
      
      if (detectionResult.userId) {
        userId = detectionResult.userId;
        console.log('✅ User ID auto-detected and set:', userId);
      } else {
        console.warn('⚠️ Could not auto-detect user ID. Explanation will not be saved to database.');
      }
    }
    
    // Validate user ID format
    const isUUID = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    if (!userId) {
      console.warn('⚠️ No user ID found in storage. Explanation will not be saved to database.');
      console.log('💡 User needs to be logged into the dashboard first');
    } else if (!isUUID) {
      console.warn('⚠️ Invalid user ID format. Explanation will not be saved to database.');
      console.log('User ID format:', userId);
      console.log('Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    } else {
      console.log('✅ User ID format is valid UUID');
    }
    
    const requestBody = {
      text: text,
      context: context,
      userId: userId
    };
    
    console.log('📤 Request body:', requestBody);
    console.log('📤 Request body (full):', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3001/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      throw new Error(`Backend server error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Backend response received:', { 
      success: data.success, 
      aiProvider: data.aiProvider,
      explanationLength: data.explanation?.length || 0,
      savedToDatabase: !!userId
    });
    return data;
  } catch (error) {
    console.error('💥 Error in explainText function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Provide more specific error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to backend server. Please make sure the server is running on http://localhost:3001');
    } else if (error.message.includes('CORS')) {
      throw new Error('CORS error. Please check backend configuration.');
    } else if (error.message.includes('Backend server error')) {
      throw error; // Keep the specific backend error
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

async function getUserId() {
  try {
    console.log('🔍 Attempting to get user ID from storage...');
    
    const result = await chrome.storage.sync.get(['userId']);
    const userId = result.userId;
    
    console.log('🔍 Storage result:', result);
    console.log('🔍 Retrieved user ID from storage:', userId);
    
    if (!userId) {
      console.warn('⚠️ No user ID found in Chrome storage');
      
      // Try to get from local storage as fallback
      try {
        const localResult = await chrome.storage.local.get(['userId']);
        const localUserId = localResult.userId;
        console.log('🔍 Local storage result:', localResult);
        console.log('🔍 Local user ID:', localUserId);
        
        if (localUserId) {
          console.log('✅ Found user ID in local storage, using it');
          return localUserId;
        }
      } catch (localError) {
        console.log('⚠️ Could not check local storage:', localError);
      }
    } else {
      console.log('✅ User ID found in sync storage');
    }
    
    return userId || null;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

// Function to manually check and set user ID (for debugging)
async function checkAndSetUserId() {
  try {
    const result = await chrome.storage.sync.get(['userId']);
    console.log('🔍 Current user ID in storage:', result.userId);
    
    if (!result.userId) {
      console.log('⚠️ No user ID found. Please sync from frontend.');
      return false;
    }
    
    console.log('✅ User ID is properly set:', result.userId);
    return true;
  } catch (error) {
    console.error('❌ Error checking user ID:', error);
    return false;
  }
}