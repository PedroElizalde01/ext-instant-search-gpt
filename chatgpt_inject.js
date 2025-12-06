(function() {
  "use strict";
  
  if (window.__chatgptInjectLoaded) {
    return;
  }
  window.__chatgptInjectLoaded = true;

  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  const browserAPI = getBrowser();

  function reportStatus(status, details) {
    try {
      if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
        browserAPI.runtime.sendMessage({ type: "INJECT_STATUS", status: status, details: details || null }).catch(function(e) {
        });
      }
    } catch (e) {
      console.log("[ChatGPT Inject] Error in reportStatus:", e);
    }
  }

  function waitForSelector(selector, timeout) {
    timeout = timeout || 10000;
    return new Promise(function(resolve, reject) {
      var existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      var observer = new MutationObserver(function() {
        var el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(function() {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selector));
      }, timeout);
    });
  }

  function waitForAnySelector(selectors, timeout) {
    timeout = timeout || 10000;
    return new Promise(function(resolve, reject) {
      for (var i = 0; i < selectors.length; i++) {
        var existing = document.querySelector(selectors[i]);
        if (existing) return resolve(existing);
      }

      var observer = new MutationObserver(function() {
        for (var i = 0; i < selectors.length; i++) {
          var el = document.querySelector(selectors[i]);
          if (el) {
            observer.disconnect();
            resolve(el);
            return;
          }
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(function() {
        observer.disconnect();
        reject(new Error("Timeout waiting for any of: " + selectors.join(", ")));
      }, timeout);
    });
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function sendText(text) {
    if (!text) return null;

    var textareaSelectors = [
      "#prompt-textarea",
      'div[contenteditable="true"][id="prompt-textarea"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    var textarea = await waitForAnySelector(textareaSelectors);

    if (textarea.tagName === "DIV" || textarea.isContentEditable) {
      textarea.focus();
      textarea.innerHTML = "";
      
      var p = document.createElement("p");
      p.textContent = text;
      textarea.appendChild(p);
      
      textarea.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    } else {
      textarea.focus();
      textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return textarea;
  }

  async function uploadImage(dataUrl) {
    if (!dataUrl) return false;

    var res = await fetch(dataUrl);
    var blob = await res.blob();
    var file = new File([blob], "pasted-image.png", { type: blob.type || "image/png" });

    var fileInputSelectors = [
      'input[type="file"][multiple]',
      'input[type="file"]'
    ];

    var fileInput = null;
    
    for (var i = 0; i < fileInputSelectors.length; i++) {
      fileInput = document.querySelector(fileInputSelectors[i]);
      if (fileInput) break;
    }

    if (!fileInput) {
      
      var attachButtonSelectors = [
        'button[aria-label*="Attach"]',
        'button[aria-label*="attach"]',
        'button[aria-label*="Upload"]',
        'button[aria-label*="upload"]',
        'button[aria-label="Attach files"]'
      ];

      try {
        var attachBtn = await waitForAnySelector(attachButtonSelectors, 3000);
        attachBtn.click();
        await delay(500);
        
        for (var j = 0; j < fileInputSelectors.length; j++) {
          fileInput = document.querySelector(fileInputSelectors[j]);
          if (fileInput) break;
        }
      } catch (e) {
        console.log("[ChatGPT Inject] No attachment button found");
      }
    }

    if (!fileInput) {
      console.error("[ChatGPT Inject] Could not find file input element");
      return false;
    }


    var dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await delay(1000);

    return true;
  }

  async function clickSend() {

    var sendButtonSelectors = [
      '#composer-submit-button',
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label*="Send"]',
      'form button[type="submit"]'
    ];

    try {
      var sendBtn = await waitForAnySelector(sendButtonSelectors, 5000);
      
      var attempts = 0;
      while (sendBtn.disabled && attempts < 20) {
        await delay(200);
        attempts++;
      }

      if (sendBtn.disabled) {
        var textarea = document.querySelector("#prompt-textarea, textarea");
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
      console.error("[ChatGPT Inject] Could not find send button:", e);
      
      var textarea = document.querySelector("#prompt-textarea, textarea");
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

  async function handleInjectMessage(msg) {
    reportStatus("Received message", { textLength: (msg.text && msg.text.length) || 0, hasImage: !!msg.image });

    try {
      reportStatus("Waiting for page...");
      await delay(1000);

      if (msg.text) {
        reportStatus("Setting text...");
        await sendText(msg.text);
        reportStatus("Text set successfully");
        await delay(300);
      }

      if (msg.image) {
        reportStatus("Uploading image...");
        var uploaded = await uploadImage(msg.image);
        if (uploaded) {
          reportStatus("Image uploaded successfully");
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
      console.error("[ChatGPT Inject] Error:", error);
    }
  }

  if (browserAPI && browserAPI.runtime && browserAPI.runtime.onMessage) {
    browserAPI.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
      if (msg.type === "INJECT_MESSAGE") {
        handleInjectMessage(msg);
        sendResponse({ success: true });
        return true;
      }
    });
  }

  reportStatus("Script loaded and ready");

})();
