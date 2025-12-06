(function() {
  "use strict";

  function getBrowser() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    throw new Error("No browser API available");
  }

  const B = getBrowser();

  function openModal(provider, temporary) {
    B.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;

      const tab = tabs[0];

      B.tabs.executeScript(tab.id, {
        file: "content/modal.js"
      }).then(() => {
        B.tabs.sendMessage(tab.id, {
          type: "OPEN_MODAL",
          provider: provider,
          temporary: temporary
        }).catch(err => {
          console.error("Failed to send OPEN_MODAL message:", err);
        });
      }).catch(err => {
        console.error("Failed to inject modal script:", err);
      });
    });
  }

  B.commands.onCommand.addListener((command) => {
    const result = getProviderByCommand(command);
    
    if (result) {
      const { provider, urlType } = result;
      const isTemporary = urlType === "temporary";
      openModal(provider, isTemporary);
    }
  });

  B.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "INJECT_STATUS") {
      return;
    }

    if (msg.type === "SUBMIT_PROMPT") {
      handleSubmitPrompt(msg);
      return true;
    }
  });

  function handleSubmitPrompt(msg) {
    const provider = msg.provider;
    if (!provider) {
      console.error("No provider specified");
      return;
    }

    const urlType = msg.temporary ? "temporary" : "normal";
    const url = provider.urls[urlType] || provider.urls.normal;

    B.tabs.create({ url: url }, (tab) => {
      const onTabUpdate = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          B.tabs.onUpdated.removeListener(onTabUpdate);
          injectAndSend(tab.id, provider, msg);
        }
      };

      B.tabs.onUpdated.addListener(onTabUpdate);

      B.tabs.get(tab.id, (tabInfo) => {
        if (tabInfo.status === "complete") {
          B.tabs.onUpdated.removeListener(onTabUpdate);
          injectAndSend(tab.id, provider, msg);
        }
      });
    });
  }

  function injectAndSend(tabId, provider, msg) {
    B.tabs.executeScript(tabId, {
      file: "providers/base.js"
    }).then(() => {
      return B.tabs.executeScript(tabId, {
        file: provider.injectScript
      });
    }).then(() => {
      setTimeout(() => {
        B.tabs.sendMessage(tabId, {
          type: "INJECT_MESSAGE",
          text: msg.text,
          images: msg.images
        }).then(() => {
          console.log("Message sent to", provider.name);
        }).catch(err => {
          console.error("Failed to send message:", err);
        });
      }, 500);
    }).catch(err => {
      console.error("Failed to inject scripts:", err);
    });
  }

})();
