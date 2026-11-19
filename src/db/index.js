/**
 * Database Connection Module
 *
 * This module is the single owner of the SQLite connection lifecycle. It creates
 * the directory the database file lives in, opens one memoised connection,
 * applies the connection pragmas the schema relies on, applies schema.sql and
 * seeds the menu reference data on the first open, and closes the connection on
 * shutdown. No repository, service, middleware or test helper opens, configures
 * or closes a connection: all of them call getDb().
 *
 * Design pattern: lazy singleton - every side effect happens inside the first
 * getDb() call, so requiring this module opens nothing and touches no file.
 *
 * @module src/db
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('../config');
const { seedIfEmpty } = require('./seed');

/**
 * The one open connection, or null when no database is open. Module-scoped, so
 * getDb() hands back the same handle on every call and closeDb() can clear it.
 *
 * @type {Object|null}
 */
let connection = null;

/**
 * Return the open database connection, opening it on the first call.
 *
 * The first call creates the parent directory of config.dbFile if it is absent,
 * opens the file, enables foreign-key enforcement and WAL journaling, applies
 * schema.sql and seeds the menu reference data when the tables are still empty.
 * The handle is memoised only after all of that succeeds, so every later call
 * returns the same object. A failed first open closes the partially initialised
 * handle and rethrows, which leaves the memo empty so the next call retries.
 *
 * @returns {Object} The open, schema-applied, seeded database connection.
 * @throws {Error} If the directory cannot be created, the file cannot be opened,
 *   or a pragma, schema statement or seed insert fails.
 */
function getDb() {
  if (connection) {
    return connection;
  }

  // Read at call time rather than into a module constant: the path comes from
  // config.dbFile and nowhere else, and re-reading it lets a process that reset
  // its module registry adopt a reloaded configuration.
  const dbFile = path.resolve(config.dbFile);

  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const opened = new Database(dbFile);

  try {
    // Foreign keys are enforced per connection and SQLite defaults them off, so
    // this pragma is what makes the schema's REFERENCES clauses real. Both
    // pragmas must be in place before any statement runs.
    opened.pragma('foreign_keys = ON');
    opened.pragma('journal_mode = WAL');
    opened.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    seedIfEmpty(opened);
  } catch (error) {
    // A half-initialised handle must not be left behind: closing it releases the
    // file so the next getDb() retries from a clean state.
    opened.close();
    throw error;
  }

  connection = opened;

  return connection;
}

/**
 * Close the open database connection, if there is one.
 *
 * A complete no-op when nothing was ever opened, which is what lets the server's
 * shutdown path call it whether or not the database was used. Idempotent: a
 * second call finds the memo already cleared and returns without throwing. A
 * later getDb() opens the file again, re-applies the idempotent schema and skips
 * the seed because the categories table already holds rows.
 *
 * @returns {void}
 */
function closeDb() {
  if (!connection) {
    return;
  }

  const opened = connection;
  opened.close();
  connection = null;
}

module.exports = { getDb, closeDb };
