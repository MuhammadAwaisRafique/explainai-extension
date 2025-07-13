// Popup script for AI Web Annotator
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Popup script loaded');

  // Get elements
  const statusDiv = document.getElementById('status');
  const testButton = document.getElementById('testButton');

  // Check current status on load
  checkStatus();

  // Add event listeners
  if (testButton) {
    testButton.addEventListener('click', testExplanation);
  }

  async function checkStatus() {
    try {
      console.log('🔍 Checking extension status...');
      
      // Check if user ID is set
      const result = await chrome.storage.sync.get(['userId']);
      const userId = result.userId;
      
      console.log('🔍 Current user ID:', userId);
      
      if (userId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        if (isUUID) {
          statusDiv.innerHTML = `
            <div style="color: green; margin-bottom: 10px;">
              ✅ Ready to Use<br>
              <small>User ID: ${userId.substring(0, 8)}...</small>
            </div>
            <div style="font-size: 12px; color: #666;">
              Extension is configured and ready!<br>
              Select text on any webpage to explain.
            </div>
          `;
        } else {
          statusDiv.innerHTML = `
            <div style="color: orange; margin-bottom: 10px;">
              ⚠️ Configuration Issue<br>
              <small>Invalid user ID format</small>
            </div>
            <div style="font-size: 12px; color: #666;">
              Please log into the dashboard first.
            </div>
          `;
        }
      } else {
        statusDiv.innerHTML = `
          <div style="color: blue; margin-bottom: 10px;">
            🔄 Auto-Configuring<br>
            <small>Setting up automatically...</small>
          </div>
          <div style="font-size: 12px; color: #666;">
            Please log into the dashboard first,<br>
            then try using the extension.
          </div>
        `;
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
      statusDiv.innerHTML = `
        <div style="color: red; margin-bottom: 10px;">
          ❌ Error Checking Status
        </div>
        <div style="font-size: 12px; color: #666;">
          ${error.message}
        </div>
      `;
    }
  }

  async function testExplanation() {
    try {
      console.log('🧪 Testing explanation...');
      
      const result = await chrome.storage.sync.get(['userId']);
      const userId = result.userId;
      
      if (!userId) {
        alert('❌ No user ID configured.\n\nPlease log into the dashboard first, then try using the extension.');
        return;
      }

      // Send test message to background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'testExplanation'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      console.log('✅ Test response:', response);
      
      if (response && response.success) {
        alert(`✅ Test Successful!

Explanation generated successfully.
AI Provider: ${response.data.aiProvider}
Saved to Database: ${response.data.savedToDatabase ? 'Yes' : 'No'}

Your extension is working correctly!`);
      } else {
        alert(`❌ Test Failed: ${response?.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Test error:', error);
      alert(`❌ Test Error: ${error.message}`);
    }
  }
});