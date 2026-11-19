/**
 * @fileoverview Login view — screen 2 of the ten-screen inventory.
 *
 * The sign-in form served at '/login'. It collects an address and a password,
 * posts them through `login` and opens the session the API minted before moving
 * to the menu. The route entry, the session provider and every auth guard live
 * in `client/src/main.tsx` and `client/src/components/ProtectedRoute.tsx`, so
 * this module renders the form body only: no `<header>`, no `<nav>`, no guard,
 * no redirect of its own.
 *
 * Three boundaries this file keeps:
 * - The server is authoritative. The only rules re-applied here are the two the
 *   login endpoint can be blocked by before a request is worth making — both
 *   fields present and an address of the shape `a@b.c`. No password rule is
 *   invented: the eight-character floor belongs to registration, and holding a
 *   sign-in to it would lock out an account created before the rule existed.
 *   Everything the API decides arrives as `ApiError` and is rendered from its
 *   `code` and `details`.
 * - One indistinguishable failure. An unknown address and a wrong password are
 *   answered identically by the API on purpose, so `INVALID_CREDENTIALS` renders
 *   as exactly one form-level message and never as a field error: a message
 *   pinned to the address field would tell an attacker which half was wrong, and
 *   would leak the same fact to a user who merely mistyped.
 * - One error surface. `ApiError` is the only failure type; a throw that is not
 *   one is reported as the fixed internal-error summary, never as a rendered
 *   exception. A 401 is not handled here at all — ending a session belongs to
 *   the provider's `configureApiClient` hook.
 *
 * Four states are explicit: the empty form, which offers the way to the
 * registration screen; the populated form once values are typed; the submitting
 * state, announced through `role="status"` with the submit control disabled; and
 * the failure state, which leaves the submit control live so the sign-in can be
 * retried.
 *
 * @module client/src/views/LoginView
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../api/auth';
import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { EmailField, FormMessage, PasswordField } from '../components/FormControls';
import { useSession } from '../state/session';

/**
 * Deliberately loose, and identical to the pattern the endpoints apply: it
 * rejects what cannot be an address and leaves the rest to the API.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_REQUIRED_MESSAGE = 'Enter your email address.';
const EMAIL_INVALID_MESSAGE = 'Enter an email address such as name@example.com.';
const PASSWORD_REQUIRED_MESSAGE = 'Enter your password.';
const UNEXPECTED_FAILURE_MESSAGE =
  'Something went wrong while signing you in. You are not signed in, and you can try again.';
const RETRY_MESSAGE = 'Check the details above, then submit the form again to retry.';
const EMAIL_HINT = 'The address you registered with.';
const PASSWORD_HINT = 'The password belonging to your account.';
const SUBMIT_LABEL = 'Sign in';
const SUBMITTING_MESSAGE = 'Signing you in…';

/** Where a completed sign-in lands: the catalog, the application's home screen. */
const AFTER_LOGIN_PATH = '/menu';

/** One field of this form that the login endpoint validates. */
type ValidatedField = 'email' | 'password';

/** This form's own messages, keyed by the API's field names. */
type FieldMessages = Partial<Record<ValidatedField, string>>;

/** The API's `details` entries the form renders inline, keyed the same way. */
type FieldDetails = Partial<Record<ValidatedField, ApiFieldDetail>>;

/** @returns Whether the API's field name is one this form renders an input for. */
function isValidatedField(field: string): field is ValidatedField {
  return field === 'email' || field === 'password';
}

/** @returns The map with the field's entry removed, or the same map when it had none. */
function withoutField<T>(
  current: Partial<Record<ValidatedField, T>>,
  field: ValidatedField,
): Partial<Record<ValidatedField, T>> {
  if (current[field] === undefined) {
    return current;
  }
  const next = { ...current };
  delete next[field];
  return next;
}

/**
 * Screen 2: the sign-in form.
 *
 * The session is opened before the route changes, so the layout shows the
 * account's name as soon as the menu renders and no second request is needed to
 * learn who is signed in.
 *
 * @returns The login form.
 */
export function LoginView(): JSX.Element {
  const navigate = useNavigate();
  const { login: openSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<FieldMessages>({});
  const [details, setDetails] = useState<FieldDetails>({});
  const [summary, setSummary] = useState<ApiError | null>(null);
  const [unexpectedFailure, setUnexpectedFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasFailure = unexpectedFailure || summary !== null
    || Object.keys(messages).length > 0 || Object.keys(details).length > 0;

  /**
   * Drops the failures a user edit has made stale: the message and the server
   * detail of the field being edited, and every form-level message. The other
   * field keeps its own, so correcting one value does not hide the rest.
   *
   * @param field - The field whose message is no longer accurate.
   */
  function clearFailure(field?: ValidatedField): void {
    if (field !== undefined) {
      setMessages((current) => withoutField(current, field));
      setDetails((current) => withoutField(current, field));
    }
    setSummary(null);
    setUnexpectedFailure(false);
  }

  /**
   * Renders a failed sign-in. `INVALID_CREDENTIALS` becomes the single
   * form-level message the API's own copy supplies, so neither a field nor the
   * wording tells a wrong password from an unknown address. A validation
   * failure names its fields inline; every other code, and a failure whose
   * details this form cannot place, is read from the one envelope instead.
   *
   * @param error - Whatever `login` threw.
   */
  function reportFailure(error: unknown): void {
    if (!(error instanceof ApiError)) {
      setMessages({});
      setDetails({});
      setSummary(null);
      setUnexpectedFailure(true);
      return;
    }

    const inlineDetails: FieldDetails = {};

    if (error.code !== 'INVALID_CREDENTIALS') {
      for (const detail of error.details) {
        if (isValidatedField(detail.field)) {
          inlineDetails[detail.field] = detail;
        }
      }
    }

    const placedCount = Object.keys(inlineDetails).length;
    const placeable = error.details.filter((detail) => isValidatedField(detail.field));
    const formLevel = error.code !== 'VALIDATION_ERROR'
      || placedCount === 0
      || placeable.length !== error.details.length;

    setMessages({});
    setDetails(inlineDetails);
    setSummary(formLevel ? error : null);
    setUnexpectedFailure(false);
  }

  /**
   * The courtesy checks, reproducing only what the form can establish without
   * the server: both values present and an address of the expected shape. No
   * password rule is applied, because the endpoint documents none for a
   * sign-in and the registration floor must not be second-guessed here.
   *
   * @returns A message per offending field; empty when every value is usable.
   */
  function courtesyMessages(): FieldMessages {
    const found: FieldMessages = {};
    const trimmedEmail = email.trim();

    if (trimmedEmail === '') {
      found.email = EMAIL_REQUIRED_MESSAGE;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      found.email = EMAIL_INVALID_MESSAGE;
    }

    if (password === '') {
      found.password = PASSWORD_REQUIRED_MESSAGE;
    }

    return found;
  }

  /**
   * Opens the session and moves to the menu, or renders why it was not opened.
   *
   * @param event - The form submission.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const found = courtesyMessages();
    setMessages(found);
    setDetails({});
    setSummary(null);
    setUnexpectedFailure(false);

    if (Object.keys(found).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const auth = await login({ email: email.trim(), password });
      // The session is opened before the route changes, so the menu only
      // ever renders for a visitor the client already knows is signed in.
      openSession(auth);
      navigate(AFTER_LOGIN_PATH, { replace: true });
    } catch (error) {
      reportFailure(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack" aria-labelledby="login-title">
      <h1 className="page-title" id="login-title">Sign in</h1>
      <p className="field__hint">
        Sign in to place an order and to keep your table reservations in one place.
      </p>

      <form className="stack" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        {unexpectedFailure ? (
          <p className="error-summary" role="alert" data-code="INTERNAL_ERROR">
            {UNEXPECTED_FAILURE_MESSAGE}
          </p>
        ) : null}
        {/* One form-level message for both an unknown address and a wrong
          password: the API answers them identically, so the two are
          indistinguishable here as well. */}
        {summary ? <FormMessage error={summary} /> : null}

        <EmailField
          id="login-email"
          label="Email"
          required
          autoComplete="email"
          hint={EMAIL_HINT}
          value={email}
          error={messages.email ?? null}
          detail={details.email ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setEmail(event.target.value);
            clearFailure('email');
          }}
        />

        <PasswordField
          id="login-password"
          label="Password"
          required
          hint={PASSWORD_HINT}
          autoComplete="current-password"
          value={password}
          error={messages.password ?? null}
          detail={details.password ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setPassword(event.target.value);
            clearFailure('password');
          }}
        />

        {submitting ? <p className="field__hint" role="status">{SUBMITTING_MESSAGE}</p> : null}
        {hasFailure && !submitting ? <p className="field__hint">{RETRY_MESSAGE}</p> : null}

        <div className="row">
          <button className="button" type="submit" disabled={submitting}>
            {SUBMIT_LABEL}
          </button>
        </div>
      </form>

      <p className="field__hint">
        No account yet? <Link className="inline-link" to="/register">Create one</Link> — it takes a moment and is
        what the order and reservation screens are kept behind.
      </p>
    </section>
  );
}

export default LoginView;
