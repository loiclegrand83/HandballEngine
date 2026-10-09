/* ── DOCK.JS — Icon Click Handlers & Panel System ────────────────────────────────────
   Manages dock icon interactions, panel opens/closes, and assets mode toggle.
   No-breaking-change: uses existing canvas element, only manages UI interactions.
   Depends on app.js globals (state, selectTeam, selectPost, selectDrawMode,
   hasAnyPlayerPlaced) -- classic <script> tags sharing one scope, app.js must
   load first (see board.html script order).
*/

(function() {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────────
  const CLICK_DEBOUNCE_MS = 50;
  const PANEL_ANIMATION_MS = 200;

  const TEAMS = [
    { id: 'A', label: 'Équipe A' },
    { id: 'B', label: 'Équipe B' },
  ];

  const POSTES = [
    { id: 'AG', label: 'AG' },
    { id: 'ARG', label: 'ARG' },
    { id: 'DC', label: 'DC' },
    { id: 'PIV', label: 'PIV' },
    { id: 'ARD', label: 'ARD' },
    { id: 'AD', label: 'AD' },
    { id: 'G', label: 'Gardien' },
  ];

  const OUTFIELD_CAP = 6;
  const GOALKEEPER_CAP = 1;
  const DOCK_ICONS = [
    { tool: 'players', label: 'Joueurs', icon: 'users.svg' },
    { tool: 'assets', label: 'Assets', icon: 'cone.svg' },
    { tool: 'trajectories', label: 'Trajectoires', icon: 'route.svg' },
    { tool: 'animation', label: 'Animation', icon: 'play.svg' },
    { tool: 'bibliothèque', label: 'Bibliothèque', icon: 'library.svg' },
    { tool: 'séance', label: 'Séance', icon: 'clipboard-list.svg' },
    { tool: 'planning', label: 'Planning', icon: 'calendar.svg' },
    { tool: 'postes', label: 'Postes', icon: 'tag.svg' },
    { tool: 'vue', label: 'Vue', icon: 'layout-grid.svg' },
    { tool: 'undo', label: 'Annuler', icon: 'undo-2.svg' }
  ];

  const ASSET_ITEMS = [
    { id: 'ballon', label: 'Ballon', icon: '⚽' },
    { id: 'haie', label: 'Haie', icon: '🏃' },
    { id: 'haltere', label: 'Haltère', icon: '🏋️' },
    { id: 'cible', label: 'Cible', icon: '🎯' },
    { id: 'swiss-ball', label: 'Swiss Ball', icon: '⚪' },
    { id: 'coupelle', label: 'Coupelle', icon: '🪣' },
    { id: 'cerceau', label: 'Cerceau', icon: '⭕' },
    { id: 'echelle', label: 'Échelle', icon: '🪜' },
    { id: 'mannequin', label: 'Mannequin', icon: '🤼' },
    { id: 'mur', label: 'Mur', icon: '🧱' },
    { id: 'plot', label: 'Plot', icon: '📍' },
    { id: 'zone', label: 'Zone', icon: '📦' }
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  let currentTool = null;
  let isAssetsMode = false;
  let lastClickTime = {};
  let isPanelOpen = false;

  // ── DOM References ──────────────────────────────────────────────────────────
  const appShell = document.querySelector('.app-shell');
  const dock = document.getElementById('dock');
  const panel = document.getElementById('panel');
  const panelTitle = document.getElementById('panelTitle');
  const panelIcon = document.querySelector('.panel-icon');
  const panelContent = document.getElementById('panelContent');
  const panelCloseBtn = document.querySelector('.panel-close');

  if (!dock) {
    console.warn('[Dock.js] Dock element not found, skipping initialization');
    return;
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /**
   * Debounce click handler
   */
  function debounceClick(toolName) {
    const now = Date.now();
    if (lastClickTime[toolName] && now - lastClickTime[toolName] < CLICK_DEBOUNCE_MS) {
      return false;
    }
    lastClickTime[toolName] = now;
    return true;
  }

  /**
   * Get tool config by name
   */
  function getToolConfig(toolName) {
    return DOCK_ICONS.find(icon => icon.tool === toolName);
  }

  /**
   * Get asset item config by id
   */
  function getAssetConfig(assetId) {
    return ASSET_ITEMS.find(item => item.id === assetId);
  }

  /**
   * Update panel title and icon
   */
  function setPanelHeader(toolName) {
    const toolConfig = getToolConfig(toolName);
    if (!toolConfig) return;

    panelTitle.textContent = toolConfig.label;
    panelIcon.innerHTML = '<img src="../assets/icons/' + toolConfig.icon + '" alt="" width="24" height="24">';
  }

  /**
   * Set panel content (generic placeholder for now)
   */
  function setPanelContent(toolName) {
    const toolConfig = getToolConfig(toolName);
    if (!toolConfig) return;

    if (toolName === 'players') {
      renderPlayersPanel();
      return;
    }

    if (toolName === 'trajectories') {
      renderTrajectoriesPanel();
      return;
    }

    // Generic placeholder content
    panelContent.innerHTML = `
      <div class="panel-section">
        <h3>${toolConfig.label}</h3>
        <p>Contenu pour ${toolConfig.label}. À personnaliser selon les besoins.</p>
        <div class="button-group">
          <button class="panel-action-btn" data-action="apply">Appliquer</button>
          <button class="panel-action-btn" data-action="cancel">Annuler</button>
        </div>
      </div>
    `;
  }

  // ── Players Panel (team + poste selection) ─────────────────────────────────

  /**
   * Count placed players for a team, split into outfield / goalkeeper counts.
   * Live-filters state.items each call (no separate running counter).
   */
  function getTeamCounts(team) {
    const items = Array.isArray(state.items) ? state.items : [];
    let outfield = 0;
    let goalkeeper = 0;
    items.forEach(item => {
      if (item.team !== team) return;
      if (item.isGoalkeeper) goalkeeper += 1;
      else if (item.team) outfield += 1;
    });
    return { outfield, goalkeeper };
  }

  /**
   * Render the players panel: team buttons + poste buttons, with caps applied.
   */
  function renderPlayersPanel() {
    const toolConfig = getToolConfig('players');
    const selectedTeam = state.selectedTeam;
    const selectedPost = state.selectedPost;

    const teamButtonsHtml = TEAMS.map(team => `
      <button type="button" class="panel-action-btn${team.id === selectedTeam ? ' selected' : ''}" data-players-team="${team.id}">${team.label}</button>
    `).join('');

    const postButtonsHtml = POSTES.map(poste => {
      const counts = getTeamCounts(selectedTeam);
      const isGoalkeeperPoste = poste.id === 'G';
      const atCap = isGoalkeeperPoste
        ? counts.goalkeeper >= GOALKEEPER_CAP
        : counts.outfield >= OUTFIELD_CAP;
      const isSelected = poste.id === selectedPost;
      return `<button type="button" class="panel-action-btn${isSelected ? ' selected' : ''}" data-players-post="${poste.id}"${atCap ? ' disabled' : ''}>${poste.label}</button>`;
    }).join('');

    panelContent.innerHTML = `
      <div class="panel-section">
        <h3>${toolConfig.label}</h3>
        <h4>Équipe</h4>
        <div class="button-group" id="dockTeamButtons">
          ${teamButtonsHtml}
        </div>
        <h4>Poste</h4>
        <div class="button-group" id="dockPostButtons">
          ${postButtonsHtml}
        </div>
      </div>
    `;
  }

  // ── Trajectories Panel ────────────────────────────────────────────────────

  function renderTrajectoriesPanel() {
    const anyPlayer = hasAnyPlayerPlaced();
    const currentMode = state.drawMode;

    const types = [
      { id: 'course',   label: 'Course' },
      { id: 'pass',     label: 'Passe' },
      { id: 'shot',     label: 'Tir' },
      { id: 'croise',   label: 'Croisé' },
      { id: 'fixation', label: 'Fixation' },
    ];

    panelContent.innerHTML = `
      <div class="panel-section">
        ${!anyPlayer ? '<p class="panel-hint">Placez un joueur pour activer les trajectoires.</p>' : ''}
        <div class="button-group">
          ${types.map(t => `
            <button class="panel-action-btn${currentMode === t.id ? ' active' : ''}" data-traj-type="${t.id}" ${anyPlayer ? '' : 'disabled'}>
              ${t.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function handleTrajectoriesPanelClick(e) {
    const btn = e.target.closest('[data-traj-type]');
    if (!btn || btn.disabled) return;
    e.stopPropagation();
    selectDrawMode(btn.getAttribute('data-traj-type'));
    renderTrajectoriesPanel();
  }

  /**
   * Handle clicks inside the players panel (team + poste buttons).
   */
  function handlePlayersPanelClick(e) {
    const teamBtn = e.target.closest('[data-players-team]');
    if (teamBtn) {
      e.stopPropagation();
      selectTeam(teamBtn.getAttribute('data-players-team'));
      renderPlayersPanel();
      return;
    }

    const postBtn = e.target.closest('[data-players-post]');
    if (postBtn) {
      if (postBtn.disabled) return;
      e.stopPropagation();
      selectPost(postBtn.getAttribute('data-players-post'));
      renderPlayersPanel();
    }
  }

  /**
   * Open panel with animation
   */
  function openPanel(toolName) {
    if (isPanelOpen && currentTool === toolName) {
      return; // Panel already open for this tool
    }

    currentTool = toolName;
    setPanelHeader(toolName);
    setPanelContent(toolName);

    panel.classList.remove('hidden');
    if (appShell) appShell.classList.add('panel-open');
    if (window.reflowCanvas) window.reflowCanvas();
    isPanelOpen = true;

    console.log(`[Dock.js] Panel opened for: ${toolName}`);
  }

  /**
   * Close panel with animation
   */
  function closePanel() {
    if (!isPanelOpen) return;

    panel.classList.add('hidden');
    if (appShell) appShell.classList.remove('panel-open');
    if (window.reflowCanvas) window.reflowCanvas();
    isPanelOpen = false;
    currentTool = null;

    console.log('[Dock.js] Panel closed');
  }

  /**
   * Update active state for dock icon
   */
  function setIconActive(toolName) {
    // Remove active from all icons
    document.querySelectorAll('.dock-icon').forEach(icon => {
      icon.classList.remove('active');
    });

    // Add active to current icon
    if (toolName) {
      const icon = document.querySelector(`[data-tool="${toolName}"]`);
      if (icon) icon.classList.add('active');
    }
  }

  /**
   * Enter assets mode (hide dock icons, show assets grid)
   */
  function enterAssetsMode() {
    isAssetsMode = true;
    dock.classList.add('assets-mode');
    createAssetsGrid();
    console.log('[Dock.js] Entered Assets mode');
  }

  /**
   * Exit assets mode (show dock icons, hide assets grid)
   */
  function exitAssetsMode() {
    isAssetsMode = false;
    dock.classList.remove('assets-mode');
    removeAssetsGrid();
    closePanel();
    console.log('[Dock.js] Exited Assets mode');
  }

  /**
   * Create assets grid in dock
   */
  function createAssetsGrid() {
    // Remove old grid if exists
    removeAssetsGrid();

    const gridContainer = document.createElement('div');
    gridContainer.className = 'assets-grid';
    gridContainer.id = 'assetsGrid';
    gridContainer.setAttribute('role', 'grid');
    gridContainer.setAttribute('aria-label', 'Sélection d\'assets');

    ASSET_ITEMS.forEach(asset => {
      const button = document.createElement('button');
      button.className = 'asset-grid-item';
      button.setAttribute('data-asset', asset.id);
      button.setAttribute('data-label', asset.label);
      button.setAttribute('aria-label', asset.label);
      button.innerHTML = `<span class="asset-icon">${asset.icon}</span><span class="asset-label">${asset.label}</span>`;

      button.addEventListener('click', (e) => {
        if (!debounceClick(asset.id)) return;
        e.stopPropagation();

        // Update active state
        document.querySelectorAll('.asset-grid-item').forEach(item => {
          item.classList.remove('active');
        });
        button.classList.add('active');

        console.log(`[Dock.js] Asset selected: ${asset.id}`);

        // Dispatch custom event for app.js to handle
        window.dispatchEvent(new CustomEvent('assetSelected', {
          detail: { assetId: asset.id, assetLabel: asset.label }
        }));
      });

      gridContainer.appendChild(button);
    });

    // Create back button
    const backButton = document.createElement('button');
    backButton.className = 'assets-back-button';
    backButton.setAttribute('aria-label', 'Retour au dock');
    backButton.textContent = '←';

    backButton.addEventListener('click', (e) => {
      e.stopPropagation();
      exitAssetsMode();
      setIconActive(null);
    });

    // Back button is a child of the grid itself (not a dock sibling) so its
    // position anchors to the grid's own box, not a fixed offset above .dock
    // that would land inside the grid's bounds once the grid's height varies.
    gridContainer.appendChild(backButton);
    dock.appendChild(gridContainer);
  }

  /**
   * Remove assets grid from dock
   */
  function removeAssetsGrid() {
    const gridContainer = document.getElementById('assetsGrid');
    const backButton = document.querySelector('.assets-back-button');

    if (gridContainer) gridContainer.remove();
    if (backButton) backButton.remove();
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  /**
   * Handle dock icon click
   */
  function handleDockIconClick(e) {
    const iconButton = e.currentTarget;
    const toolName = iconButton.getAttribute('data-tool');

    if (!debounceClick(toolName)) return;

    console.log(`[Dock.js] Dock icon clicked: ${toolName}`);

    // Special handling for Assets icon
    if (toolName === 'assets') {
      if (isAssetsMode) {
        // Already in assets mode, exit
        exitAssetsMode();
        setIconActive(null);
      } else {
        // Enter assets mode
        setIconActive(toolName);
        enterAssetsMode();
      }
      return;
    }

    // Special handling for Undo
    if (toolName === 'undo') {
      console.log('[Dock.js] Undo triggered');
      // Dispatch event for app.js to handle undo logic
      window.dispatchEvent(new CustomEvent('toolTriggered', {
        detail: { tool: toolName }
      }));
      return;
    }

    // For other tools: toggle panel open/close
    if (currentTool === toolName && isPanelOpen) {
      // Same tool clicked again, close panel
      closePanel();
      setIconActive(null);
    } else {
      // Different tool or panel closed, open panel
      setIconActive(toolName);
      openPanel(toolName);
    }

    // Dispatch custom event for app.js to handle tool-specific logic
    window.dispatchEvent(new CustomEvent('toolTriggered', {
      detail: { tool: toolName }
    }));
  }

  /**
   * Handle panel close button click
   */
  function handlePanelCloseClick(e) {
    e.stopPropagation();
    closePanel();
    setIconActive(null);
  }

  /**
   * Handle Escape key to close panel
   */
  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      if (isPanelOpen) {
        closePanel();
        setIconActive(null);
      }
      if (isAssetsMode) {
        exitAssetsMode();
        setIconActive(null);
      }
    }
  }

  /**
   * Handle panel content button clicks
   */
  function handlePanelButtonClick(e) {
    const button = e.target.closest('.panel-action-btn');
    if (!button) return;
    if (button.hasAttribute('data-players-team') || button.hasAttribute('data-players-post') || button.hasAttribute('data-traj-type')) return;

    const action = button.getAttribute('data-action');
    console.log(`[Dock.js] Panel action: ${action}`);

    if (action === 'cancel' || action === 'close') {
      closePanel();
      setIconActive(null);
    }

    // Dispatch event for app.js to handle action
    window.dispatchEvent(new CustomEvent('panelAction', {
      detail: { action, tool: currentTool }
    }));
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  function init() {
    console.log('[Dock.js] Initializing dock system');

    // Add event listeners to dock icons
    const dockIcons = document.querySelectorAll('.dock-icon');
    dockIcons.forEach(icon => {
      icon.addEventListener('click', handleDockIconClick);
    });

    // Add event listeners to panel
    if (panelCloseBtn) {
      panelCloseBtn.addEventListener('click', handlePanelCloseClick);
    }

    // Add global keyboard listener
    document.addEventListener('keydown', handleEscapeKey);

    // Re-run panel cap-check whenever a player/item is placed while the panel is open
    window.addEventListener('itemPlaced', () => {
      if (isPanelOpen && currentTool === 'players') renderPlayersPanel();
      if (isPanelOpen && currentTool === 'trajectories') renderTrajectoriesPanel();
    });

    // Add event listener for panel content buttons (delegated)
    panelContent.addEventListener('click', handlePanelButtonClick);
    panelContent.addEventListener('click', handlePlayersPanelClick);
    panelContent.addEventListener('click', handleTrajectoriesPanelClick);

    // Initialize with panel hidden
    panel.classList.add('hidden');

    console.log('[Dock.js] Initialization complete');
  }

  /**
   * Start when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Public API: expose functions for testing or external use
   */
  window.DockAPI = {
    openPanel: openPanel,
    closePanel: closePanel,
    setIconActive: setIconActive,
    enterAssetsMode: enterAssetsMode,
    exitAssetsMode: exitAssetsMode,
    getCurrentTool: () => currentTool,
    isAssetsModeActive: () => isAssetsMode,
    isPanelVisible: () => isPanelOpen
  };
})();

/**
 * USAGE:
 *
 * Listen for dock events in app.js:
 *   window.addEventListener('toolTriggered', (e) => {
 *     const { tool } = e.detail;
 *     // Handle tool logic
 *   });
 *
 *   window.addEventListener('assetSelected', (e) => {
 *     const { assetId, assetLabel } = e.detail;
 *     // Handle asset selection
 *   });
 *
 *   window.addEventListener('panelAction', (e) => {
 *     const { action, tool } = e.detail;
 *     // Handle panel actions (apply, cancel, etc.)
 *   });
 *
 * Programmatic control:
 *   DockAPI.openPanel('players');
 *   DockAPI.closePanel();
 *   DockAPI.enterAssetsMode();
 *   DockAPI.exitAssetsMode();
 */
