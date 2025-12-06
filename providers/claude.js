(function() {
  "use strict";

  if (window.__aiSearchClaudeLoaded) return;
  window.__aiSearchClaudeLoaded = true;

  const { 
    getBrowser, 
    reportStatus, 
    waitForAnySelector, 
    delay, 
    dataUrlsToFiles, 
    uploadToFileInput,
    findFileInput 
  } = ProviderUtils;

  const SELECTORS = {
    textarea: [
      'div[contenteditable="true"].ProseMirror',
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"]'
    ],
    sendButton: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]',
      'fieldset button:last-child',
      'button:has(svg)'
    ],
    fileInput: [
      'input[type="file"][multiple]',
      'input[type="file"]'
    ],
    attachButton: [
      'button[aria-label="Attach files"]',
      'button[aria-label*="Attach"]',
      'button[aria-label*="attach"]'
    ]
  };

  async function sendText(text) {
    if (!text) return null;

    const textarea = await waitForAnySelector(SELECTORS.textarea);
    
    textarea.focus();
    
    if (textarea.classList.contains('ProseMirror')) {
      textarea.innerHTML = '';
      
      const p = document.createElement("p");
      p.textContent = text;
      textarea.appendChild(p);
      
      textarea.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      }));
    } else {
      textarea.textContent = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return textarea;
  }

  async function uploadImages(dataUrls) {
    if (!dataUrls || dataUrls.length === 0) return false;

    const files = await dataUrlsToFiles(dataUrls);
    const fileInput = await findFileInput(SELECTORS);

    if (!fileInput) {
      console.error("[Claude] Could not find file input element");
      return false;
    }

    uploadToFileInput(fileInput, files);

    await delay(1000 + (files.length * 500));

    return true;
  }

  async function clickSend() {
    try {
      const sendBtn = await waitForAnySelector(SELECTORS.sendButton, 5000);
      
      await delay(300);
      
      sendBtn.click();
    } catch (e) {
      console.error("[Claude] Could not find send button:", e);
      
      const textarea = document.querySelector('div[contenteditable="true"]');
      if (textarea) {
        textarea.focus();
        textarea.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }
    }
  }

  async function handleMessage(msg) {
    const imageCount = (msg.images && msg.images.length) || 0;
    reportStatus("Received message", {
      textLength: (msg.text && msg.text.length) || 0,
      imageCount: imageCount
    });

    try {
      reportStatus("Waiting for page...");
      await delay(1500); 

      if (msg.text) {
        reportStatus("Setting text...");
        await sendText(msg.text);
        reportStatus("Text set successfully");
        await delay(300);
      }

      if (msg.images && msg.images.length > 0) {
        reportStatus(`Uploading ${msg.images.length} image(s)...`);
        const uploaded = await uploadImages(msg.images);
        if (uploaded) {
          reportStatus("Images uploaded successfully");
          await delay(1500);
        } else {
          reportStatus("Image upload failed");
        }
      }

      reportStatus("Clicking send...");
      await clickSend();

      reportStatus("DONE - Message sent!");
    } catch (error) {
      reportStatus("ERROR", error.message);
      console.error("[Claude] Error:", error);
    }
  }

  const B = getBrowser();
  if (B && B.runtime && B.runtime.onMessage) {
    B.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "INJECT_MESSAGE") {
        handleMessage(msg);
        sendResponse({ success: true });
        return true;
      }
    });
  }

  reportStatus("Claude provider loaded");
})();

