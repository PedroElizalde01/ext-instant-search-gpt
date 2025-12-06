(function() {
  "use strict";

  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  const B = getBrowser();

  const PROVIDERS = {
    chatgpt: {
      name: "ChatGPT",
      color: "#10a37f",
      features: "Text, Images, Temporary Chat",
      commands: ["open-chatgpt", "open-chatgpt-temp"]
    },
    claude: {
      name: "Claude",
      color: "#cc785c",
      features: "Text, Images, Incognito",
      commands: ["open-claude", "open-claude-incognito"]
    }
  };

  const COMMAND_NAMES = {
    "open-chatgpt": "ChatGPT",
    "open-chatgpt-temp": "ChatGPT (Temporary)",
    "open-claude": "Claude",
    "open-claude-incognito": "Claude (Incognito)"
  };

  async function init() {
    await renderShortcuts();
    renderProviders();
    setupEventListeners();
  }

  async function renderShortcuts() {
    const container = document.getElementById("shortcut-list");
    if (!container) return;

    let commands = [];

    try {
      if (B && B.commands && B.commands.getAll) {
        commands = await B.commands.getAll();
      }
    } catch (e) {
      console.error("Could not get commands:", e);
    }

    const ourCommands = commands.filter(cmd => 
      cmd.name && COMMAND_NAMES[cmd.name]
    );

    if (ourCommands.length === 0) {
      container.innerHTML = `
        <div class="shortcut-item">
          <span class="shortcut-name">ChatGPT</span>
          <span class="shortcut-key">Ctrl+Shift+Y</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-name">ChatGPT (Temporary)</span>
          <span class="shortcut-key">Ctrl+Shift+U</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-name">Claude</span>
          <span class="shortcut-key">Ctrl+Shift+I</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-name">Claude (Incognito)</span>
          <span class="shortcut-key">Ctrl+Shift+O</span>
        </div>
      `;
      return;
    }

    container.innerHTML = ourCommands.map(cmd => `
      <div class="shortcut-item">
        <span class="shortcut-name">${COMMAND_NAMES[cmd.name] || cmd.name}</span>
        <span class="shortcut-key">${cmd.shortcut || "Not set"}</span>
      </div>
    `).join("");
  }

  function renderProviders() {
    const container = document.getElementById("provider-list");
    if (!container) return;

    container.innerHTML = Object.entries(PROVIDERS).map(([id, provider]) => `
      <div class="provider-item">
        <svg class="provider-icon" viewBox="0 0 20 20" fill="${provider.color}">
          <circle cx="10" cy="10" r="8" opacity="0.2"/>
          <circle cx="10" cy="10" r="4"/>
        </svg>
        <div class="provider-info">
          <div class="provider-name">${provider.name}</div>
          <div class="provider-features">${provider.features}</div>
        </div>
        <div class="provider-status" title="Active"></div>
      </div>
    `).join("");
  }

  function setupEventListeners() {
    const reportIssue = document.getElementById("report-issue");
    if (reportIssue) {
      reportIssue.addEventListener("click", (e) => {
        e.preventDefault();
        B.tabs.create({
          url: "https://github.com/yourusername/ai-instant-search/issues/new"
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

