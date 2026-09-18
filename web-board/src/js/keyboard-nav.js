/* ── KEYBOARD-NAV.JS — Keyboard Navigation & Accessibility ──────────────────────────
   Handles Escape, Tab, and Arrow key navigation.
   Focus management with visible outlines (WCAG AA).
   No-breaking-change: purely additive keyboard handling.
*/

(function() {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────────
  const DOCK_TOOL_ORDER = [
    'players', 'assets', 'trajectories', 'animation', 'bibliothèque',
    'séance', 'planning', 'postes', 'vue', 'undo'
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  let currentFocusIndex = -1;
  let inAssetsMode = false;
  let currentAssetFocusRow = 0;
  let currentAssetFocusCol = 0;

  const ASSETS_COLS = 4; // Default desktop: 4 columns
  const ASSETS_ROWS = 3; // Default desktop: 3 rows (12 items)

  // ── DOM References ──────────────────────────────────────────────────────────
  const dock = document.getElementById('dock');
  const panel = document.getElementById('panel');
  const assetsGrid = document.getElementById('assetsGrid');

  if (!dock) {
    console.warn('[KeyboardNav.js] Dock element not found, skipping initialization');
    return;
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /**
   * Get all dock icons
   */
  function getDockIcons() {
    return Array.from(document.querySelectorAll('.dock-icon'));
  }

  /**
   * Get all asset grid items
   */
  function getAssetItems() {
    const grid = document.getElementById('assetsGrid');
    return grid ? Array.from(grid.querySelectorAll('.asset-grid-item')) : [];
  }

  /**
   * Focus dock icon by index
   */
  function focusDockIcon(index) {
    const icons = getDockIcons();
    if (index < 0 || index >= icons.length) return false;

    icons[index].focus();
    currentFocusIndex = index;
    console.log(`[KeyboardNav] Focused dock icon at index ${index}: ${DOCK_TOOL_ORDER[index]}`);
    return true;
  }

  /**
   * Focus asset item by row and column
   */
  function focusAssetItem(row, col) {
    const items = getAssetItems();
    if (items.length === 0) return false;

    const index = row * ASSETS_COLS + col;
    if (index < 0 || index >= items.length) return false;

    items[index].focus();
    currentAssetFocusRow = row;
    currentAssetFocusCol = col;
    console.log(`[KeyboardNav] Focused asset item at [${row}, ${col}]`);
    return true;
  }

  /**
   * Get responsive asset grid columns based on viewport
   */
  function getAssetGridColumns() {
    const width = window.innerWidth;
    if (width >= 1400) return 4;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  }

  /**
   * Get responsive asset grid rows
   */
  function getAssetGridRows() {
    const items = getAssetItems().length;
    const cols = getAssetGridColumns();
    return Math.ceil(items / cols);
  }

  /**
   * Move focus to next dock icon (Tab key)
   */
  function focusNextDockIcon() {
    const icons = getDockIcons();
    const nextIndex = (currentFocusIndex + 1) % icons.length;
    focusDockIcon(nextIndex);
  }

  /**
   * Move focus to previous dock icon (Shift+Tab)
   */
  function focusPrevDockIcon() {
    const icons = getDockIcons();
    const prevIndex = (currentFocusIndex - 1 + icons.length) % icons.length;
    focusDockIcon(prevIndex);
  }

  /**
   * Move focus right in asset grid
   */
  function moveAssetFocusRight() {
    const cols = getAssetGridColumns();
    const items = getAssetItems();

    if (items.length === 0) return;

    const currentIndex = currentAssetFocusRow * cols + currentAssetFocusCol;
    const nextIndex = currentIndex + 1;

    if (nextIndex < items.length) {
      const newRow = Math.floor(nextIndex / cols);
      const newCol = nextIndex % cols;
      focusAssetItem(newRow, newCol);
    }
  }

  /**
   * Move focus left in asset grid
   */
  function moveAssetFocusLeft() {
    const cols = getAssetGridColumns();
    const currentIndex = currentAssetFocusRow * cols + currentAssetFocusCol;

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const newRow = Math.floor(newIndex / cols);
      const newCol = newIndex % cols;
      focusAssetItem(newRow, newCol);
    }
  }

  /**
   * Move focus down in asset grid
   */
  function moveAssetFocusDown() {
    const cols = getAssetGridColumns();
    const items = getAssetItems();
    const currentIndex = currentAssetFocusRow * cols + currentAssetFocusCol;
    const nextIndex = currentIndex + cols;

    if (nextIndex < items.length) {
      const newRow = currentAssetFocusRow + 1;
      focusAssetItem(newRow, currentAssetFocusCol);
    }
  }

  /**
   * Move focus up in asset grid
   */
  function moveAssetFocusUp() {
    if (currentAssetFocusRow > 0) {
      const newRow = currentAssetFocusRow - 1;
      focusAssetItem(newRow, currentAssetFocusCol);
    }
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  /**
   * Handle keyboard events (global)
   */
  function handleKeyDown(e) {
    const isEscape = e.key === 'Escape';
    const isTab = e.key === 'Tab';
    const isArrowLeft = e.key === 'ArrowLeft';
    const isArrowRight = e.key === 'ArrowRight';
    const isArrowUp = e.key === 'ArrowUp';
    const isArrowDown = e.key === 'ArrowDown';

    inAssetsMode = window.DockAPI && window.DockAPI.isAssetsModeActive();

    // ── Escape: Close panel or exit assets mode ────────────────────────────
    if (isEscape) {
      e.preventDefault();

      if (window.DockAPI) {
        if (window.DockAPI.isPanelVisible()) {
          window.DockAPI.closePanel();
        }
        if (window.DockAPI.isAssetsModeActive()) {
          window.DockAPI.exitAssetsMode();
        }
      }

      console.log('[KeyboardNav] Escape pressed');
      return;
    }

    // ── Tab: Cycle through dock icons ──────────────────────────────────────
    if (isTab && !inAssetsMode) {
      e.preventDefault();

      if (e.shiftKey) {
        focusPrevDockIcon();
      } else {
        focusNextDockIcon();
      }

      console.log('[KeyboardNav] Tab pressed');
      return;
    }

    // ── Arrow keys: Navigate asset grid ────────────────────────────────────
    if (inAssetsMode) {
      if (isArrowRight) {
        e.preventDefault();
        moveAssetFocusRight();
        return;
      }
      if (isArrowLeft) {
        e.preventDefault();
        moveAssetFocusLeft();
        return;
      }
      if (isArrowDown) {
        e.preventDefault();
        moveAssetFocusDown();
        return;
      }
      if (isArrowUp) {
        e.preventDefault();
        moveAssetFocusUp();
        return;
      }
    }
  }

  /**
   * Handle focus events to track which element is focused
   */
  function handleFocus(e) {
    const element = e.target;

    // Track dock icon focus
    if (element.classList.contains('dock-icon')) {
      const icons = getDockIcons();
      currentFocusIndex = icons.indexOf(element);
      console.log(`[KeyboardNav] Dock icon focused: ${DOCK_TOOL_ORDER[currentFocusIndex]}`);
    }

    // Track asset item focus
    if (element.classList.contains('asset-grid-item')) {
      const items = getAssetItems();
      const index = items.indexOf(element);
      if (index >= 0) {
        const cols = getAssetGridColumns();
        currentAssetFocusRow = Math.floor(index / cols);
        currentAssetFocusCol = index % cols;
        console.log(`[KeyboardNav] Asset item focused: [${currentAssetFocusRow}, ${currentAssetFocusCol}]`);
      }
    }
  }

  /**
   * Reset focus tracking when entering/exiting modes
   */
  function handleAssetsModChange(e) {
    if (e.type === 'assetsMode:enter') {
      inAssetsMode = true;
      currentAssetFocusRow = 0;
      currentAssetFocusCol = 0;
      // Focus first asset item
      setTimeout(() => {
        const items = getAssetItems();
        if (items.length > 0) {
          items[0].focus();
        }
      }, 100);
    } else if (e.type === 'assetsMode:exit') {
      inAssetsMode = false;
      currentFocusIndex = -1;
      // Return focus to dock
      const icons = getDockIcons();
      if (icons.length > 0) {
        icons[0].focus();
      }
    }
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  function init() {
    console.log('[KeyboardNav] Initializing keyboard navigation');

    // Global keyboard handler
    document.addEventListener('keydown', handleKeyDown);

    // Focus tracking
    document.addEventListener('focus', handleFocus, true);

    // Set initial focus on first dock icon
    setTimeout(() => {
      const icons = getDockIcons();
      if (icons.length > 0) {
        // Don't auto-focus, just prepare
        console.log('[KeyboardNav] Ready for keyboard navigation');
      }
    }, 100);

    // Listen for custom events from dock.js
    window.addEventListener('assetsMode:enter', handleAssetsModChange);
    window.addEventListener('assetsMode:exit', handleAssetsModChange);

    console.log('[KeyboardNav] Initialization complete');
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
   * Public API
   */
  window.KeyboardNavAPI = {
    focusDockIcon: focusDockIcon,
    focusAssetItem: focusAssetItem,
    focusNextDockIcon: focusNextDockIcon,
    focusPrevDockIcon: focusPrevDockIcon,
    moveAssetFocusRight: moveAssetFocusRight,
    moveAssetFocusLeft: moveAssetFocusLeft,
    moveAssetFocusDown: moveAssetFocusDown,
    moveAssetFocusUp: moveAssetFocusUp
  };
})();

/**
 * USAGE:
 *
 * Keyboard shortcuts:
 *   - Escape: Close panel or exit assets mode
 *   - Tab: Cycle forward through dock icons
 *   - Shift+Tab: Cycle backward through dock icons
 *   - Arrow Left/Right: Navigate asset grid horizontally
 *   - Arrow Up/Down: Navigate asset grid vertically
 *   - Enter: Activate focused element (default browser behavior)
 *
 * Programmatic control:
 *   KeyboardNavAPI.focusDockIcon(0);      // Focus first icon
 *   KeyboardNavAPI.focusAssetItem(0, 0);  // Focus first asset
 *   KeyboardNavAPI.focusNextDockIcon();
 *   KeyboardNavAPI.focusPrevDockIcon();
 *   KeyboardNavAPI.moveAssetFocusRight();
 *   KeyboardNavAPI.moveAssetFocusDown();
 */
