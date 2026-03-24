# SilkWeb Agents - Chrome Extension

Access 20 specialized AI agents from any browser tab. Security scans, legal review, financial analysis, and more -- all one click away.

## Features

- **20 AI Agents** across cybersecurity, legal, finance, healthcare, DevOps, HR, e-commerce, education, and more
- **Popup Interface** with search, agent list, expandable actions, input forms, and inline JSON results
- **Floating Button** on every page with a quick-access agent picker overlay
- **Right-Click Context Menus**: Scan pages with AEGIS, analyze selected text with JUSTICE, investigate domains with PHANTOM
- **Smart Auto-Fill**: Current page URL and selected text are automatically injected into relevant agent actions
- **Result Caching**: Recent API results are cached locally for 5 minutes
- **Dark Theme**: Matches the SilkWeb brand (purple #6366f1, green #10B981, dark background #06060b)
- **Settings**: Configurable API base URL, API key, and floating button visibility

## Installation (Developer Mode)

1. Clone or download this directory
2. Generate icon PNGs (see Icons section below)
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked**
6. Select the `chrome-extension/` directory
7. The SilkWeb Agents icon will appear in your toolbar

## Generating Icons

Before loading the extension, generate the icon PNG files:

**Option A -- Node.js (no dependencies):**
```bash
cd icons/
node create-icons-node.js
```

**Option B -- Browser:**
1. Open `icons/generate-icons.html` in Chrome
2. Click "Generate & Download Icons"
3. Move the downloaded files into the `icons/` directory

## Usage

### Popup
Click the SilkWeb icon in the Chrome toolbar to open the popup. Search for agents, expand them to see available actions, click an action to open the input form, and hit Run.

### Floating Button
A small spider web button appears in the bottom-right corner of every page. Click it to open a compact agent picker. Actions auto-fill with the current page URL or selected text where applicable.

### Context Menus
Right-click on any page to access:
- **Scan this page with AEGIS** -- runs a URL security scan
- **Analyze selected text with JUSTICE** -- analyzes selected text as a contract
- **Check domain with PHANTOM** -- investigates the current domain

### Settings
Click the gear icon in the popup to configure:
- **API Base URL** -- defaults to `https://api.silkweb.io`
- **API Key** -- your SilkWeb API key for authenticated requests
- **Show floating button** -- toggle the in-page floating button

## Publishing to Chrome Web Store

1. Generate production icons (see above)
2. Create a ZIP of the `chrome-extension/` directory (exclude `icons/generate-*` helper files)
3. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Click **New Item** and upload the ZIP
5. Fill in the listing details:
   - **Name**: SilkWeb Agents
   - **Description**: Access 20 specialized AI agents from any browser tab
   - **Category**: Productivity
   - **Screenshots**: Capture the popup, the overlay on a page, and the context menu
6. Submit for review (typically 1-3 business days)

## Agent Roster

| Agent | Domain | Tier | Key Actions |
|-------|--------|------|-------------|
| AEGIS | Cybersecurity | Expert | URL Scan, SSL Audit, Domain Check, Full Report |
| NAVIGATOR | Logistics | Authority | Route Calculator, Customs Check, Carbon Footprint |
| SENTINEL | IT Monitoring | Expert | Health Check, DNS Check, SSL Expiry |
| ORACLE | Finance | Authority | Fraud Detection, Compliance Check |
| ATLAS | Geospatial | Authority | Distance Calculator, Sunrise/Sunset |
| JUSTICE | Contract Law | Expert | Contract Review, NDA Review |
| SHIELD | Personal Injury | Expert | Case Evaluation, Damages Calculator |
| FORTRESS | Criminal Defense | Expert | Charge Analysis, Know Your Rights |
| DESIGN | Graphics | Expert | Social Card Generator |
| MEDIC | Healthcare | Expert | Symptom Check, Drug Interactions |
| ARCHITECT | Code & DevOps | Expert | Code Review, Tech Debt Score |
| BROKER | Real Estate | Authority | Property Analysis, ROI Calculator |
| SCRIBE | Content & Copy | Expert | Blog Outline, Social Posts |
| PHANTOM | OSINT | Expert | Domain Investigation, Email Investigation |
| DIPLOMAT | HR & Compliance | Expert | Salary Benchmark, Job Post Analysis |
| MERCHANT | E-Commerce | Expert | Listing Optimizer, Pricing Analysis |
| TUTOR | Education | Expert | Quiz Generator, Flashcards |
| CLIMATE | Sustainability | Expert | Carbon Calculator, ESG Score |
| SIGNAL | PR & Comms | Expert | Press Release, Crisis Response |
| FORGE | Manufacturing | Authority | Supplier Score, Quality Analysis |

## File Structure

```
chrome-extension/
  manifest.json              # Extension manifest (Manifest V3)
  popup/
    popup.html               # Popup UI
    popup.css                # Popup styles
    popup.js                 # Popup logic + agent data
  background/
    service-worker.js        # Context menus, API calls, caching
  content/
    content.js               # Floating button + overlay
    content.css              # Content script styles
  icons/
    icon16.png               # 16x16 toolbar icon
    icon48.png               # 48x48 extension page icon
    icon128.png              # 128x128 store icon
    generate-icons.html      # Browser-based icon generator
    create-icons-node.js     # Node.js icon generator
```

## License

Part of the SilkWeb platform. All rights reserved.
