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

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const commandsToRender = ourCommands.length === 0 ? [
      { name: "ChatGPT", shortcut: "Ctrl+Shift+Y" },
      { name: "ChatGPT (Temporary)", shortcut: "Ctrl+Shift+U" },
      { name: "Claude", shortcut: "Ctrl+Shift+I" },
      { name: "Claude (Incognito)", shortcut: "Ctrl+Shift+O" }
    ] : ourCommands.map(cmd => ({
      name: COMMAND_NAMES[cmd.name] || cmd.name,
      shortcut: cmd.shortcut || "Not set"
    }));

    commandsToRender.forEach(cmd => {
      const item = document.createElement("div");
      item.className = "shortcut-item";
      
      const nameSpan = document.createElement("span");
      nameSpan.className = "shortcut-name";
      nameSpan.textContent = cmd.name;
      
      const keySpan = document.createElement("span");
      keySpan.className = "shortcut-key";
      keySpan.textContent = cmd.shortcut;
      
      item.appendChild(nameSpan);
      item.appendChild(keySpan);
      container.appendChild(item);
    });
  }

  function renderProviders() {
    const container = document.getElementById("provider-list");
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    Object.entries(PROVIDERS).forEach(([id, provider]) => {
      const item = document.createElement("div");
      item.className = "provider-item";
      
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.className = "provider-icon";
      icon.setAttribute("viewBox", "0 0 20 20");
      icon.setAttribute("fill", provider.color);
      
      const circle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle1.setAttribute("cx", "10");
      circle1.setAttribute("cy", "10");
      circle1.setAttribute("r", "8");
      circle1.setAttribute("opacity", "0.2");
      
      const circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle2.setAttribute("cx", "10");
      circle2.setAttribute("cy", "10");
      circle2.setAttribute("r", "4");
      
      icon.appendChild(circle1);
      icon.appendChild(circle2);
      
      const info = document.createElement("div");
      info.className = "provider-info";
      
      const name = document.createElement("div");
      name.className = "provider-name";
      name.textContent = provider.name;
      
      const features = document.createElement("div");
      features.className = "provider-features";
      features.textContent = provider.features;
      
      info.appendChild(name);
      info.appendChild(features);
      
      const status = document.createElement("div");
      status.className = "provider-status";
      status.setAttribute("title", "Active");
      
      item.appendChild(icon);
      item.appendChild(info);
      item.appendChild(status);
      container.appendChild(item);
    });
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

