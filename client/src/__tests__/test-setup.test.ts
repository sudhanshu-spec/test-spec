/**
 * @fileoverview Proves the jsdom test bootstrap in `client/src/test/setup.ts`
 * runs before every client suite: the browser APIs that file fills are present
 * and safe to call, and the Testing Library cleanup hook it registers runs
 * between tests. If `test.setupFiles` in `vite.config.ts` ever stops loading the
 * setup module, these cases fail here instead of surfacing later as leaked
 * markup in another suite.
 * @module client/src/__tests__/test-setup.test
 */

import { createElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('jsdom test bootstrap', () => {
  it('provides a non-matching MediaQueryList with inert listeners', () => {
    const query = '(min-width: 768px)';

    expect(typeof window.matchMedia).toBe('function');

    const list = window.matchMedia(query);
    expect(list.matches).toBe(false);
    expect(list.media).toBe(query);
    expect(list.onchange).toBeNull();

    const listener = (): void => undefined;
    expect(() => {
      list.addEventListener('change', listener);
    }).not.toThrow();
    expect(() => {
      list.removeEventListener('change', listener);
    }).not.toThrow();
    expect(list.dispatchEvent(new Event('change'))).toBe(false);
  });

  it('provides a callable window.scrollTo', () => {
    expect(typeof window.scrollTo).toBe('function');

    // jsdom 26 ships its own no-op stub, so calling it prints jsdom's
    // "Not implemented: window.scrollTo" notice on stderr; the call itself
    // must not throw, which is the contract `setup.ts` upholds on platforms
    // that lack the API entirely.
    expect(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }).not.toThrow();
  });

  it('provides a ResizeObserver whose observe, unobserve and disconnect are safe', () => {
    const ResizeObserverGlobal = globalThis.ResizeObserver;
    expect(typeof ResizeObserverGlobal).toBe('function');

    const observer = new ResizeObserverGlobal((): void => undefined);
    const target = document.createElement('div');

    expect(() => {
      observer.observe(target);
    }).not.toThrow();
    expect(() => {
      observer.unobserve(target);
    }).not.toThrow();
    expect(() => {
      observer.disconnect();
    }).not.toThrow();
  });

  it('registers Testing Library cleanup, so a render populates document.body', () => {
    render(createElement('p', null, 'bootstrap probe'));

    expect(document.body.textContent).toBe('bootstrap probe');
  });

  // Runs after the render above: nothing else in this file touches the shared
  // jsdom document, so only the `afterEach(cleanup)` hook registered in
  // `setup.ts` can have emptied it between the two tests.
  it('has cleaned document.body before the next test runs', () => {
    expect(document.body.innerHTML).toBe('');
  });
});
