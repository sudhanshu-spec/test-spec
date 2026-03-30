/**
 * collapsible-dashboard.js
 *
 * Core client-side JavaScript for the collapsible dashboard feature.
 * Implements the ResizeObserver Web API to dynamically recalculate panel
 * heights, enabling smooth CSS-animated expand/collapse transitions.
 *
 * Loaded by dashboard.html as a classic script (<script src="js/collapsible-dashboard.js">).
 * Coordinates with css/dashboard.css for height transition animations.
 *
 * Architecture:
 *  - Each .panel element owns one ResizeObserver watching its .panel-content child.
 *  - The observer callback measures content height and applies it to .panel-content-wrapper,
 *    which has CSS `transition: height 300ms ease` and `overflow: hidden`.
 *  - togglePanel() orchestrates the expand/collapse state toggle with proper ARIA updates.
 *  - Observers are disconnected on page unload to prevent memory leaks.
 *
 * Browser support: Chrome 64+, Firefox 69+, Safari 13.1+, Edge 79+.
 * Zero external dependencies — uses only native browser APIs.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Module-level state                                                 */
  /* ------------------------------------------------------------------ */

  /** @type {ResizeObserver[]} Tracks every observer for lifecycle cleanup. */
  const observers = [];

  /* ------------------------------------------------------------------ */
  /*  ResizeObserver callback                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Called whenever a watched .panel-content element changes size.
   * Reads the new content height and applies it as an explicit pixel value
   * to the .panel-content-wrapper so that CSS transitions animate smoothly.
   *
   * @param {ResizeObserverEntry[]} entries - Size-change entries from the observer.
   */
  function handleResize(entries) {
    for (const entry of entries) {
      // Primary: contentBoxSize (modern browsers). Fallback: contentRect (legacy).
      const height = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

      // Walk from the observed .panel-content up to its owning .panel
      const panel = entry.target.closest('.panel');
      if (!panel) {
        continue;
      }

      const wrapper = panel.querySelector('.panel-content-wrapper');
      if (!wrapper) {
        continue;
      }

      // Only update height when the panel is expanded — collapsed panels stay at 0.
      if (panel.dataset.collapsed !== 'true') {
        // Wrap DOM mutation in requestAnimationFrame to prevent infinite resize loops.
        requestAnimationFrame(() => {
          wrapper.style.height = height + 'px';
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Panel toggle                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Toggles a panel between collapsed and expanded states.
   * Coordinates data-collapsed, aria-expanded, aria-hidden, and the
   * explicit pixel height that drives the CSS transition.
   *
   * @param {HTMLElement} panel - The .panel element to toggle.
   */
  function togglePanel(panel) {
    const isCollapsed = panel.dataset.collapsed === 'true';
    const wrapper = panel.querySelector('.panel-content-wrapper');
    const header = panel.querySelector('.panel-header');
    const content = panel.querySelector('.panel-content');

    if (!wrapper || !header || !content) {
      return;
    }

    if (isCollapsed) {
      /* --- Expanding --- */
      panel.dataset.collapsed = 'false';
      header.setAttribute('aria-expanded', 'true');
      wrapper.setAttribute('aria-hidden', 'false');

      // Measure actual content height and set it on the wrapper to trigger
      // the CSS transition from 0 → measuredHeight.
      const measuredHeight = content.scrollHeight;
      wrapper.style.height = measuredHeight + 'px';
    } else {
      /* --- Collapsing --- */

      // Step 1: Lock the wrapper at its current rendered height so CSS has
      // a concrete starting value for the transition.
      wrapper.style.height = wrapper.scrollHeight + 'px';

      // Step 2: Force a synchronous reflow so the browser registers the
      // starting height before we set the target height to 0.
      // eslint-disable-next-line no-unused-expressions
      wrapper.offsetHeight;

      // Step 3: Set target height to 0 — triggers CSS transition.
      wrapper.style.height = '0px';

      // Update state and ARIA after initiating the collapse animation.
      panel.dataset.collapsed = 'true';
      header.setAttribute('aria-expanded', 'false');
      wrapper.setAttribute('aria-hidden', 'true');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dynamic content demo handlers                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Sets up click handlers for the "Add Paragraph" and "Remove Paragraph"
   * demo buttons. Content mutations are detected automatically by the
   * ResizeObserver — NO manual height recalculation is performed here.
   */
  function setupDynamicContentDemo() {
    // Add-content buttons
    const addButtons = document.querySelectorAll('.add-content-btn');
    addButtons.forEach((btn) => {
      btn.addEventListener('click', function () {
        const targetId = this.dataset.panel;
        if (!targetId) {
          return;
        }
        const contentEl = document.getElementById(targetId);
        if (!contentEl) {
          return;
        }

        const paragraph = document.createElement('p');
        paragraph.textContent =
          'New dynamic content added at ' + new Date().toLocaleTimeString();
        contentEl.appendChild(paragraph);
        // ResizeObserver will automatically detect the size change.
      });
    });

    // Remove-content buttons
    const removeButtons = document.querySelectorAll('.remove-content-btn');
    removeButtons.forEach((btn) => {
      btn.addEventListener('click', function () {
        const targetId = this.dataset.panel;
        if (!targetId) {
          return;
        }
        const contentEl = document.getElementById(targetId);
        if (!contentEl) {
          return;
        }

        // Find the last <p> child that is NOT the initial description and
        // is not a button — only remove dynamically added paragraphs.
        const paragraphs = contentEl.querySelectorAll('p');
        if (paragraphs.length > 1) {
          // Keep the first <p> (the static description) and remove the last.
          paragraphs[paragraphs.length - 1].remove();
          // ResizeObserver will automatically detect the size change.
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Observer lifecycle cleanup                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Disconnects every ResizeObserver instance to prevent memory leaks.
   * Called on page unload via the 'beforeunload' event.
   */
  function cleanupObservers() {
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Main initialisation                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Queries all .panel elements, attaches click handlers to their headers,
   * and creates a ResizeObserver for each panel's inner content element.
   */
  function initCollapsiblePanels() {
    const panels = document.querySelectorAll('.panel');

    panels.forEach((panel) => {
      const header = panel.querySelector('.panel-header');
      const contentElement = panel.querySelector('.panel-content');

      if (!header || !contentElement) {
        return;
      }

      // Toggle expand/collapse on header click
      header.addEventListener('click', () => {
        togglePanel(panel);
      });

      // Each panel gets its own ResizeObserver for clean lifecycle management
      const observer = new ResizeObserver(handleResize);
      observer.observe(contentElement);
      observers.push(observer);
    });

    // Wire up the dynamic content demo buttons
    setupDynamicContentDemo();
  }

  /* ------------------------------------------------------------------ */
  /*  Event listeners                                                    */
  /* ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', initCollapsiblePanels);
  window.addEventListener('beforeunload', cleanupObservers);
})();
