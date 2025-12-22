// Content script that coordinates detection and message passing

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'DETECT_JOB_DATA') {
    handleDetection(sendResponse);
    return true; // Keep channel open for async response
  }
});

/**
 * Handle detection request from popup
 */
function handleDetection(sendResponse) {
  try {
    // Wait for page to be ready (handle SPAs)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        performDetection(sendResponse);
      });
    } else {
      // Page already loaded, detect immediately
      performDetection(sendResponse);
    }
  } catch (error) {
    console.error('Detection error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Perform the actual detection
 */
function performDetection(sendResponse) {
  try {
    // Run detection
    const detected = JobDetector.detect();

    // Send back results
    sendResponse({
      success: true,
      data: detected
    });
  } catch (error) {
    console.error('Detection failed:', error);
    sendResponse({
      success: false,
      error: 'Failed to detect job data: ' + error.message
    });
  }
}
