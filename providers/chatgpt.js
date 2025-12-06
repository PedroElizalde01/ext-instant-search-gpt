(function() {
  "use strict";

  if (window.__aiSearchChatGPTLoaded) return;
  window.__aiSearchChatGPTLoaded = true;

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
      "#prompt-textarea",
      'div[contenteditable="true"][id="prompt-textarea"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      'textarea'
    ],
    sendButton: [
      "#composer-submit-button",
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label*="Send"]',
      'form button[type="submit"]'
    ],
    fileInput: [
      "#upload-photos",
      'input[type="file"][multiple]',
      'input[type="file"]'
    ],
    attachButton: [
      'button[data-testid="composer-plus-btn"]',
      'button[aria-label="Add files and more"]',
      'button[aria-label*="Attach"]',
      'button[aria-label*="attach"]',
      'button[aria-label*="Upload"]',
      'button[aria-label*="upload"]'
    ]
  };

  async function sendText(text) {
    if (!text) return null;

    const textarea = await waitForAnySelector(SELECTORS.textarea);

    if (textarea.tagName === "DIV" || textarea.isContentEditable) {
      // ContentEditable div (ChatGPT's current UI)
      textarea.focus();
      textarea.innerHTML = "";
      
      const p = document.createElement("p");
      p.textContent = text;
      textarea.appendChild(p);
      
      textarea.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      }));
    } else {
      textarea.focus();
      textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return textarea;
  }

  async function uploadImages(dataUrls) {
    if (!dataUrls || dataUrls.length === 0) return false;

    const files = await dataUrlsToFiles(dataUrls);
    const fileInput = await findFileInput(SELECTORS);

    if (!fileInput) {
      console.error("[ChatGPT] Could not find file input element");
      return false;
    }

    uploadToFileInput(fileInput, files);

    await delay(1000 + (files.length * 500));

    return true;
  }

  async function clickSend() {
    try {
      const sendBtn = await waitForAnySelector(SELECTORS.sendButton, 5000);
      
      let attempts = 0;
      while (sendBtn.disabled && attempts < 20) {
        await delay(200);
        attempts++;
      }

      if (sendBtn.disabled) {
        const textarea = document.querySelector("#prompt-textarea, textarea");
        if (textarea) {
          textarea.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }
        return;
      }

      sendBtn.click();
    } catch (e) {
      console.error("[ChatGPT] Could not find send button:", e);
      
      const textarea = document.querySelector("#prompt-textarea, textarea");
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
      await delay(1000);

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
      console.error("[ChatGPT] Error:", error);
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

  reportStatus("ChatGPT provider loaded");
})();

