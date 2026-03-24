/* ===== SilkWeb Agents - Content Script ===== */

(function () {
  'use strict';

  // Prevent double injection
  if (document.getElementById('silkweb-fab')) return;

  /* ===== Agent Data (compact for content script) ===== */
  const AGENTS = [
    { id:'aegis', name:'AEGIS', domain:'Cybersecurity', tier:'Expert', actions:[
      {id:'scan-url',name:'Scan URL',endpoint:'/agents/aegis/scan/url'},
      {id:'scan-ssl',name:'SSL Audit',endpoint:'/agents/aegis/scan/ssl'},
      {id:'scan-domain',name:'Domain Check',endpoint:'/agents/aegis/scan/domain'},
      {id:'report',name:'Full Report',endpoint:'/agents/aegis/report'}
    ]},
    { id:'navigator', name:'NAVIGATOR', domain:'Logistics', tier:'Authority', actions:[
      {id:'route',name:'Calculate Route',endpoint:'/agents/navigator/route/calculate'},
      {id:'customs',name:'Customs Check',endpoint:'/agents/navigator/compliance/customs'}
    ]},
    { id:'sentinel', name:'SENTINEL', domain:'IT Monitoring', tier:'Expert', actions:[
      {id:'health',name:'Health Check',endpoint:'/agents/sentinel/monitor/health'},
      {id:'dns',name:'DNS Check',endpoint:'/agents/sentinel/monitor/dns'}
    ]},
    { id:'oracle', name:'ORACLE', domain:'Finance', tier:'Authority', actions:[
      {id:'fraud',name:'Fraud Detection',endpoint:'/agents/oracle/detect/fraud'},
      {id:'compliance',name:'Compliance Check',endpoint:'/agents/oracle/compliance/check'}
    ]},
    { id:'atlas', name:'ATLAS', domain:'Geospatial', tier:'Authority', actions:[
      {id:'distance',name:'Distance Calculator',endpoint:'/agents/atlas/geo/distance'},
      {id:'sun',name:'Sunrise/Sunset',endpoint:'/agents/atlas/geo/sun'}
    ]},
    { id:'justice', name:'JUSTICE', domain:'Contract Law', tier:'Expert', actions:[
      {id:'contract',name:'Review Contract',endpoint:'/agents/justice/analyze/contract'},
      {id:'nda',name:'Review NDA',endpoint:'/agents/justice/analyze/nda'}
    ]},
    { id:'shield', name:'SHIELD', domain:'Personal Injury', tier:'Expert', actions:[
      {id:'evaluate',name:'Evaluate Case',endpoint:'/agents/shield/evaluate/case'},
      {id:'damages',name:'Calculate Damages',endpoint:'/agents/shield/calculate/damages'}
    ]},
    { id:'fortress', name:'FORTRESS', domain:'Criminal Defense', tier:'Expert', actions:[
      {id:'charge',name:'Analyze Charge',endpoint:'/agents/fortress/analyze/charge'},
      {id:'rights',name:'Know Your Rights',endpoint:'/agents/fortress/rights/explain'}
    ]},
    { id:'design', name:'DESIGN', domain:'Graphics', tier:'Expert', actions:[
      {id:'social',name:'Social Card',endpoint:'/agents/design/design/social-card'}
    ]},
    { id:'medic', name:'MEDIC', domain:'Healthcare', tier:'Expert', actions:[
      {id:'symptoms',name:'Symptom Check',endpoint:'/agents/medic/analyze/symptoms'},
      {id:'interactions',name:'Drug Interactions',endpoint:'/agents/medic/check/interactions'}
    ]},
    { id:'architect', name:'ARCHITECT', domain:'Code & DevOps', tier:'Expert', actions:[
      {id:'review',name:'Code Review',endpoint:'/agents/architect/review/code'},
      {id:'techdebt',name:'Tech Debt Score',endpoint:'/agents/architect/score/techdebt'}
    ]},
    { id:'broker', name:'BROKER', domain:'Real Estate', tier:'Authority', actions:[
      {id:'property',name:'Property Analysis',endpoint:'/agents/broker/analyze/property'},
      {id:'roi',name:'ROI Calculator',endpoint:'/agents/broker/calculate/roi'}
    ]},
    { id:'scribe', name:'SCRIBE', domain:'Content & Copy', tier:'Expert', actions:[
      {id:'blog',name:'Blog Outline',endpoint:'/agents/scribe/generate/blog'},
      {id:'social',name:'Social Posts',endpoint:'/agents/scribe/generate/social'}
    ]},
    { id:'phantom', name:'PHANTOM', domain:'OSINT', tier:'Expert', actions:[
      {id:'domain',name:'Investigate Domain',endpoint:'/agents/phantom/investigate/domain'},
      {id:'email',name:'Investigate Email',endpoint:'/agents/phantom/investigate/email'}
    ]},
    { id:'diplomat', name:'DIPLOMAT', domain:'HR & Compliance', tier:'Expert', actions:[
      {id:'salary',name:'Salary Benchmark',endpoint:'/agents/diplomat/benchmark/salary'},
      {id:'job',name:'Analyze Job Post',endpoint:'/agents/diplomat/analyze/job'}
    ]},
    { id:'merchant', name:'MERCHANT', domain:'E-Commerce', tier:'Expert', actions:[
      {id:'listing',name:'Optimize Listing',endpoint:'/agents/merchant/optimize/listing'},
      {id:'pricing',name:'Pricing Analysis',endpoint:'/agents/merchant/analyze/pricing'}
    ]},
    { id:'tutor', name:'TUTOR', domain:'Education', tier:'Expert', actions:[
      {id:'quiz',name:'Generate Quiz',endpoint:'/agents/tutor/generate/quiz'},
      {id:'flashcards',name:'Flashcards',endpoint:'/agents/tutor/generate/flashcards'}
    ]},
    { id:'climate', name:'CLIMATE', domain:'Sustainability', tier:'Expert', actions:[
      {id:'carbon',name:'Carbon Calculator',endpoint:'/agents/climate/calculate/carbon'},
      {id:'esg',name:'ESG Score',endpoint:'/agents/climate/score/esg'}
    ]},
    { id:'signal', name:'SIGNAL', domain:'PR & Comms', tier:'Expert', actions:[
      {id:'press',name:'Press Release',endpoint:'/agents/signal/generate/pressrelease'},
      {id:'crisis',name:'Crisis Response',endpoint:'/agents/signal/analyze/crisis'}
    ]},
    { id:'forge', name:'FORGE', domain:'Manufacturing', tier:'Authority', actions:[
      {id:'supplier',name:'Supplier Score',endpoint:'/agents/forge/score/supplier'},
      {id:'quality',name:'Quality Analysis',endpoint:'/agents/forge/analyze/quality'}
    ]}
  ];

  let overlayOpen = false;
  let expandedAgent = null;

  /* ===== Check if FAB should show ===== */
  chrome.storage.local.get(['showFab', 'fabDismissed'], (data) => {
    if (data.showFab === false) return;
    if (data.fabDismissed) return;
    createFab();
    createOverlay();
    createToast();
  });

  /* ===== Create FAB ===== */
  function createFab() {
    const fab = document.createElement('button');
    fab.id = 'silkweb-fab';
    fab.title = 'SilkWeb Agents';
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5"/>
        <path d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07" stroke="white" stroke-width="0.7" opacity="0.5"/>
        <circle cx="12" cy="12" r="6" stroke="white" stroke-width="0.8" fill="none" opacity="0.4"/>
        <circle cx="12" cy="12" r="2.5" fill="white"/>
      </svg>
    `;
    fab.addEventListener('click', toggleOverlay);
    document.body.appendChild(fab);
  }

  /* ===== Create Overlay ===== */
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'silkweb-overlay';
    overlay.innerHTML = `
      <div class="sw-header">
        <div class="sw-header-left">
          <span class="sw-logo">SilkWeb</span>
          <span class="sw-badge">20 Agents</span>
        </div>
        <button class="sw-close" id="silkweb-close">&times;</button>
      </div>
      <div class="sw-search-wrap">
        <svg class="sw-search-icon" width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
          <path d="M10.067 8.933a5.5 5.5 0 10-1.134 1.134l3.467 3.466a.8.8 0 001.133-1.133l-3.466-3.467zM6 10a4 4 0 110-8 4 4 0 010 8z"/>
        </svg>
        <input type="text" class="sw-search" id="silkweb-search" placeholder="Search agents..." autocomplete="off">
      </div>
      <div class="sw-agents" id="silkweb-agents"></div>
    `;
    document.body.appendChild(overlay);

    // Close button
    document.getElementById('silkweb-close').addEventListener('click', () => {
      closeOverlay();
    });

    // Search
    document.getElementById('silkweb-search').addEventListener('input', (e) => {
      renderOverlayAgents(e.target.value.toLowerCase().trim());
    });

    renderOverlayAgents('');
  }

  /* ===== Create Toast ===== */
  function createToast() {
    const toast = document.createElement('div');
    toast.id = 'silkweb-toast';
    toast.innerHTML = `
      <div class="sw-toast-header">
        <span class="sw-toast-title"></span>
        <button class="sw-toast-close">&times;</button>
      </div>
      <div class="sw-toast-body"></div>
    `;
    document.body.appendChild(toast);

    toast.querySelector('.sw-toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }

  /* ===== Render Overlay Agents ===== */
  function renderOverlayAgents(query) {
    const container = document.getElementById('silkweb-agents');
    if (!container) return;

    const filtered = query
      ? AGENTS.filter(a =>
          a.name.toLowerCase().includes(query) ||
          a.domain.toLowerCase().includes(query) ||
          a.actions.some(act => act.name.toLowerCase().includes(query))
        )
      : AGENTS;

    container.innerHTML = filtered.map(agent => `
      <div>
        <div class="sw-agent" data-id="${agent.id}">
          <div>
            <span class="sw-agent-name">${agent.name}</span>
            <span class="sw-agent-domain">${agent.domain}</span>
          </div>
          <span class="sw-agent-tier ${agent.tier === 'Authority' ? 'authority' : ''}">${agent.tier}</span>
        </div>
        <div class="sw-action-list" id="sw-actions-${agent.id}" style="display:none"></div>
      </div>
    `).join('');

    // Bind clicks
    container.querySelectorAll('.sw-agent').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const actionsEl = document.getElementById(`sw-actions-${id}`);
        if (expandedAgent === id) {
          actionsEl.style.display = 'none';
          expandedAgent = null;
          return;
        }
        // Collapse previous
        if (expandedAgent) {
          const prev = document.getElementById(`sw-actions-${expandedAgent}`);
          if (prev) prev.style.display = 'none';
        }
        expandedAgent = id;
        const agent = AGENTS.find(a => a.id === id);
        actionsEl.innerHTML = agent.actions.map(action =>
          `<button class="sw-action-chip" data-endpoint="${action.endpoint}" data-agent="${agent.name}" data-action="${action.name}">${action.name}</button>`
        ).join('');
        actionsEl.style.display = 'flex';

        // Bind action clicks
        actionsEl.querySelectorAll('.sw-action-chip').forEach(chip => {
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            handleOverlayAction(
              chip.dataset.endpoint,
              chip.dataset.agent,
              chip.dataset.action
            );
          });
        });
      });
    });
  }

  /* ===== Handle Overlay Action ===== */
  function handleOverlayAction(endpoint, agentName, actionName) {
    // Build auto-fill payload from page context
    const payload = {};
    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname;
    const selectedText = window.getSelection().toString().trim();

    // Auto-fill based on endpoint
    if (endpoint.includes('/scan/url') || endpoint.includes('/monitor/health')) {
      payload.url = currentUrl;
    }
    if (endpoint.includes('/scan/ssl') || endpoint.includes('/scan/domain') ||
        endpoint.includes('/monitor/dns') || endpoint.includes('/investigate/domain') ||
        endpoint.includes('/report')) {
      payload.domain = currentDomain;
    }
    if (endpoint.includes('/monitor/ssl-expiry')) {
      payload.domains = currentDomain;
    }
    if (selectedText && (endpoint.includes('/analyze/contract') || endpoint.includes('/analyze/nda') ||
        endpoint.includes('/analyze/job') || endpoint.includes('/review/code') ||
        endpoint.includes('/generate/'))) {
      payload.text = selectedText;
      payload.code = selectedText;
      payload.message = selectedText;
      payload.topic = selectedText.substring(0, 100);
    }

    // Show loading toast
    showToast(agentName, 'Running ' + actionName + '...', false);

    // Send to background
    chrome.runtime.sendMessage(
      { type: 'API_CALL', endpoint, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          showToast(agentName, chrome.runtime.lastError.message, true);
          return;
        }
        if (response && response.error) {
          showToast(agentName, response.error, true);
          return;
        }
        const data = response && response.data ? response.data : response;
        showToast(agentName, JSON.stringify(data, null, 2), false);
      }
    );

    closeOverlay();
  }

  /* ===== Toggle Overlay ===== */
  function toggleOverlay() {
    const overlay = document.getElementById('silkweb-overlay');
    if (!overlay) return;
    overlayOpen = !overlayOpen;
    if (overlayOpen) {
      overlay.classList.add('open');
      const search = document.getElementById('silkweb-search');
      if (search) setTimeout(() => search.focus(), 100);
    } else {
      overlay.classList.remove('open');
    }
  }

  function closeOverlay() {
    const overlay = document.getElementById('silkweb-overlay');
    if (overlay) overlay.classList.remove('open');
    overlayOpen = false;
  }

  /* ===== Show Toast ===== */
  function showToast(title, body, isError) {
    const toast = document.getElementById('silkweb-toast');
    if (!toast) return;
    toast.querySelector('.sw-toast-title').textContent = title;
    toast.querySelector('.sw-toast-body').textContent = body;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');

    // Auto-hide after 8 seconds if not an error
    if (!isError) {
      setTimeout(() => toast.classList.remove('show'), 8000);
    }
  }

  /* ===== Listen for messages from background ===== */
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_RESULT') {
      showToast(message.agent, JSON.stringify(message.data, null, 2), false);
    }
    if (message.type === 'SHOW_ERROR') {
      showToast('Error', message.error, true);
    }
  });

  /* ===== Close overlay on Escape ===== */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayOpen) {
      closeOverlay();
    }
  });

  /* ===== Close overlay on outside click ===== */
  document.addEventListener('click', (e) => {
    if (!overlayOpen) return;
    const overlay = document.getElementById('silkweb-overlay');
    const fab = document.getElementById('silkweb-fab');
    if (overlay && !overlay.contains(e.target) && fab && !fab.contains(e.target)) {
      closeOverlay();
    }
  });

})();
