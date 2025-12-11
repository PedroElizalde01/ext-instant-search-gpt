if (typeof window.__aiSearchModalLoaded === "undefined") {
  window.__aiSearchModalLoaded = true;

const AISearchModal = (function() {
  "use strict";

  const MAX_IMAGES = 5;
  const MODAL_ID = "ai-search-modal";
  
  let pastedImages = [];
  let currentProvider = null;
  let isTemporaryMode = false;
  let onSubmitCallback = null;
  let escHandler = null;

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

  function createModalDOM(provider, temporary) {
    const iconColor = temporary ? provider.colors.temporary : provider.colors.normal;
    const modeText = temporary && provider.hasTemporaryMode ? provider.id === "claude" ? "Incognito" : "Temporary" : "Normal";
    const modeClass = temporary ? "temporary" : "";
    
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    
    const modalBox = document.createElement("div");
    modalBox.className = "modal-box";
    
    const modeIndicator = document.createElement("span");
    modeIndicator.className = "modal-mode-indicator " + modeClass;
    modeIndicator.id = "modal-mode-indicator";
    modeIndicator.style.color = iconColor;
    modeIndicator.textContent = modeText;
    
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "modal-search-wrapper";
    
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "modal-provider-icon");
    icon.id = "modal-provider-icon";
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    icon.setAttribute("viewBox", provider.iconViewBox || "0 0 20 20");
    icon.setAttribute("fill", "currentColor");
    icon.setAttribute("title", "Click to toggle mode");
    icon.style.color = iconColor;
    
    // Parse and add icon path - extract d attribute safely
    try {
      // Extract d attribute from path element using regex (safer than innerHTML)
      const pathMatch = provider.icon.match(/d=["']([^"']+)["']/);
      if (pathMatch && pathMatch[1]) {
        const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPath.setAttribute("d", pathMatch[1]);
        icon.appendChild(iconPath);
      }
    } catch (e) {
      console.error("Failed to parse icon:", e);
    }
    
    const textarea = document.createElement("textarea");
    textarea.id = "ai-search-input";
    textarea.placeholder = "Ask " + provider.name;
    textarea.rows = 1;
    textarea.setAttribute("autofocus", "");
    
    const imageContainer = document.createElement("div");
    imageContainer.id = "image-preview-container";
    
    searchWrapper.appendChild(icon);
    searchWrapper.appendChild(textarea);
    modalBox.appendChild(modeIndicator);
    modalBox.appendChild(searchWrapper);
    modalBox.appendChild(imageContainer);
    
    backdrop.appendChild(modalBox);
    
    return backdrop;
  }

  function renderImagePreviews() {
    const container = document.getElementById("image-preview-container");
    if (!container) return;
    
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.style.marginTop = pastedImages.length > 0 ? "10px" : "0";
    
    pastedImages.forEach((dataUrl, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "image-preview-wrapper";
      
      const img = document.createElement("img");
      img.src = dataUrl;
      
      const removeBtn = document.createElement("button");
      removeBtn.className = "image-preview-remove";
      removeBtn.textContent = "×";
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
      indicator.textContent = currentProvider.id === "claude" ? "Incognito" : "Temporary";
      indicator.classList.add("temporary");
    } else {
      icon.style.color = currentProvider.colors.normal;
      indicator.style.color = currentProvider.colors.normal;
      indicator.textContent = "Normal";
      indicator.classList.remove("temporary");
    }
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    
    pastedImages = [];
    document.removeEventListener("paste", handlePaste);
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
      escHandler = null;
    }
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
    
    let preservedText = "";
    let preservedImages = [];
    
    if (existing) {
      const existingInput = existing.querySelector("#ai-search-input");
      if (existingInput) {
        preservedText = existingInput.value;
      }
      preservedImages = [...pastedImages];
      existing.remove();
    }
    
    pastedImages = preservedImages;
    
    currentProvider = provider;
    isTemporaryMode = temporary && provider.hasTemporaryMode;
    onSubmitCallback = callback;
    
    loadStyles();
    
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    const modalContent = createModalDOM(provider, isTemporaryMode);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const backdrop = modal.querySelector(".modal-backdrop");
    const modalBox = modal.querySelector(".modal-box");
    const input = document.getElementById("ai-search-input");
    const icon = document.getElementById("modal-provider-icon");
    
    backdrop.onclick = function(e) {
      if (e.target === backdrop) {
        close();
      }
    };
    
    if (modalBox) {
      modalBox.onclick = function(e) {
        e.stopPropagation();
      };
    }
    
    escHandler = function(e) {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", escHandler);
    
    if (provider.hasTemporaryMode) {
      icon.onclick = function(e) {
        e.stopPropagation();
        isTemporaryMode = !isTemporaryMode;
        updateModeUI();
      };
    }
    
    if (input) {
      if (preservedText) {
        input.value = preservedText;
        autoResize(input);
      }
      
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
    
    if (preservedImages.length > 0) {
      renderImagePreviews();
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

window.AISearchModal = AISearchModal;

} 
