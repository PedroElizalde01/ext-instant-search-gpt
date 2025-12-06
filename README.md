# AI Instant Search

A browser extension to quickly send prompts to AI assistants like ChatGPT and Claude. Supports images and temporary/incognito chat modes.

## Features

- **Multiple AI Providers**: ChatGPT and Claude (easily extensible)
- **Keyboard Shortcuts**: Instant access from any webpage
- **Image Support**: Paste up to 5 images from clipboard
- **Temporary/Incognito Mode**: Toggle between normal and private chats
- **Clean Modal UI**: Minimal, dark-themed search interface

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+1` | Open ChatGPT |
| `Ctrl+Shift+2` | Open ChatGPT (Temporary) |
| `Ctrl+Shift+3` | Open Claude |
| `Ctrl+Shift+4` | Open Claude (Incognito) |

> **Tip**: Click the AI icon in the modal to toggle between normal and temporary/incognito modes.

## How to Use

1. Press a keyboard shortcut on any webpage
2. Type your prompt in the modal
3. Paste images if needed (Ctrl+V, up to 5)
4. Press **Enter** to send
5. A new tab opens with your message auto-submitted

## Installation

### Firefox / Zen Browser / LibreWolf

#### From Firefox Add-ons (AMO)
Coming soon...

#### Manual Installation (Temporary)
1. Open Firefox → `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `manifest.json` from this folder

### Chrome / Edge / Brave
Not currently supported (uses Manifest V2)

## Project Structure

```
ai-instant-search/
├── manifest.json           # Extension manifest
├── background.js           # Main orchestrator
├── config/
│   └── providers.js        # AI provider configurations
├── content/
│   ├── modal.css           # Modal styles
│   └── modal.js            # Modal UI logic
├── providers/
│   ├── base.js             # Shared utilities
│   ├── chatgpt.js          # ChatGPT injection logic
│   └── claude.js           # Claude injection logic
├── popup/
│   ├── popup.html          # Settings popup
│   ├── popup.css           # Popup styles
│   └── popup.js            # Popup logic
└── icons/
    └── icon.svg            # Extension icon
```

## Adding a New Provider

1. **Add configuration** to `config/providers.js`:
```javascript
newprovider: {
  id: "newprovider",
  name: "New Provider",
  urls: {
    normal: "https://newprovider.com/chat",
    temporary: "https://newprovider.com/chat?temp=true"
  },
  commands: {
    "open-newprovider": "normal",
    "open-newprovider-temp": "temporary"
  },
  injectScript: "providers/newprovider.js",
  // ... icon, colors, selectors
}
```

2. **Create inject script** at `providers/newprovider.js` (copy from chatgpt.js and update selectors)

3. **Add commands** to `manifest.json`:
```json
"open-newprovider": {
  "suggested_key": { "default": "Ctrl+Shift+X" },
  "description": "Open New Provider"
}
```

4. **Add URL permission** to `manifest.json`:
```json
"permissions": [..., "*://newprovider.com/*"]
```

## Browser Support

| Browser | Supported |
|---------|-----------|
| Firefox | ✅ |
| Zen Browser | ✅ |
| LibreWolf | ✅ |
| Chrome | ❌ |
| Edge | ❌ |
| Brave | ❌ |

## License

MIT
