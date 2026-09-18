/* ── CANVAS REFLOW — Dynamic Canvas Sizing
   Recalculates canvas dimensions when viewport or sidebar width changes.
   Ensures terrain scales correctly and doesn't overlap dock/sidebar.
   No-breaking-change: uses existing canvas element, only updates dimensions.
*/

(function() {
  'use strict';

  // Get canvas and dock/sidebar elements
  const canvas = document.getElementById('boardCanvas');
  const sidebar = document.querySelector('.sidebar');
  const dock = document.querySelector('.dock');

  if (!canvas) {
    console.warn('[CanvasReflow] Canvas element not found, skipping initialization');
    return;
  }

  /**
   * Get current sidebar width from computed styles (respects CSS media queries)
   * @returns {number} Sidebar width in pixels
   */
  function getSidebarWidth() {
    if (!sidebar) return 0;
    return parseInt(getComputedStyle(sidebar).width, 10);
  }

  /**
   * Get dock height (fixed 64px, but read from computed style to be safe)
   * @returns {number} Dock height in pixels
   */
  function getDockHeight() {
    if (!dock) return 64;
    return parseInt(getComputedStyle(dock).height, 10) || 64;
  }

  /**
   * Calculate canvas dimensions based on viewport and sidebar width
   * Formula:
   *   - Canvas width = viewport width - sidebar width
   *   - Canvas height = viewport height - dock height - padding
   * @returns {Object} { width, height } in pixels
   */
  function calculateCanvasDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const sidebarWidth = getSidebarWidth();
    const dockHeight = getDockHeight();

    // Add padding/margin buffer for dock (dock has margin-bottom: 16px)
    const dockPadding = 20;

    const width = Math.max(
      300, // Minimum canvas width to prevent squishing
      viewportWidth - sidebarWidth
    );

    const height = Math.max(
      200, // Minimum canvas height
      viewportHeight - dockHeight - dockPadding
    );

    return { width, height };
  }

  /**
   * Apply canvas dimensions to the element
   * @param {Object} dimensions { width, height }
   */
  function applyCanvasDimensions(dimensions) {
    if (canvas.width === dimensions.width && canvas.height === dimensions.height) {
      return; // No change, skip
    }

    // Update canvas resolution
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Dispatch custom event so terrain drawing code can re-render
    window.dispatchEvent(new CustomEvent('canvasReflowed', {
      detail: { width: dimensions.width, height: dimensions.height }
    }));

    console.log(`[CanvasReflow] Canvas resized to ${dimensions.width}×${dimensions.height}`);
  }

  /**
   * Main reflow function: calculate and apply new canvas dimensions
   */
  function reflow() {
    const dimensions = calculateCanvasDimensions();
    applyCanvasDimensions(dimensions);
  }

  /**
   * Debounced resize handler (avoid rapid recalculations)
   */
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      reflow();
    }, 100); // 100ms debounce
  }

  /**
   * Watch for media query changes (responsive breakpoint: 1024px)
   * This handles sidebar width changes when crossing breakpoints
   */
  function setupMediaQueryListener() {
    if (!window.matchMedia) return; // Older browsers

    const tabletQuery = window.matchMedia('(max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px) and (max-width: 1399px)');
    const desktopLargeQuery = window.matchMedia('(min-width: 1400px)');

    // Listener function
    function handleMediaChange() {
      console.log('[CanvasReflow] Breakpoint crossed, recalculating canvas');
      reflow();
    }

    // Add listeners (supporting both old and new API)
    if (tabletQuery.addEventListener) {
      tabletQuery.addEventListener('change', handleMediaChange);
      desktopQuery.addEventListener('change', handleMediaChange);
      desktopLargeQuery.addEventListener('change', handleMediaChange);
    } else if (tabletQuery.addListener) {
      // Fallback for older browsers
      tabletQuery.addListener(handleMediaChange);
      desktopQuery.addListener(handleMediaChange);
      desktopLargeQuery.addListener(handleMediaChange);
    }
  }

  /**
   * Mutation observer to detect sidebar changes (if sidebar is dynamically resized)
   */
  function setupMutationObserver() {
    if (!window.MutationObserver || !sidebar) return;

    const observer = new MutationObserver((mutations) => {
      // Check if any mutation affects sidebar width
      const affectsSidebar = mutations.some(m => {
        return m.type === 'attributes' &&
               (m.attributeName === 'style' || m.attributeName === 'class');
      });

      if (affectsSidebar) {
        reflow();
      }
    });

    observer.observe(sidebar, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      attributeOldValue: true
    });
  }

  /**
   * Initialize: perform initial layout and attach listeners
   */
  function init() {
    console.log('[CanvasReflow] Initializing canvas reflow');

    // Set initial dimensions
    reflow();

    // Listen for window resize
    window.addEventListener('resize', handleResize, { passive: true });

    // Listen for media query changes
    setupMediaQueryListener();

    // Watch for sidebar mutations
    setupMutationObserver();

    // Log initialization complete
    console.log('[CanvasReflow] Initialization complete');
  }

  /**
   * Public API: manually trigger reflow (useful for other code)
   */
  window.reflowCanvas = reflow;

  /**
   * Start when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * USAGE:
 *
 * 1. Add to board.html after canvas element:
 *    <script src="../src/js/canvas-reflow.js"></script>
 *
 * 2. Terrain drawing code should listen to 'canvasReflowed' event:
 *    window.addEventListener('canvasReflowed', (e) => {
 *      const { width, height } = e.detail;
 *      // Redraw terrain at new dimensions
 *      redrawTerrain(width, height);
 *    });
 *
 * 3. Manually trigger reflow if needed:
 *    window.reflowCanvas();
 */
