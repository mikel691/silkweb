/* ===== Agent Data ===== */
const AGENTS = [
  { id: 'aegis', name: 'AEGIS', domain: 'Cybersecurity', memory: '500 MB', tier: 'Expert',
    actions: [
      { id: 'scan-url', name: 'Scan URL', endpoint: '/agents/aegis/scan/url', fields: [{name:'url',type:'text',placeholder:'https://example.com',required:true}] },
      { id: 'scan-ssl', name: 'SSL Audit', endpoint: '/agents/aegis/scan/ssl', fields: [{name:'domain',type:'text',placeholder:'example.com',required:true}] },
      { id: 'scan-domain', name: 'Domain Check', endpoint: '/agents/aegis/scan/domain', fields: [{name:'domain',type:'text',placeholder:'example.com',required:true}] },
      { id: 'report', name: 'Full Report', endpoint: '/agents/aegis/report', fields: [{name:'domain',type:'text',placeholder:'example.com',required:true}] }
    ]
  },
  { id: 'navigator', name: 'NAVIGATOR', domain: 'Logistics', memory: '2 TB', tier: 'Authority',
    actions: [
      { id: 'route', name: 'Calculate Route', endpoint: '/agents/navigator/route/calculate', fields: [{name:'origin',type:'text',placeholder:'New York',required:true},{name:'destination',type:'text',placeholder:'London',required:true}] },
      { id: 'customs', name: 'Customs Check', endpoint: '/agents/navigator/compliance/customs', fields: [{name:'origin_country',type:'text',placeholder:'US',required:true},{name:'destination_country',type:'text',placeholder:'UK',required:true}] },
      { id: 'carbon', name: 'Carbon Footprint', endpoint: '/agents/navigator/estimate/carbon', fields: [{name:'weight_tons',type:'number',placeholder:'1',required:true},{name:'origin',type:'text',placeholder:'New York',required:true},{name:'destination',type:'text',placeholder:'London',required:true}] }
    ]
  },
  { id: 'sentinel', name: 'SENTINEL', domain: 'IT Monitoring', memory: '1 TB', tier: 'Expert',
    actions: [
      { id: 'health', name: 'Health Check', endpoint: '/agents/sentinel/monitor/health', fields: [{name:'url',type:'text',placeholder:'https://api.example.com',required:true}] },
      { id: 'dns', name: 'DNS Check', endpoint: '/agents/sentinel/monitor/dns', fields: [{name:'domain',type:'text',placeholder:'example.com',required:true}] },
      { id: 'ssl-expiry', name: 'SSL Expiry', endpoint: '/agents/sentinel/monitor/ssl-expiry', fields: [{name:'domains',type:'text',placeholder:'example.com, api.example.com',required:true}] }
    ]
  },
  { id: 'oracle', name: 'ORACLE', domain: 'Finance', memory: '5 TB', tier: 'Authority',
    actions: [
      { id: 'fraud', name: 'Fraud Detection', endpoint: '/agents/oracle/detect/fraud', fields: [{name:'transactions',type:'textarea',placeholder:'[{"id":"1","amount":100},...]',required:true}] },
      { id: 'compliance', name: 'Compliance Check', endpoint: '/agents/oracle/compliance/check', fields: [{name:'business',type:'text',placeholder:'E-commerce company',required:true},{name:'jurisdiction',type:'text',placeholder:'US',required:true}] }
    ]
  },
  { id: 'atlas', name: 'ATLAS', domain: 'Geospatial', memory: '10 TB', tier: 'Authority',
    actions: [
      { id: 'distance', name: 'Distance Calculator', endpoint: '/agents/atlas/geo/distance', fields: [{name:'from_lat',type:'number',placeholder:'40.7128'},{name:'from_lng',type:'number',placeholder:'-74.006'},{name:'to_lat',type:'number',placeholder:'51.5074'},{name:'to_lng',type:'number',placeholder:'-0.1278'}] },
      { id: 'sun', name: 'Sunrise/Sunset', endpoint: '/agents/atlas/geo/sun', fields: [{name:'city',type:'text',placeholder:'Miami'}] }
    ]
  },
  { id: 'justice', name: 'JUSTICE', domain: 'Contract Law', memory: '3 TB', tier: 'Expert',
    actions: [
      { id: 'contract', name: 'Review Contract', endpoint: '/agents/justice/analyze/contract', fields: [{name:'text',type:'textarea',placeholder:'Paste contract text...',required:true}] },
      { id: 'nda', name: 'Review NDA', endpoint: '/agents/justice/analyze/nda', fields: [{name:'text',type:'textarea',placeholder:'Paste NDA text...',required:true}] }
    ]
  },
  { id: 'shield', name: 'SHIELD', domain: 'Personal Injury', memory: '2 TB', tier: 'Expert',
    actions: [
      { id: 'evaluate', name: 'Evaluate Case', endpoint: '/agents/shield/evaluate/case', fields: [{name:'type',type:'text',placeholder:'car accident'},{name:'injuries',type:'text',placeholder:'whiplash, back pain'},{name:'state',type:'text',placeholder:'FL'}] },
      { id: 'damages', name: 'Calculate Damages', endpoint: '/agents/shield/calculate/damages', fields: [{name:'medical_costs',type:'number',placeholder:'15000'},{name:'lost_wages',type:'number',placeholder:'8000'},{name:'severity',type:'text',placeholder:'moderate'}] }
    ]
  },
  { id: 'fortress', name: 'FORTRESS', domain: 'Criminal Defense', memory: '4 TB', tier: 'Expert',
    actions: [
      { id: 'charge', name: 'Analyze Charge', endpoint: '/agents/fortress/analyze/charge', fields: [{name:'charge',type:'text',placeholder:'DUI',required:true},{name:'jurisdiction',type:'text',placeholder:'federal or state name'}] },
      { id: 'rights', name: 'Know Your Rights', endpoint: '/agents/fortress/rights/explain', fields: [{name:'situation',type:'text',placeholder:'traffic stop, arrest, search...',required:true}] }
    ]
  },
  { id: 'design', name: 'DESIGN', domain: 'Graphics', memory: '1 TB', tier: 'Expert',
    actions: [
      { id: 'social', name: 'Social Card', endpoint: '/agents/design/design/social-card', fields: [{name:'headline',type:'text',placeholder:'Your headline',required:true},{name:'subheadline',type:'text',placeholder:'Your subheadline'}] }
    ]
  },
  { id: 'medic', name: 'MEDIC', domain: 'Healthcare', memory: '3 TB', tier: 'Expert',
    actions: [
      { id: 'symptoms', name: 'Symptom Check', endpoint: '/agents/medic/analyze/symptoms', fields: [{name:'symptoms',type:'text',placeholder:'headache, fever, fatigue',required:true}] },
      { id: 'interactions', name: 'Drug Interactions', endpoint: '/agents/medic/check/interactions', fields: [{name:'medications',type:'text',placeholder:'ibuprofen, aspirin, warfarin',required:true}] }
    ]
  },
  { id: 'architect', name: 'ARCHITECT', domain: 'Code & DevOps', memory: '2 TB', tier: 'Expert',
    actions: [
      { id: 'review', name: 'Code Review', endpoint: '/agents/architect/review/code', fields: [{name:'code',type:'textarea',placeholder:'Paste code...',required:true},{name:'language',type:'text',placeholder:'javascript'}] },
      { id: 'techdebt', name: 'Tech Debt Score', endpoint: '/agents/architect/score/techdebt', fields: [{name:'files',type:'number',placeholder:'150'},{name:'lines',type:'number',placeholder:'25000'},{name:'test_coverage',type:'number',placeholder:'45'}] }
    ]
  },
  { id: 'broker', name: 'BROKER', domain: 'Real Estate', memory: '5 TB', tier: 'Authority',
    actions: [
      { id: 'property', name: 'Property Analysis', endpoint: '/agents/broker/analyze/property', fields: [{name:'sqft',type:'number',placeholder:'1500'},{name:'beds',type:'number',placeholder:'3'},{name:'baths',type:'number',placeholder:'2'},{name:'zip',type:'text',placeholder:'33101'}] },
      { id: 'roi', name: 'ROI Calculator', endpoint: '/agents/broker/calculate/roi', fields: [{name:'purchase_price',type:'number',placeholder:'350000'},{name:'monthly_rent',type:'number',placeholder:'2500'},{name:'expenses',type:'number',placeholder:'800'}] }
    ]
  },
  { id: 'scribe', name: 'SCRIBE', domain: 'Content & Copy', memory: '1 TB', tier: 'Expert',
    actions: [
      { id: 'blog', name: 'Blog Outline', endpoint: '/agents/scribe/generate/blog', fields: [{name:'topic',type:'text',placeholder:'AI agent marketplaces',required:true},{name:'audience',type:'text',placeholder:'developers'}] },
      { id: 'social', name: 'Social Posts', endpoint: '/agents/scribe/generate/social', fields: [{name:'message',type:'text',placeholder:'We just launched...',required:true},{name:'platform',type:'text',placeholder:'twitter'}] }
    ]
  },
  { id: 'phantom', name: 'PHANTOM', domain: 'OSINT', memory: '3 TB', tier: 'Expert',
    actions: [
      { id: 'domain', name: 'Investigate Domain', endpoint: '/agents/phantom/investigate/domain', fields: [{name:'domain',type:'text',placeholder:'example.com',required:true}] },
      { id: 'email', name: 'Investigate Email', endpoint: '/agents/phantom/investigate/email', fields: [{name:'email',type:'text',placeholder:'user@example.com',required:true}] }
    ]
  },
  { id: 'diplomat', name: 'DIPLOMAT', domain: 'HR & Compliance', memory: '2 TB', tier: 'Expert',
    actions: [
      { id: 'salary', name: 'Salary Benchmark', endpoint: '/agents/diplomat/benchmark/salary', fields: [{name:'title',type:'text',placeholder:'Software Engineer',required:true},{name:'location',type:'text',placeholder:'San Francisco'},{name:'level',type:'text',placeholder:'senior'}] },
      { id: 'job', name: 'Analyze Job Post', endpoint: '/agents/diplomat/analyze/job', fields: [{name:'text',type:'textarea',placeholder:'Paste job description...',required:true}] }
    ]
  },
  { id: 'merchant', name: 'MERCHANT', domain: 'E-Commerce', memory: '2 TB', tier: 'Expert',
    actions: [
      { id: 'listing', name: 'Optimize Listing', endpoint: '/agents/merchant/optimize/listing', fields: [{name:'title',type:'text',placeholder:'Product title',required:true},{name:'description',type:'textarea',placeholder:'Product description'},{name:'category',type:'text',placeholder:'Electronics'}] },
      { id: 'pricing', name: 'Pricing Analysis', endpoint: '/agents/merchant/analyze/pricing', fields: [{name:'cost',type:'number',placeholder:'25',required:true},{name:'competitor_prices',type:'text',placeholder:'39.99, 44.99, 34.99'}] }
    ]
  },
  { id: 'tutor', name: 'TUTOR', domain: 'Education', memory: '2 TB', tier: 'Expert',
    actions: [
      { id: 'quiz', name: 'Generate Quiz', endpoint: '/agents/tutor/generate/quiz', fields: [{name:'topic',type:'text',placeholder:'World War 2',required:true},{name:'difficulty',type:'text',placeholder:'medium'},{name:'count',type:'number',placeholder:'10'}] },
      { id: 'flashcards', name: 'Flashcards', endpoint: '/agents/tutor/generate/flashcards', fields: [{name:'topic',type:'text',placeholder:'Spanish vocabulary',required:true}] }
    ]
  },
  { id: 'climate', name: 'CLIMATE', domain: 'Sustainability', memory: '3 TB', tier: 'Expert',
    actions: [
      { id: 'carbon', name: 'Carbon Calculator', endpoint: '/agents/climate/calculate/carbon', fields: [{name:'electricity_kwh',type:'number',placeholder:'1000'},{name:'gas_therms',type:'number',placeholder:'50'},{name:'miles_driven',type:'number',placeholder:'12000'}] },
      { id: 'esg', name: 'ESG Score', endpoint: '/agents/climate/score/esg', fields: [{name:'company',type:'text',placeholder:'Company name',required:true}] }
    ]
  },
  { id: 'signal', name: 'SIGNAL', domain: 'PR & Comms', memory: '1 TB', tier: 'Expert',
    actions: [
      { id: 'press', name: 'Press Release', endpoint: '/agents/signal/generate/pressrelease', fields: [{name:'product',type:'text',placeholder:'Product name',required:true},{name:'description',type:'textarea',placeholder:'What happened / what launched'}] },
      { id: 'crisis', name: 'Crisis Response', endpoint: '/agents/signal/analyze/crisis', fields: [{name:'description',type:'textarea',placeholder:'Describe the crisis...',required:true}] }
    ]
  },
  { id: 'forge', name: 'FORGE', domain: 'Manufacturing', memory: '4 TB', tier: 'Authority',
    actions: [
      { id: 'supplier', name: 'Supplier Score', endpoint: '/agents/forge/score/supplier', fields: [{name:'delivery_rate',type:'number',placeholder:'95'},{name:'quality_rate',type:'number',placeholder:'98'},{name:'pricing_competitiveness',type:'number',placeholder:'80'}] },
      { id: 'quality', name: 'Quality Analysis', endpoint: '/agents/forge/analyze/quality', fields: [{name:'defects',type:'textarea',placeholder:'[{"type":"scratch","count":15},...]',required:true}] }
    ]
  }
];

/* ===== State ===== */
let currentView = 'list'; // 'list' | 'action' | 'settings'
let selectedAgent = null;
let selectedAction = null;

/* ===== DOM Elements ===== */
const searchInput = document.getElementById('search-input');
const agentListEl = document.getElementById('agent-list');
const actionPanel = document.getElementById('action-panel');
const settingsPanel = document.getElementById('settings-panel');
const actionForm = document.getElementById('action-form');
const resultsPanel = document.getElementById('results-panel');
const resultsContent = document.getElementById('results-content');
const backBtn = document.getElementById('back-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const copyResultsBtn = document.getElementById('copy-results');
const saveSettingsBtn = document.getElementById('save-settings');

/* ===== Initialize ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderAgentList(AGENTS);
  loadSettings();

  searchInput.addEventListener('input', handleSearch);
  backBtn.addEventListener('click', showAgentList);
  settingsBtn.addEventListener('click', showSettings);
  settingsBackBtn.addEventListener('click', showAgentList);
  copyResultsBtn.addEventListener('click', copyResults);
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Focus search on open
  searchInput.focus();
});

/* ===== Search ===== */
function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    renderAgentList(AGENTS);
    return;
  }
  const filtered = AGENTS.filter(agent =>
    agent.name.toLowerCase().includes(query) ||
    agent.domain.toLowerCase().includes(query) ||
    agent.id.toLowerCase().includes(query) ||
    agent.actions.some(a => a.name.toLowerCase().includes(query))
  );
  renderAgentList(filtered);
}

/* ===== Render Agent List ===== */
function renderAgentList(agents) {
  if (agents.length === 0) {
    agentListEl.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <div class="empty-title">No agents found</div>
        <div class="empty-desc">Try a different search term</div>
      </div>`;
    return;
  }

  agentListEl.innerHTML = agents.map(agent => `
    <div class="agent-card" data-agent-id="${agent.id}">
      <div class="agent-card-header" onclick="toggleAgent('${agent.id}')">
        <div class="agent-info">
          <div class="agent-name-row">
            <span class="agent-name">${agent.name}</span>
            <span class="agent-domain">${agent.domain}</span>
          </div>
        </div>
        <div class="agent-badges">
          <span class="badge badge-memory">${agent.memory}</span>
          <span class="badge badge-tier ${agent.tier === 'Authority' ? 'authority' : ''}">${agent.tier}</span>
          <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="agent-actions">
        ${agent.actions.map(action => `
          <button class="action-chip" onclick="openAction('${agent.id}','${action.id}')">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" opacity="0.6">
              <path d="M8 5L3 8V2l5 3z"/>
            </svg>
            ${action.name}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ===== Toggle Agent Expand ===== */
function toggleAgent(agentId) {
  const card = document.querySelector(`[data-agent-id="${agentId}"]`);
  const wasExpanded = card.classList.contains('expanded');

  // Collapse all
  document.querySelectorAll('.agent-card.expanded').forEach(c => c.classList.remove('expanded'));

  // Toggle clicked
  if (!wasExpanded) {
    card.classList.add('expanded');
  }
}

/* ===== Open Action Form ===== */
function openAction(agentId, actionId) {
  selectedAgent = AGENTS.find(a => a.id === agentId);
  selectedAction = selectedAgent.actions.find(a => a.id === actionId);

  document.getElementById('action-agent-name').textContent = selectedAgent.name;
  document.getElementById('action-name').textContent = selectedAction.name;

  // Build form fields
  let formHTML = selectedAction.fields.map(field => `
    <div class="form-group">
      <label>${field.name.replace(/_/g, ' ')}${field.required ? '<span class="required-star">*</span>' : ''}</label>
      ${field.type === 'textarea'
        ? `<textarea name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`
        : `<input type="${field.type}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`
      }
    </div>
  `).join('');

  formHTML += `<button type="submit" class="run-btn" id="run-btn">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M10 6L3 10V2l7 4z"/></svg>
    Run ${selectedAction.name}
  </button>`;

  actionForm.innerHTML = formHTML;
  actionForm.onsubmit = handleSubmit;

  // Hide results from previous run
  resultsPanel.classList.add('hidden');

  // Switch view
  agentListEl.classList.add('hidden');
  document.querySelector('.search-container').classList.add('hidden');
  settingsPanel.classList.add('hidden');
  actionPanel.classList.remove('hidden');

  currentView = 'action';
}

/* ===== Show Agent List ===== */
function showAgentList() {
  agentListEl.classList.remove('hidden');
  document.querySelector('.search-container').classList.remove('hidden');
  actionPanel.classList.add('hidden');
  settingsPanel.classList.add('hidden');
  currentView = 'list';
  searchInput.focus();
}

/* ===== Show Settings ===== */
function showSettings() {
  agentListEl.classList.add('hidden');
  document.querySelector('.search-container').classList.add('hidden');
  actionPanel.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
  currentView = 'settings';
}

/* ===== Form Submission ===== */
async function handleSubmit(e) {
  e.preventDefault();

  const runBtn = document.getElementById('run-btn');
  const formData = new FormData(actionForm);
  const payload = {};

  for (const [key, value] of formData.entries()) {
    const field = selectedAction.fields.find(f => f.name === key);
    if (field && field.type === 'number' && value) {
      payload[key] = parseFloat(value);
    } else {
      payload[key] = value;
    }
  }

  // Loading state
  runBtn.disabled = true;
  runBtn.innerHTML = '<div class="spinner"></div> Running...';
  resultsPanel.classList.add('hidden');

  try {
    const result = await callAgent(selectedAction.endpoint, payload);
    displayResults(result);
  } catch (err) {
    displayError(err.message || 'Request failed');
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M10 6L3 10V2l7 4z"/></svg> Run ${selectedAction.name}`;
  }
}

/* ===== API Call ===== */
async function callAgent(endpoint, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'API_CALL', endpoint, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response && response.data ? response.data : response);
      }
    );
  });
}

/* ===== Display Results ===== */
function displayResults(data) {
  resultsPanel.classList.remove('hidden');
  resultsContent.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
}

function displayError(message) {
  resultsPanel.classList.remove('hidden');
  resultsContent.innerHTML = '';
  resultsContent.className = '';
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  resultsContent.appendChild(errorEl);
}

/* ===== Syntax Highlighting ===== */
function syntaxHighlight(json) {
  if (!json) return '';
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

/* ===== Copy Results ===== */
function copyResults() {
  const text = resultsContent.textContent;
  navigator.clipboard.writeText(text).then(() => {
    copyResultsBtn.classList.add('copied');
    setTimeout(() => copyResultsBtn.classList.remove('copied'), 1500);
  });
}

/* ===== Settings ===== */
function loadSettings() {
  chrome.storage.local.get(['apiBaseUrl', 'apiKey', 'showFab'], (data) => {
    if (data.apiBaseUrl) {
      document.getElementById('api-base-url').value = data.apiBaseUrl;
    }
    if (data.apiKey) {
      document.getElementById('api-key').value = data.apiKey;
    }
    if (data.showFab !== undefined) {
      document.getElementById('show-fab').checked = data.showFab;
    }
  });
}

function saveSettings() {
  const apiBaseUrl = document.getElementById('api-base-url').value.trim();
  const apiKey = document.getElementById('api-key').value.trim();
  const showFab = document.getElementById('show-fab').checked;

  chrome.storage.local.set({ apiBaseUrl, apiKey, showFab }, () => {
    saveSettingsBtn.textContent = 'Saved!';
    saveSettingsBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    setTimeout(() => {
      saveSettingsBtn.textContent = 'Save Settings';
      saveSettingsBtn.style.background = '';
    }, 1500);
  });
}
