// Content script for AI Web Annotator
let explainButton = null;
let isExplaining = false;
let currentSelection = null;
let currentSpeech = null;
let extensionReady = false;

// Initialize extension
function initializeExtension() {
  try {
    // Check if chrome.runtime is available
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.error('❌ Chrome runtime not available');
      return false;
    }
    
    // Test extension connection
    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Extension not ready:', chrome.runtime.lastError.message);
        extensionReady = false;
      } else {
        console.log('✅ Extension initialized successfully');
        extensionReady = true;
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
    return false;
  }
}

// Initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Create and style the explain button
function createExplainButton() {
  const button = document.createElement('div');
  button.id = 'ai-explain-button';
  button.innerHTML = `
    <div class="ai-explain-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <circle cx="12" cy="17" r="1"></circle>
      </svg>
      <span>Explain</span>
    </div>
  `;
  button.style.cssText = `
    position: absolute;
    z-index: 10000;
    cursor: pointer;
    user-select: none;
    pointer-events: auto;
  `;
  
  button.addEventListener('click', handleExplainClick);
  return button;
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 0 && selectedText.length < 1000) {
      currentSelection = {
        text: selectedText,
        range: selection.getRangeAt(0)
      };
      
      showExplainButton(e.pageX, e.pageY);
    } else {
      hideExplainButton();
    }
  }, 10);
});

// Show explain button near selection
function showExplainButton(x, y) {
  hideExplainButton();
  
  explainButton = createExplainButton();
  explainButton.style.left = `${x + 10}px`;
  explainButton.style.top = `${y - 40}px`;
  
  document.body.appendChild(explainButton);
  
  // Animate in
  requestAnimationFrame(() => {
    explainButton.style.opacity = '1';
    explainButton.style.transform = 'translateY(0) scale(1)';
  });
}

// Hide explain button
function hideExplainButton() {
  if (explainButton) {
    explainButton.remove();
    explainButton = null;
  }
}

// Handle explain button click
async function handleExplainClick(e) {
  e.stopPropagation();
  
  if (isExplaining || !currentSelection) return;
  
  // Check if extension is ready
  if (!extensionReady) {
    showError('Extension is not ready. Please refresh the page and try again.');
    return;
  }
  
  isExplaining = true;
  const button = e.currentTarget;
  
  // Show loading state
  button.innerHTML = `
    <div class="ai-explain-btn loading">
      <div class="spinner"></div>
      <span>Explaining...</span>
    </div>
  `;
  
  try {
    // Get page context
    const context = getPageContext();
    
    console.log('🔄 Content script: Sending explanation request');
    console.log('📝 Selected text:', currentSelection.text.substring(0, 50) + '...');
    console.log('🌐 Context:', context);
    
    // First, try to auto-detect user ID if needed
    try {
      const autoDetectResponse = await sendMessageWithRetry({
        action: 'autoDetectUserId'
      });
      
      if (autoDetectResponse && autoDetectResponse.success) {
        if (autoDetectResponse.status === 'detected_and_set') {
          console.log('✅ User ID auto-detected and set:', autoDetectResponse.userId);
        } else if (autoDetectResponse.status === 'already_set') {
          console.log('✅ User ID already set:', autoDetectResponse.userId);
        } else {
          console.log('⚠️ Could not auto-detect user ID, proceeding anyway');
        }
      }
    } catch (autoDetectError) {
      console.log('⚠️ Auto-detection failed, proceeding with explanation:', autoDetectError.message);
    }
    
    // Try to send message with retry logic
    const response = await sendMessageWithRetry({
      action: 'explainText',
      text: currentSelection.text,
      context: context
    });
    
    console.log('📡 Content script: Received response:', response);
    
    if (response && response.success) {
      showExplanation(
        response.data.explanation, 
        currentSelection.text, 
        response.data.isFallback, 
        response.data.errorDetails, 
        response.data.aiProvider
      );
    } else {
      console.error('❌ Content script: Request failed:', response?.error || 'Unknown error');
      showError(response?.error || 'Failed to generate explanation. Please try again.');
    }
  } catch (error) {
    console.error('💥 Content script: Unexpected error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Provide more specific error messages
    if (error.message.includes('Extension context invalidated')) {
      showError('Extension needs to be reloaded. Please refresh this page and try again.');
    } else if (error.message.includes('Could not establish connection')) {
      showError('Extension connection error. Please reload the extension and try again.');
    } else if (error.message.includes('Cannot connect to backend')) {
      showError('Backend server is not running. Please start the server on http://localhost:3001');
    } else if (error.message.includes('Network error')) {
      showError('Network connection error. Please check your internet connection and try again.');
    } else if (error.message.includes('Request timeout')) {
      showError('Request timed out. The AI service might be slow. Please try again.');
    } else if (error.message.includes('Chrome extension runtime not available')) {
      showError('Extension not properly loaded. Please reload the extension.');
    } else {
      showError(`Something went wrong: ${error.message}`);
    }
  } finally {
    isExplaining = false;
    hideExplainButton();
  }
}

// Helper function to send message with retry logic
function sendMessageWithRetry(message, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    
    function attemptSend() {
      // Check if chrome.runtime is available
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error('Chrome extension runtime not available. Please reload the extension.'));
        return;
      }
      
      // Clear any previous errors
      if (chrome.runtime.lastError) {
        console.warn('Previous runtime error cleared:', chrome.runtime.lastError);
      }
      
      chrome.runtime.sendMessage(message, (response) => {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          console.warn(`Attempt ${retryCount + 1} failed:`, error.message);
          
          // If it's a context invalidated error, try to reinitialize
          if (error.message.includes('Extension context invalidated') || 
              error.message.includes('Could not establish connection')) {
            
            console.log('🔄 Attempting to reinitialize extension...');
            extensionReady = false;
            
            // Try to reinitialize
            if (initializeExtension()) {
              // Wait a bit and retry once
              setTimeout(() => {
                if (extensionReady) {
                  console.log('✅ Extension reinitialized, retrying...');
                  attemptSend();
                } else {
                  reject(new Error('Extension context invalidated. Please refresh this page and try again.'));
                }
              }, 1000);
            } else {
              reject(new Error('Extension context invalidated. Please refresh this page and try again.'));
            }
            return;
          }
          
          // Retry for other errors
          if (retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${maxRetries})`);
            setTimeout(attemptSend, 1000 * retryCount); // Exponential backoff
          } else {
            reject(new Error(`Failed after ${maxRetries} attempts: ${error.message}`));
          }
        } else {
          // Success
          resolve(response);
        }
      });
    }
    
    attemptSend();
  });
}

// Get page context for better explanations
function getPageContext() {
  const title = document.title;
  const url = window.location.href;
  const domain = window.location.hostname;
  
  // Try to get some context from the page
  let context = `Website: ${domain}`;
  if (title) context += ` - ${title}`;
  
  return context;
}

// Get AI provider display name and icon
function getAIProviderInfo(provider) {
  switch (provider) {
    case 'gemini':
      return {
        name: 'Google Gemini',
        icon: '🤖',
        color: '#4285f4'
      };
    case 'openai':
      return {
        name: 'OpenAI GPT',
        icon: '🧠',
        color: '#10a37f'
      };
    case 'fallback':
      return {
        name: 'Basic Explanation',
        icon: '📝',
        color: '#f59e0b'
      };
    default:
      return {
        name: 'AI Explanation',
        icon: '🤖',
        color: '#667eea'
      };
  }
}

// Text-to-speech functionality
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showError('Text-to-speech is not supported in this browser.');
    return;
  }

  // Stop any current speech
  if (currentSpeech) {
    speechSynthesis.cancel();
  }

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configure speech settings
  utterance.rate = 0.9; // Slightly slower for better comprehension
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Try to get a good voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.lang.includes('en') && 
    (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Premium'))
  ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  // Store reference to current speech
  currentSpeech = utterance;
  
  // Update button state
  const speakBtn = document.querySelector('.ai-speak-btn');
  if (speakBtn) {
    const originalContent = speakBtn.innerHTML;
    speakBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      Stop
    `;
    speakBtn.classList.add('speaking');
    
    // Reset button when speech ends
    utterance.onend = () => {
      currentSpeech = null;
      speakBtn.innerHTML = originalContent;
      speakBtn.classList.remove('speaking');
    };
    
    utterance.onerror = () => {
      currentSpeech = null;
      speakBtn.innerHTML = originalContent;
      speakBtn.classList.remove('speaking');
      showError('Failed to play audio. Please try again.');
    };
  }
  
  // Start speaking
  speechSynthesis.speak(utterance);
}

// Stop speech
function stopSpeech() {
  if (currentSpeech) {
    speechSynthesis.cancel();
    currentSpeech = null;
    
    const speakBtn = document.querySelector('.ai-speak-btn');
    if (speakBtn) {
      speakBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        Listen
      `;
      speakBtn.classList.remove('speaking');
    }
  }
}

// Copy to clipboard functionality
function copyToClipboard(text, event) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief confirmation
    const btn = event.target.closest('.ai-copy-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"></path>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text:', err);
    showError('Failed to copy text. Please try again.');
  });
}

// Show explanation popup
function showExplanation(explanation, originalText, isFallback = false, errorDetails = null, aiProvider = 'gemini') {
  const popup = document.createElement('div');
  popup.id = 'ai-explanation-popup';
  
  const providerInfo = getAIProviderInfo(aiProvider);
  
  // Create fallback warning if needed
  const fallbackWarning = isFallback ? `
    <div class="ai-fallback-warning">
      <div class="ai-warning-icon">⚠️</div>
      <div class="ai-warning-text">
        <strong>AI Service Limited</strong>
        <p>${errorDetails?.message || 'Using fallback explanation due to AI service limitations.'}</p>
        ${errorDetails?.details ? `<small>${errorDetails.details}</small>` : ''}
      </div>
    </div>
  ` : '';
  
  // Create AI provider badge
  const providerBadge = `
    <div class="ai-provider-badge" style="background-color: ${providerInfo.color}20; border-color: ${providerInfo.color};">
      <span class="ai-provider-icon">${providerInfo.icon}</span>
      <span class="ai-provider-name">${providerInfo.name}</span>
    </div>
  `;
  
  popup.innerHTML = `
    <div class="ai-popup-content">
      <div class="ai-popup-header">
        <div class="ai-header-content">
          <h3>${isFallback ? 'Basic Explanation' : 'AI Explanation'}</h3>
          ${providerBadge}
        </div>
        <button class="ai-close-btn" onclick="this.closest('#ai-explanation-popup').remove()">×</button>
      </div>
      ${fallbackWarning}
      <div class="ai-popup-body">
        <div class="ai-original-text">
          <strong>Selected text:</strong>
          <p>"${originalText}"</p>
        </div>
        <div class="ai-explanation">
          <strong>Explanation:</strong>
          <p>${explanation}</p>
        </div>
        <div class="ai-popup-actions">
          <button class="ai-speak-btn" data-text="${explanation.replace(/"/g, '&quot;')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Listen
          </button>
          <button class="ai-copy-btn" data-text="${explanation.replace(/"/g, '&quot;')}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Add event listeners for buttons
  const speakBtn = popup.querySelector('.ai-speak-btn');
  const copyBtn = popup.querySelector('.ai-copy-btn');
  
  speakBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = speakBtn.getAttribute('data-text');
    if (speakBtn.classList.contains('speaking')) {
      stopSpeech();
    } else {
      speakText(text);
    }
  });
  
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const text = copyBtn.getAttribute('data-text');
    copyToClipboard(text, e);
  });
  
  // Animate in
  requestAnimationFrame(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0) scale(1)';
  });
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      stopSpeech(); // Stop any ongoing speech
      popup.remove();
    }
  }, 30000);
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.id = 'ai-error-popup';
  errorDiv.innerHTML = `
    <div class="ai-error-content">
      <div class="ai-error-icon">⚠️</div>
      <p>${message}</p>
      <button onclick="this.closest('#ai-error-popup').remove()">Close</button>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// Hide button when clicking elsewhere
document.addEventListener('click', (e) => {
  if (explainButton && !explainButton.contains(e.target)) {
    hideExplainButton();
  }
});

// Hide button when scrolling
window.addEventListener('scroll', () => {
  if (explainButton) {
    hideExplainButton();
  }
});

// Initialize speech synthesis voices when available
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    // Voices are now loaded
    console.log('Speech synthesis voices loaded');
  };
}