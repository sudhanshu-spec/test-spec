/**
 * @fileoverview Vitest setup for the Burger Restaurant client, loaded before
 * every suite through `test.setupFiles` in `vite.config.ts`: it isolates the
 * shared jsdom document per test and fills the browser APIs jsdom 26 lacks.
 * @module client/src/test/setup
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `globals` is off in vite.config.ts, so Testing Library cannot register its own
// cleanup hook; without it, renders leak between tests in the one jsdom document.
afterEach(cleanup);

/**
 * Builds a media query list that never matches: the 768 px breakpoint lives in
 * CSS, so no test depends on a JavaScript media query being true.
 * @param query - Media query string, echoed back as the list's `media`.
 * @returns A `MediaQueryList` whose listeners and dispatch are inert.
 */
function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => createMediaQueryList(query);
}

// Only the APIs jsdom leaves absent are replaced, so a platform that provides
// one keeps its own implementation.
if (typeof window.scrollTo !== 'function') {
  window.scrollTo = (): void => undefined;
}

// jsdom 26 has no ResizeObserver, and components that measure themselves would
// throw on construction. It reports nothing; layout assertions read CSS.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class implements ResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}
    observe(_target: Element, _options?: ResizeObserverOptions): void {}
    unobserve(_target: Element): void {}
    disconnect(): void {}
  };
}
