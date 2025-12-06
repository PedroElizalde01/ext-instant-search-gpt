const ProviderUtils = (function() {
  "use strict";

  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  function reportStatus(status, details) {
    try {
      const B = getBrowser();
      if (B && B.runtime && B.runtime.sendMessage) {
        B.runtime.sendMessage({
          type: "INJECT_STATUS",
          status: status,
          details: details || null
        }).catch(() => {});
      }
    } catch (e) {
      console.log("[AI Search] Status report error:", e);
    }
  }

  function waitForSelector(selector, timeout) {
    timeout = timeout || 10000;
    
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for: " + selector));
      }, timeout);
    });
  }

  function waitForAnySelector(selectors, timeout) {
    timeout = timeout || 10000;
    
    return new Promise((resolve, reject) => {
      for (const selector of selectors) {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);
      }

      const observer = new MutationObserver(() => {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
            return;
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for any of: " + selectors.join(", ")));
      }, timeout);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function dataUrlsToFiles(dataUrls) {
    const files = [];
    
    for (let i = 0; i < dataUrls.length; i++) {
      const res = await fetch(dataUrls[i]);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `pasted-image-${i + 1}.png`,
        { type: blob.type || "image/png" }
      );
      files.push(file);
    }
    
    return files;
  }

  function uploadToFileInput(fileInput, files) {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function findFileInput(selectors) {
    for (const selector of selectors.fileInput) {
      const input = document.querySelector(selector);
      if (input) return input;
    }

    if (selectors.attachButton) {
      try {
        const attachBtn = await waitForAnySelector(selectors.attachButton, 3000);
        attachBtn.click();
        await delay(500);

        for (const selector of selectors.fileInput) {
          const input = document.querySelector(selector);
          if (input) return input;
        }
      } catch (e) {
        console.log("[AI Search] No attach button found");
      }
    }

    return null;
  }

  return {
    getBrowser,
    reportStatus,
    waitForSelector,
    waitForAnySelector,
    delay,
    dataUrlsToFiles,
    uploadToFileInput,
    findFileInput
  };
})();

