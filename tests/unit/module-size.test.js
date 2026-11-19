/**
 * @fileoverview Mechanical guard over the 200-line ceiling of rule R-10 for the
 * server tier: server.js and every JavaScript module beneath src/.
 *
 * The suite reads the filesystem and nothing else. It requires no production
 * module, opens no database, binds no port and issues no HTTP request, and it
 * enumerates its targets at run time, so a module that lands later in the same
 * delivery is measured without editing this file.
 *
 * This is an additional guard beside R-10's own stated check — the line-count
 * assertion in the review notes — and never a replacement for it. A file this
 * suite reports at or above the ceiling is a real finding about that file.
 *
 * @module tests/unit/module-size
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** @type {string} Repository root, one level above the tests directory. */
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Ceiling from rule R-10: a module holding this many lines or more is reported.
 * @type {number}
 */
const MAX_MODULE_LINES = 200;

/**
 * Floor on the enumeration size. A traversal that silently returns nothing
 * would otherwise satisfy every per-file assertion vacuously.
 * @type {number}
 */
const MIN_MODULE_COUNT = 20;

/**
 * @typedef {Object} FileLineCount
 * @property {string} file - Absolute path of the measured module
 * @property {number} lineCount - Number of lines the module holds
 */

/**
 * Collects every JavaScript file beneath a directory, in directory order.
 *
 * Entries are typed by the directory listing itself rather than by a second
 * stat call per entry, and a nested node_modules directory is skipped so an
 * installed dependency can never be measured as a module of this repository.
 *
 * @param {string} dir - Absolute path of the directory to walk
 * @returns {string[]} Absolute paths of the `.js` files found
 */
function collectJsFiles(dir) {
  const collected = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        collected.push(...collectJsFiles(entryPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      collected.push(entryPath);
    }
  }

  return collected;
}

/**
 * Counts the lines held by file content.
 *
 * Exactly one trailing newline is stripped first, so a file ending in a newline
 * gains no phantom final line and a file ending without one keeps its last line.
 *
 * @param {string} content - Full text of a module
 * @returns {number} Number of lines the content occupies
 */
function countLines(content) {
  const normalised = content.endsWith('\n') ? content.slice(0, -1) : content;
  return normalised.split('\n').length;
}

/**
 * Reads one module from disk and measures it.
 * @param {string} file - Absolute path of the module
 * @returns {FileLineCount} The module's path and line count
 */
function measureModule(file) {
  return { file, lineCount: countLines(fs.readFileSync(file, 'utf8')) };
}

/**
 * Lists the server-tier modules: the entry point followed by the src/ walk,
 * de-duplicated so a path listed twice cannot flatter the count.
 * @returns {string[]} Absolute paths of every module subject to R-10
 */
function listServerTierModules() {
  const enumerated = [path.join(PROJECT_ROOT, 'server.js')]
    .concat(collectJsFiles(path.join(PROJECT_ROOT, 'src')));

  return Array.from(new Set(enumerated));
}

/**
 * Renders an absolute path relative to the repository root, for messages that
 * name the offending module without the checkout prefix.
 * @param {string} file - Absolute path of the module
 * @returns {string} Path relative to the repository root
 */
function toProjectPath(file) {
  return path.relative(PROJECT_ROOT, file);
}

describe('Module size - R-10 ceiling', () => {
  describe('Module enumeration', () => {
    test('enumerates at least twenty server-tier modules', () => {
      expect(listServerTierModules().length).toBeGreaterThanOrEqual(MIN_MODULE_COUNT);
    });

    test('de-duplicates the enumeration, so a repeated path cannot flatter the count', () => {
      const modules = listServerTierModules();

      expect(modules).toHaveLength(new Set(modules).size);
    });

    test('contains server.js and every JavaScript file the src walk finds', () => {
      const modules = listServerTierModules();
      const srcModules = collectJsFiles(path.join(PROJECT_ROOT, 'src'));

      expect(modules).toContain(path.join(PROJECT_ROOT, 'server.js'));
      expect(srcModules.length).toBeGreaterThan(0);
      expect(modules.filter(file => srcModules.includes(file))).toEqual(srcModules);
    });

    test('reads only server.js and the JavaScript beneath src', () => {
      const serverFile = path.join(PROJECT_ROOT, 'server.js');
      const srcPrefix = path.join(PROJECT_ROOT, 'src') + path.sep;
      const modules = listServerTierModules();

      expect(modules.filter(file => file !== serverFile && !file.startsWith(srcPrefix))).toEqual([]);
      expect(modules.filter(file => file.includes(`${path.sep}node_modules${path.sep}`))).toEqual([]);
    });

    test('includes src/config/index.js and src/app.js, so an empty src walk cannot pass', () => {
      expect(listServerTierModules()).toEqual(expect.arrayContaining([
        path.join(PROJECT_ROOT, 'src', 'config', 'index.js'),
        path.join(PROJECT_ROOT, 'src', 'app.js')
      ]));
    });
  });

  describe('Line counting', () => {
    test('adds no phantom line for a single trailing newline', () => {
      expect(countLines('alpha\nbeta\n')).toBe(2);
    });

    test('keeps the last line of content that ends without a newline', () => {
      expect(countLines('alpha\nbeta')).toBe(2);
    });

    test('strips a single trailing newline only, preserving a deliberate final blank line', () => {
      expect(countLines('alpha\n\n')).toBe(2);
    });
  });

  describe('The ceiling', () => {
    test('keeps every server-tier module under 200 lines', () => {
      const oversized = listServerTierModules()
        .map(measureModule)
        .filter(record => record.lineCount >= MAX_MODULE_LINES)
        .map(record => `${toProjectPath(record.file)} holds ${record.lineCount} lines, `
          + `at or above the ${MAX_MODULE_LINES}-line ceiling of R-10`);

      expect(oversized).toEqual([]);
    });
  });
});
