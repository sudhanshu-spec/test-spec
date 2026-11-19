/**
 * @fileoverview Reachability of the client's module graph: the route manifest in
 * `client/src/main.tsx` resolves every screen to a module that really exists, every module under
 * `client/src/api/` is imported from outside itself, and every view and component has a consumer.
 * R-10 asks for one concern per module; this suite is the mechanical proof that each one is reached
 * from a real entry point rather than shipped as dead code.
 *
 * The graph is read twice on purpose. Existence is checked against the modules Vite actually
 * resolves for each directory with `import.meta.glob(..., { eager: true })`, while imports are
 * parsed from every module's raw source, so a file that exists but is never imported fails here as
 * surely as a manifest row naming a file that does not exist.
 *
 * The suite touches no network and no CommonJS server module: `fetch` is stubbed before the first
 * import of this file runs and asserted uncalled at the end (R-1, R-2, R-7). Authentication,
 * ownership scoping and the error envelope belong to the integration suites (R-4, R-5, R-6), so
 * nothing here fakes a fixture that could imply anything about them.
 *
 * @module client/src/__tests__/reachability.test
 */

import { afterAll, describe, expect, it, vi } from 'vitest';

import { routeManifest } from '../main';
import type { RouteManifestEntry } from '../main';

/**
 * `fetch` replaced before any import of this file executes, so a module that fetched while it was
 * being loaded would be caught too. `attempts` records requests independently of the mock's call
 * history, which `restoreMocks` in `vite.config.ts` clears between tests.
 */
const network = vi.hoisted(() => {
  const attempts: string[] = [];
  const fetchSpy = vi.fn((input: unknown) => {
    attempts.push(typeof input === 'string' ? input : String(input));
    return Promise.reject(new Error('The reachability suite performs no network request.'));
  });
  vi.stubGlobal('fetch', fetchSpy);
  return { attempts, fetchSpy };
});

afterAll(() => {
  vi.unstubAllGlobals();
});

/** Rows the route surface declares: the shell, the redirect, ten screen rows and the splat. */
const EXPECTED_ENTRY_COUNT = 13;

/** The kinds `RouteManifestEntry['kind']` admits; a new kind has to be declared here deliberately. */
const MANIFEST_KINDS = ['layout', 'redirect', 'screen', 'not-found'] as const;

/** One `kind` value of the manifest. */
type ManifestKind = (typeof MANIFEST_KINDS)[number];

/**
 * Paths rendered behind the session guard. The guard only establishes that somebody is signed in:
 * ownership of an order or a reservation is the API's to enforce, and it answers another user's
 * record with 404, so the client cannot tell a foreign row from a missing one.
 */
const PROTECTED_PATHS = [
  '/cart',
  '/orders',
  '/orders/:id',
  '/reservations',
  '/reservations/new',
  '/reservations/:id',
] as const;

/** One row of the ten-screen inventory and the manifest row expected to carry it. */
interface ExpectedScreenRow {
  readonly path: string;
  readonly kind: ManifestKind;
  readonly screen: number;
}

/** The ten-screen inventory: nine views, the layout shell (screen 9) and the not-found view. */
const EXPECTED_SCREEN_ROWS: readonly ExpectedScreenRow[] = [
  { path: '/register', kind: 'screen', screen: 1 },
  { path: '/login', kind: 'screen', screen: 2 },
  { path: '/menu', kind: 'screen', screen: 3 },
  { path: '/menu/:id', kind: 'screen', screen: 4 },
  { path: '/cart', kind: 'screen', screen: 5 },
  { path: '/orders', kind: 'screen', screen: 6 },
  { path: '/orders/:id', kind: 'screen', screen: 6 },
  { path: '/reservations/new', kind: 'screen', screen: 7 },
  { path: '/reservations', kind: 'screen', screen: 8 },
  { path: '/reservations/:id', kind: 'screen', screen: 8 },
  { path: '/', kind: 'layout', screen: 9 },
  { path: '*', kind: 'not-found', screen: 10 },
];

/** Every screen number of the inventory, so a missing screen fails by name. */
const EXPECTED_SCREEN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** The API modules the client ships, exactly: no eighth module, and no cart module (R-8). */
const EXPECTED_API_MODULES = [
  'auth.ts',
  'client.ts',
  'format.ts',
  'menu.ts',
  'orders.ts',
  'reservations.ts',
  'types.ts',
] as const;

/** The domain modules that must reach the HTTP seam. */
const HTTP_SEAM_CONSUMERS = ['auth', 'menu', 'orders', 'reservations'] as const;

/** The session provider, the one non-view module allowed to consume `api/client` directly. */
const SESSION_PROVIDER = 'state/session';

/** Modules Vite resolves for `client/src/views/`, keyed relative to this suite. */
const VIEW_MODULES: Readonly<Record<string, unknown>> = import.meta.glob('../views/*.tsx', {
  eager: true,
});

/** Modules Vite resolves for `client/src/components/`, keyed relative to this suite. */
const COMPONENT_MODULES: Readonly<Record<string, unknown>> = import.meta.glob('../components/*.tsx', {
  eager: true,
});

/**
 * Raw text of every module whose imports are part of the graph. `main.tsx` is included because it
 * is the only consumer of the layout shell and of the session guard, so leaving it out would report
 * two live components as orphans.
 */
const RAW_SOURCES: Readonly<Record<string, unknown>> = import.meta.glob(
  ['../api/*.ts', '../views/*.tsx', '../components/*.tsx', '../state/*.tsx', '../main.tsx'],
  { query: '?raw', import: 'default', eager: true },
);

/** Matches the `from '…'` clause of a static import or re-export. */
const FROM_CLAUSE = /\bfrom\s*['"]([^'"]+)['"]/g;

/** Matches a side-effect import, which has no `from` clause. */
const BARE_IMPORT = /(?:^|[;\n])\s*import\s+['"]([^'"]+)['"]/g;

/** The file name of a module path, e.g. `Layout.tsx` for `client/src/components/Layout.tsx`. */
function basenameOf(modulePath: string): string {
  return modulePath.split('/').at(-1) ?? modulePath;
}

/** A module path without its TypeScript or JavaScript extension. */
function withoutExtension(modulePath: string): string {
  return modulePath.replace(/\.(?:tsx|ts|jsx|js|mjs|cjs)$/, '');
}

/** A glob key such as `../api/client.ts` as a path from `client/src`, such as `api/client.ts`. */
function sourcePathOf(globKey: string): string {
  return globKey.replace(/^\.\.\//, '');
}

/** The identifier used to compare modules: a path from `client/src` with no extension. */
function moduleIdOf(globKey: string): string {
  return withoutExtension(sourcePathOf(globKey));
}

/**
 * A manifest row's module path as the same identifier `moduleIdOf` produces, so a manifest row and
 * the module Vite resolved for it are compared by one name. Manifest rows are repo-relative
 * (`client/src/views/CartView.tsx`); glob keys are relative to this suite (`../views/CartView.tsx`).
 *
 * @param module - A manifest row's module path.
 * @returns The module's identifier, such as `views/CartView`.
 */
function manifestModuleId(module: string): string {
  return withoutExtension(module.replace(/^client\/src\//, ''));
}

/**
 * Reads a glob entry's raw source text. A `?raw` module exposes its text as the default export, and
 * an entry collected without `import: 'default'` would arrive as that namespace instead, so both
 * shapes are accepted and anything else is reported rather than silently treated as empty.
 *
 * @param value - One entry of a raw-source glob.
 * @returns The module's source text.
 */
function asSource(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const namespace = value as Record<string, unknown>;
    if (typeof namespace['default'] === 'string') {
      return namespace['default'];
    }
  }

  throw new TypeError(`Expected a module's raw source text but read ${typeof value}.`);
}

/**
 * Removes comments so a module path quoted in a doc comment cannot be mistaken for an import. Only
 * whole-line `//` comments are dropped, which leaves a `//` inside a URL literal alone.
 *
 * @param source - A module's raw source text.
 * @returns The source with block comments and whole-line line comments removed.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
}

/**
 * Collects the module specifiers a source file imports or re-exports, type-only imports included.
 *
 * @param source - A module's raw source text.
 * @returns The distinct specifiers, in source order.
 */
function importSpecifiers(source: string): string[] {
  const text = stripComments(source);
  const specifiers = new Set<string>();

  for (const match of text.matchAll(FROM_CLAUSE)) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.add(specifier);
    }
  }

  for (const match of text.matchAll(BARE_IMPORT)) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.add(specifier);
    }
  }

  return [...specifiers];
}

/**
 * Resolves a relative import specifier against the importing module, so `./client` imported from
 * `api/auth` becomes `api/client`. Package specifiers resolve to null: this suite asserts the
 * client's own graph, not its dependencies'.
 *
 * @param importerId - Identifier of the importing module.
 * @param specifier - The specifier as written in the source.
 * @returns The imported module's identifier, or null for a package import.
 */
function resolveImport(importerId: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const segments = importerId.split('/').slice(0, -1);

  for (const segment of specifier.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return withoutExtension(segments.join('/'));
}

/** One import of the client's own modules. */
interface ImportEdge {
  readonly importer: string;
  readonly imported: string;
}

/** Every import edge between the client's own modules, resolved once for the whole suite. */
const IMPORT_EDGES: readonly ImportEdge[] = Object.entries(RAW_SOURCES).flatMap(([globKey, value]) => {
  const importer = moduleIdOf(globKey);

  return importSpecifiers(asSource(value)).flatMap((specifier) => {
    const imported = resolveImport(importer, specifier);

    return imported === null ? [] : [{ importer, imported }];
  });
});

/**
 * The modules that import a given one, never counting a module's import of itself.
 *
 * @param moduleId - Identifier of the imported module.
 * @returns The importing module identifiers, without duplicates.
 */
function importersOf(moduleId: string): string[] {
  const importers = new Set<string>();

  for (const edge of IMPORT_EDGES) {
    if (edge.imported === moduleId && edge.importer !== moduleId) {
      importers.add(edge.importer);
    }
  }

  return [...importers];
}

/** True for any of the client's own module identifiers under `client/src/api/`. */
function isApiModule(moduleId: string): boolean {
  return moduleId.startsWith('api/');
}

/** True for a module under `client/src/views/` or `client/src/components/`. */
function isUiModule(moduleId: string): boolean {
  return moduleId.startsWith('views/') || moduleId.startsWith('components/');
}

/** Every module Vite resolves under `client/src/api/`, as identifiers without the extension. */
const API_MODULE_IDS: readonly string[] = Object.keys(RAW_SOURCES).map(moduleIdOf).filter(isApiModule);

/** Every module Vite resolves under `client/src/views/`. */
const VIEW_MODULE_IDS: readonly string[] = Object.keys(VIEW_MODULES).map(moduleIdOf);

/** Every module Vite resolves under `client/src/components/`. */
const COMPONENT_MODULE_IDS: readonly string[] = Object.keys(COMPONENT_MODULES).map(moduleIdOf);

/**
 * Finds the manifest row at a path with a given kind. Two rows share `/` — the layout shell and the
 * root redirect — so the kind is part of the key.
 *
 * @param path - The manifest path.
 * @param kind - The manifest kind.
 * @returns The matching row.
 * @throws Error naming the row when the manifest declares none.
 */
function findRow(path: string, kind: ManifestKind): RouteManifestEntry {
  const row = routeManifest.find((entry) => entry.path === path && entry.kind === kind);

  if (row === undefined) {
    throw new Error(`The route manifest declares no "${kind}" row at "${path}".`);
  }

  return row;
}

/**
 * The module Vite resolved for a manifest row, looked up by file name in the view and component
 * directories.
 *
 * @param module - The manifest row's module path, or null.
 * @returns The resolved entry, or null when the row names no module.
 */
function resolvedModule(module: string | null): { readonly key: string; readonly value: unknown } | null {
  if (module === null) {
    return null;
  }

  const wanted = basenameOf(module);

  for (const pool of [VIEW_MODULES, COMPONENT_MODULES]) {
    for (const [key, value] of Object.entries(pool)) {
      if (basenameOf(key) === wanted) {
        return { key, value };
      }
    }
  }

  return null;
}

/**
 * True when a module namespace exposes something renderable: a component as the default export or
 * as a named one.
 *
 * @param value - A module namespace from an eager glob.
 * @returns Whether the module exports a function.
 */
function exposesComponent(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value as Record<string, unknown>).some((exported) => typeof exported === 'function');
}

/**
 * The raw source of one collected module.
 *
 * @param moduleId - Identifier of the module, such as `main` or `api/client`.
 * @returns The module's source text.
 */
function rawSourceOf(moduleId: string): string {
  for (const [globKey, value] of Object.entries(RAW_SOURCES)) {
    if (moduleIdOf(globKey) === moduleId) {
      return asSource(value);
    }
  }

  throw new Error(`No raw source was collected for "${moduleId}".`);
}

describe('route manifest', () => {
  it('declares the manifest as a non-empty list of rows', () => {
    expect(Array.isArray(routeManifest)).toBe(true);
    expect(routeManifest.length).toBeGreaterThan(0);
  });

  it(`declares exactly ${EXPECTED_ENTRY_COUNT} entries`, () => {
    expect(routeManifest.map((entry) => `${entry.kind} ${entry.path}`)).toHaveLength(
      EXPECTED_ENTRY_COUNT,
    );
  });

  it('draws every kind from the declared union', () => {
    const declared: readonly string[] = MANIFEST_KINDS;
    const unknown = routeManifest
      .filter((entry) => !declared.includes(entry.kind))
      .map((entry) => `${entry.path} has kind "${String(entry.kind)}"`);

    expect(unknown).toEqual([]);
  });

  it('is distributed as 1 layout, 1 redirect, 10 screen rows and 1 not-found view', () => {
    // Ten screen rows rather than nine: `/orders` and `/orders/:id` render one confirmation view,
    // as do `/reservations` and `/reservations/:id`, so ten routes carry the nine view modules.
    const counts: Record<string, number> = {};

    for (const entry of routeManifest) {
      counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
    }

    expect(counts).toEqual({ layout: 1, redirect: 1, screen: 10, 'not-found': 1 });
    expect(Object.values(counts).reduce((total, count) => total + count, 0)).toBe(
      EXPECTED_ENTRY_COUNT,
    );
  });

  it('renders the ten screen rows through exactly nine distinct view modules', () => {
    const notFoundModule = findRow('*', 'not-found').module;

    if (notFoundModule === null) {
      throw new Error('The not-found row names no module.');
    }

    const screenModules = [
      ...new Set(
        routeManifest
          .filter((entry) => entry.kind === 'screen')
          .map((entry) => entry.module)
          .filter((module): module is string => module !== null)
          .map(manifestModuleId),
      ),
    ].sort();

    const expected = VIEW_MODULE_IDS.filter(
      (moduleId) => moduleId !== manifestModuleId(notFoundModule),
    ).sort();

    expect(screenModules).toHaveLength(expected.length);
    expect(screenModules).toEqual(expected);
  });

  it('guards exactly the six protected paths and no others', () => {
    const guarded = routeManifest
      .filter((entry) => entry.requiresAuth)
      .map((entry) => entry.path)
      .sort();

    expect(guarded).toEqual([...PROTECTED_PATHS].sort());
  });

  it('marks the layout, the redirect and the not-found view as public', () => {
    expect(findRow('/', 'layout').requiresAuth).toBe(false);
    expect(findRow('/', 'redirect').requiresAuth).toBe(false);
    expect(findRow('*', 'not-found').requiresAuth).toBe(false);
  });

  for (const row of EXPECTED_SCREEN_ROWS) {
    it(`maps ${row.path} (${row.kind}) to screen ${row.screen}`, () => {
      const entry = findRow(row.path, row.kind);

      expect(entry.screen).toBe(row.screen);
      expect(entry.module).not.toBeNull();
    });
  }

  it('covers every screen number of the inventory', () => {
    const declared = routeManifest
      .map((entry) => entry.screen)
      .filter((screen): screen is number => screen !== null)
      .sort((left, right) => left - right);

    expect([...new Set(declared)]).toEqual([...EXPECTED_SCREEN_NUMBERS]);
  });

  it('makes the root row a redirect that names no module', () => {
    const redirect = routeManifest.filter((entry) => entry.kind === 'redirect');

    expect(redirect).toHaveLength(1);

    const [row] = redirect;
    expect(row?.path).toBe('/');
    expect(row?.screen).toBeNull();
    expect(row?.requiresAuth).toBe(false);
    expect(row?.module).toBeNull();
  });

  it('redirects the root row to /menu, a screen the manifest declares', () => {
    // The manifest has no redirect-target field: the target lives in the element the row renders,
    // so it is asserted where it is written, and the destination is asserted to be a real screen.
    expect(rawSourceOf('main')).toMatch(/<Navigate\s+to="\/menu"/);
    expect(findRow('/menu', 'screen').module).not.toBeNull();
  });

  it('names only modules that really exist for every row naming one', () => {
    const known = new Set(
      [...Object.keys(VIEW_MODULES), ...Object.keys(COMPONENT_MODULES)].map((key) => basenameOf(key)),
    );

    const missing = routeManifest.flatMap((entry) => {
      if (entry.module === null) {
        return [];
      }

      return known.has(basenameOf(entry.module)) ? [] : [`${entry.path} names "${entry.module}"`];
    });

    expect(missing).toEqual([]);
  });

  it('resolves every named module to a renderable export', () => {
    const unresolved = routeManifest.flatMap((entry) => {
      const resolved = resolvedModule(entry.module);

      if (resolved === null) {
        return entry.module === null ? [] : [`${entry.path} names "${entry.module}"`];
      }

      return exposesComponent(resolved.value) ? [] : [`${entry.path} names "${resolved.key}"`];
    });

    expect(unresolved).toEqual([]);
  });

  it('resolves the layout row to the Layout component', () => {
    const layout = findRow('/', 'layout');
    const resolved = resolvedModule(layout.module);

    expect(resolved?.key).toBe('../components/Layout.tsx');
    expect(exposesComponent(resolved?.value)).toBe(true);
    expect(basenameOf(layout.module ?? '')).toBe('Layout.tsx');
  });

  it('resolves the catch-all row to the not-found view', () => {
    const notFound = findRow('*', 'not-found');
    const resolved = resolvedModule(notFound.module);

    expect(notFound.screen).toBe(10);
    expect(resolved?.key).toBe('../views/NotFoundView.tsx');
    expect(exposesComponent(resolved?.value)).toBe(true);
  });
});

describe('api module reachability', () => {
  it('ships exactly the seven api modules, so an added cart module fails here (R-8)', () => {
    const expected = EXPECTED_API_MODULES.map((name) => `api/${withoutExtension(name)}`);

    expect([...API_MODULE_IDS].sort()).toEqual(expected.sort());
  });

  it('imports every api module from outside itself, so none of them is dead code', () => {
    const orphans = API_MODULE_IDS.filter((moduleId) => importersOf(moduleId).length === 0).map(
      (moduleId) => `${moduleId} is imported by no other module`,
    );

    expect(orphans).toEqual([]);
  });

  it('imports the shared types from several api modules and from views', () => {
    const importers = importersOf('api/types');

    expect(importers.filter(isApiModule).length).toBeGreaterThanOrEqual(4);
    expect(importers.filter((moduleId) => moduleId.startsWith('views/')).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('imports the HTTP seam from the four domain api modules and from the session provider', () => {
    expect(importersOf('api/client')).toEqual(
      expect.arrayContaining([
        ...HTTP_SEAM_CONSUMERS.map((name) => `api/${name}`),
        SESSION_PROVIDER,
      ]),
    );
  });

  it('imports the money formatter from a view or a component, its declared consumers', () => {
    // `formatCents` is display text, so the catalog card, the item detail, the cart and the order
    // confirmation consume it directly; a formatter only other api modules imported would be dead.
    const uiImporters = importersOf('api/format').filter(isUiModule);

    expect(uiImporters.length).toBeGreaterThan(0);
  });

  for (const name of HTTP_SEAM_CONSUMERS) {
    it(`imports api/${name} from a view or from the session provider`, () => {
      const consumers = importersOf(`api/${name}`).filter(
        (moduleId) => moduleId.startsWith('views/') || moduleId === SESSION_PROVIDER,
      );

      expect(
        consumers,
        `api/${name} has no consumer under client/src/views/ and is not used by the session provider`,
      ).not.toEqual([]);
    });
  }

  it('reads the import graph from every api, view, component, state module and the entry point', () => {
    const collected = Object.keys(RAW_SOURCES).map(moduleIdOf);

    expect(collected).toEqual(expect.arrayContaining(['main', SESSION_PROVIDER, 'api/client']));
    expect(collected.length).toBeGreaterThanOrEqual(API_MODULE_IDS.length + VIEW_MODULE_IDS.length);
    expect(IMPORT_EDGES.length).toBeGreaterThan(0);
  });
});

describe('no orphaned views or components', () => {
  it('gives every view a route in the manifest', () => {
    const routed = new Set(
      routeManifest
        .map((entry) => entry.module)
        .filter((module): module is string => module !== null)
        .map(manifestModuleId),
    );

    const unrouted = VIEW_MODULE_IDS.filter((moduleId) => !routed.has(moduleId)).map(
      (moduleId) => `${moduleId} is rendered by no route`,
    );

    expect(unrouted).toEqual([]);
  });

  it('imports every component from at least one other module under client/src', () => {
    const unconsumed = COMPONENT_MODULE_IDS.filter(
      (moduleId) => importersOf(moduleId).length === 0,
    ).map((moduleId) => `${moduleId} is imported by no other module`);

    expect(unconsumed).toEqual([]);
  });
});

describe('suite hygiene', () => {
  it('issues no network request while loading or asserting, with fetch stubbed', () => {
    expect(network.fetchSpy).toHaveBeenCalledTimes(0);
    expect(network.attempts).toEqual([]);
  });
});
