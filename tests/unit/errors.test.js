/**
 * @fileoverview Unit tests for the error vocabulary module (src/errors.js)
 * @module tests/unit/errors
 */

'use strict';

const { AppError, ERROR_CODES, RESERVATION_ISSUES } = require('../../src/errors');

/**
 * The thirteen contract error codes paired with the HTTP status each one is
 * answered with, in the order the API contract lists them.
 * @type {Array<[string, number]>}
 */
const CONTRACT_CODES = [
  ['VALIDATION_ERROR', 400],
  ['INVALID_CREDENTIALS', 401],
  ['TOKEN_REQUIRED', 401],
  ['TOKEN_INVALID', 401],
  ['TOKEN_EXPIRED', 401],
  ['EMAIL_ALREADY_REGISTERED', 409],
  ['CATEGORY_NOT_FOUND', 404],
  ['MENU_ITEM_NOT_FOUND', 404],
  ['MENU_ITEM_UNAVAILABLE', 409],
  ['ORDER_NOT_FOUND', 404],
  ['RESERVATION_CONFLICT', 409],
  ['ROUTE_NOT_FOUND', 404],
  ['INTERNAL_ERROR', 500]
];

/** Issue string fixed by the contract for a requested datetime in the past. */
const DATETIME_IN_PAST = 'reservation_datetime_in_past';

/** Issue string fixed by the contract for a time outside the service window. */
const TIME_OUTSIDE_SERVICE_HOURS = 'reservation_time_outside_service_hours';

describe('Error Vocabulary Module - errors.js', () => {
  describe('ERROR_CODES', () => {
    test('exposes exactly the thirteen contract codes and nothing else', () => {
      expect(Object.keys(ERROR_CODES)).toEqual(CONTRACT_CODES.map(([code]) => code));
    });

    test.each(CONTRACT_CODES)('pairs %s with status %i', (code, status) => {
      expect(ERROR_CODES[code]).toBe(status);
    });

    test('is frozen, so no module can introduce a fourteenth code at runtime', () => {
      expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    });

    test('exposes no member whose value is not an integer HTTP status', () => {
      expect(Object.values(ERROR_CODES).every(status => Number.isInteger(status))).toBe(true);
    });
  });

  describe('AppError', () => {
    test('is an instance of Error that keeps the message it was given', () => {
      const error = new AppError('VALIDATION_ERROR', 'name must not be empty');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('name must not be empty');
    });

    test("names itself 'AppError' rather than 'Error'", () => {
      expect(new AppError('INTERNAL_ERROR', 'unexpected failure').name).toBe('AppError');
    });

    test.each(CONTRACT_CODES)('echoes code %s and resolves its status from ERROR_CODES', (code, status) => {
      const error = new AppError(code, `failure reported as ${code}`);

      expect(error.code).toBe(code);
      expect(error.status).toBe(ERROR_CODES[code]);
      expect(error.status).toBe(status);
    });

    test('resolves the status from ERROR_CODES rather than accepting one from the caller', () => {
      const error = new AppError('VALIDATION_ERROR', 'bad input', undefined, 418);

      expect(error.status).toBe(400);
    });

    test('leaves details undefined when none are supplied', () => {
      expect(new AppError('ROUTE_NOT_FOUND', 'no route matches').details).toBeUndefined();
    });

    test('passes supplied details through unchanged', () => {
      const details = [{ field: 'email', issue: 'not_a_valid_email_address' }];

      expect(new AppError('VALIDATION_ERROR', 'invalid email', details).details).toBe(details);
    });

    test.each([
      ['NOT_A_CONTRACT_CODE'],
      ['validation_error'],
      [''],
      ['toString'],
      ['constructor']
    ])('rejects the code %p outside the vocabulary with a TypeError', code => {
      expect(() => new AppError(code, 'unknown code')).toThrow(TypeError);
    });

    test('names the rejected code in the TypeError message', () => {
      /** @type {Error|undefined} */
      let thrown;

      try {
        new AppError('TOTALLY_UNKNOWN', 'unknown code');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown.message).toBe('Unknown error code: TOTALLY_UNKNOWN');
    });
  });

  describe('RESERVATION_ISSUES', () => {
    test('exposes exactly the two contract issue strings, one member name each', () => {
      expect(Object.keys(RESERVATION_ISSUES).sort()).toEqual([
        'DATETIME_IN_PAST',
        'TIME_OUTSIDE_SERVICE_HOURS'
      ]);
    });

    test.each([
      ['DATETIME_IN_PAST', DATETIME_IN_PAST],
      ['TIME_OUTSIDE_SERVICE_HOURS', TIME_OUTSIDE_SERVICE_HOURS]
    ])('%s carries the verbatim contract string %s', (memberName, issue) => {
      expect(RESERVATION_ISSUES[memberName]).toBe(issue);
    });

    test('is frozen, so no module can invent a third issue string', () => {
      expect(Object.isFrozen(RESERVATION_ISSUES)).toBe(true);
    });
  });
});
