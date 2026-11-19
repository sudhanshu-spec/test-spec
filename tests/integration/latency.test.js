/**
 * @fileoverview Read-latency integration test for the menu catalog endpoint
 * @module tests/integration/latency
 *
 * Proves the read path's latency budget: twenty sequential requests for the
 * menu catalog, issued against a freshly seeded database through the real HTTP
 * pipeline (router, service, repository and a warmed SQLite file), must stay
 * under 200 ms at the 95th percentile.
 *
 * Two properties are what make the measurement meaningful instead of
 * incidental:
 * - the first request of the suite is untimed. It is the request that opens the
 *   memoised connection, applies schema.sql and inserts the seed, so that work
 *   is never attributed to a measured sample and every sample runs against an
 *   already-warm database.
 * - the samples are sequential and identical. Awaiting each request measures
 *   read latency, while running them concurrently would measure queueing, and
 *   issuing the same path every iteration keeps the durations comparable.
 *
 * The suite owns its database: DB_FILE points at a temporary file that this
 * process alone uses, so it never touches data/app.db, never assumes data/
 * exists, and never depends on the state another suite leaves behind.
 */

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const previousDbFile = process.env.DB_FILE;
const dbFile = path.join(os.tmpdir(), `burger-latency-${process.pid}-${Date.now()}.db`);

// Assigned before the application is required: src/config reads process.env
// once, at require time, and src/db resolves config.dbFile on the first open.
process.env.DB_FILE = dbFile;

jest.resetModules();

const request = require('supertest');
const app = require('../../src/app');

/**
 * @typedef {import('supertest').Response} SupertestResponse
 */

/**
 * Number of sequential requests the percentile is computed from.
 * @type {number}
 */
const SAMPLE_COUNT = 20;

/**
 * The request every sample issues. It is deliberately the plain catalog read
 * with no query, so all samples are the same request.
 * @type {string}
 */
const MEASURED_PATH = '/api/menu-items';

/**
 * Minimum number of items the seeded catalog must expose for the measurement to
 * describe a populated read path rather than an empty table.
 * @type {number}
 */
const MINIMUM_SEEDED_ITEMS = 12;

/**
 * Makes a GET request and returns the response.
 * @param {string} requestPath - Request path
 * @returns {Promise<SupertestResponse>} Supertest response
 */
function get(requestPath) {
  return request(app).get(requestPath);
}

/**
 * Deletes the temporary database file with its write-ahead log and shared
 * memory files, tolerating the ones a closed connection has already removed.
 * @returns {void}
 */
function removeDatabaseFiles() {
  for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    fs.rmSync(file, { force: true });
  }
}

describe('Read latency (menu items)', () => {
  /**
   * Response of the untimed warm-up request: the one that opens the database,
   * applies the schema and inserts the seed.
   * @type {SupertestResponse|null}
   */
  let warmUpResponse = null;

  beforeAll(async () => {
    warmUpResponse = await get(MEASURED_PATH);
  });

  afterAll(() => {
    // The connection is closed first: an open handle keeps the file, its -wal
    // and its -shm in place, so unlinking before the close would leave them.
    require('../../src/db').closeDb();
    removeDatabaseFiles();

    if (previousDbFile === undefined) {
      delete process.env.DB_FILE;
    } else {
      process.env.DB_FILE = previousDbFile;
    }
  });

  test('serves at least twelve seeded menu items priced in integer cents', () => {
    expect(warmUpResponse.status).toBe(200);

    const items = warmUpResponse.body.items;
    expect(items.length).toBeGreaterThanOrEqual(MINIMUM_SEEDED_ITEMS);

    // A measurement over an empty or unseeded catalog would say nothing about
    // the read path, and a fractional price would mean the cent contract is
    // broken before any timing is considered. The offenders, not just a count,
    // go into the failure output.
    const invalidPrices = items
      .filter((item) => !Number.isInteger(item.price_cents))
      .map((item) => ({ name: item.name, price_cents: item.price_cents }));

    expect(invalidPrices).toStrictEqual([]);
  });

  test('keeps the 95th percentile of twenty sequential reads under 200 ms', async () => {
    /** @type {number[]} */
    const durationsMs = [];
    /** @type {number[]} */
    const statuses = [];

    for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
      // Timed around the await only: the response is inspected after the clock
      // is read, so assertion work never inflates a sample.
      const startedAt = process.hrtime.bigint();
      const response = await get(MEASURED_PATH);
      const finishedAt = process.hrtime.bigint();

      durationsMs.push(Number(finishedAt - startedAt) / 1e6);
      statuses.push(response.status);
    }

    const sortedDurationsMs = [...durationsMs].sort((left, right) => left - right);
    const percentileIndex = Math.min(SAMPLE_COUNT - 1, Math.ceil(0.95 * SAMPLE_COUNT) - 1);
    const percentileMs = sortedDurationsMs[percentileIndex];

    expect(statuses.filter((status) => status !== 200)).toStrictEqual([]);
    expect(durationsMs).toHaveLength(SAMPLE_COUNT);

    console.log(
      `Read latency: p95 ${percentileMs.toFixed(3)} ms over ${SAMPLE_COUNT} sequential GET ` +
        `${MEASURED_PATH} requests, read at index ${percentileIndex} of the sorted samples.`
    );

    // Read from the sorted copy at the computed index, so one slow outlier
    // cannot be averaged away. The assertion carries every duration and the
    // percentile it was computed from, which makes an off-by-one in the index
    // visible from the report alone.
    expect({
      percentileIndex,
      percentileMs: Number(percentileMs.toFixed(3)),
      sortedDurationsMs: sortedDurationsMs.map((duration) => Number(duration.toFixed(3))),
      under200ms: percentileMs < 200
    }).toMatchObject({ under200ms: true });
  });
});
