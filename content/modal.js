const AISearchModal = (function() {
  "use strict";

  const MAX_IMAGES = 5;
  const MODAL_ID = "ai-search-modal";
  
  let pastedImages = [];
  let currentProvider = null;
  let isTemporaryMode = false;
  let onSubmitCallback = null;

  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  function loadStyles() {
    if (document.getElementById("ai-search-modal-styles")) return;
    
    const link = document.createElement("link");
    link.id = "ai-search-modal-styles";
    link.rel = "stylesheet";
    link.href = getBrowser().runtime.getURL("content/modal.css");
    document.head.appendChild(link);
  }

  function createModalHTML(provider, temporary) {
    const iconColor = temporary ? provider.colors.temporary : provider.colors.normal;
    const modeText = temporary && provider.hasTemporaryMode ? provider.id === "claude" ? "Incognito" : "Temporary" : "Normal";
    const modeClass = temporary ? "temporary" : "";
    
    return `
      <div class="modal-backdrop"></div>
      <div class="modal-box">
        <span class="modal-mode-indicator ${modeClass}" id="modal-mode-indicator" style="color: ${temporary ? provider.colors.temporary : '#6b7280'}">${modeText}</span>
        <div class="modal-search-wrapper">
          <svg class="modal-provider-icon" id="modal-provider-icon" 
               width="20" height="20" viewBox="${provider.iconViewBox || '0 0 20 20'}" 
               fill="currentColor" xmlns="http://www.w3.org/2000/svg" 
               title="Click to toggle mode"
               style="color: ${iconColor}">
            ${provider.icon}
          </svg>
          <textarea id="ai-search-input" placeholder="Ask ${provider.name}" rows="1" autofocus></textarea>
        </div>
        <div id="image-preview-container"></div>
      </div>
    `;
  }

  function renderImagePreviews() {
    const container = document.getElementById("image-preview-container");
    if (!container) return;
    
    container.innerHTML = "";
    container.style.marginTop = pastedImages.length > 0 ? "10px" : "0";
    
    pastedImages.forEach((dataUrl, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "image-preview-wrapper";
      
      const img = document.createElement("img");
      img.src = dataUrl;
      
      const removeBtn = document.createElement("button");
      removeBtn.className = "image-preview-remove";
      removeBtn.innerHTML = "×";
      removeBtn.title = "Remove image";
      removeBtn.onclick = function(e) {
        e.stopPropagation();
        pastedImages.splice(index, 1);
        renderImagePreviews();
      };
      
      wrapper.appendChild(img);
      wrapper.appendChild(removeBtn);
      container.appendChild(wrapper);
    });
  }

  function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }

  function updateModeUI() {
    const icon = document.getElementById("modal-provider-icon");
    const indicator = document.getElementById("modal-mode-indicator");
    
    if (!icon || !indicator || !currentProvider) return;
    
    if (isTemporaryMode && currentProvider.hasTemporaryMode) {
      icon.style.color = currentProvider.colors.temporary;
      indicator.style.color = currentProvider.colors.temporary;
      indicator.textContent = "Temporary";
      indicator.classList.add("temporary");
    } else {
      icon.style.color = currentProvider.colors.normal;
      indicator.style.color = "#6b7280";
      indicator.textContent = "Normal";
      indicator.classList.remove("temporary");
    }
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    
    pastedImages = [];
    document.removeEventListener("paste", handlePaste);
  }

  function handlePaste(e) {
    if (!document.getElementById(MODAL_ID)) {
      document.removeEventListener("paste", handlePaste);
      return;
    }
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        if (pastedImages.length >= MAX_IMAGES) {
          e.preventDefault();
          return;
        }
        
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        
        reader.onload = function(event) {
          if (pastedImages.length < MAX_IMAGES) {
            pastedImages.push(event.target.result);
            renderImagePreviews();
          }
        };
        
        reader.readAsDataURL(blob);
      }
    }
  }

  function open(provider, temporary, callback) {
    const existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();
    
    pastedImages = [];
    currentProvider = provider;
    isTemporaryMode = temporary && provider.hasTemporaryMode;
    onSubmitCallback = callback;
    
    loadStyles();
    
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = createModalHTML(provider, isTemporaryMode);
    document.body.appendChild(modal);
    
    const backdrop = modal.querySelector(".modal-backdrop");
    const input = document.getElementById("ai-search-input");
    const icon = document.getElementById("modal-provider-icon");
    
    backdrop.onclick = close;
    
    if (provider.hasTemporaryMode) {
      icon.onclick = function(e) {
        e.stopPropagation();
        isTemporaryMode = !isTemporaryMode;
        updateModeUI();
      };
    }
    
    if (input) {
      input.addEventListener("input", () => autoResize(input));
      
      input.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && e.shiftKey) {
          setTimeout(() => autoResize(input), 10);
          return;
        }
        
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const text = input.value.trim();
          
          if (!text && pastedImages.length === 0) return;
          
          if (onSubmitCallback) {
            onSubmitCallback({
              text: text || "",
              images: pastedImages.length > 0 ? [...pastedImages] : null,
              temporary: isTemporaryMode,
              provider: currentProvider
            });
          }
          
          close();
        }
        
        if (e.key === "Escape") {
          close();
        }
      });
      
      setTimeout(() => input.focus(), 50);
    }
    
    document.addEventListener("paste", handlePaste);
  }

  return {
    open: open,
    close: close
  };
})();

(function() {
  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  const B = getBrowser();
  if (!B || !B.runtime || !B.runtime.onMessage) return;

  B.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "OPEN_MODAL") {
      AISearchModal.open(msg.provider, msg.temporary, (data) => {
        B.runtime.sendMessage({
          type: "SUBMIT_PROMPT",
          ...data
        });
      });
      sendResponse({ success: true });
      return true;
    }
  });
})();

