/**
 * @fileoverview Login view — screen 2 of the ten-screen inventory.
 *
 * The sign-in form served at '/login'. It collects an address and a password,
 * posts them through `login` and opens the session the API minted before moving
 * on — back to the guarded screen the visitor was sent here from, or to the menu
 * when they came on their own. The route entry, the session provider and every
 * auth guard live in `client/src/main.tsx` and
 * `client/src/components/ProtectedRoute.tsx`, so this module renders the form
 * body only: no `<header>`, no `<nav>`, no guard, no redirect of its own.
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
 * A visitor the guard sent here learns why. When the current address carries a
 * usable {@link RETURN_PATH_PARAM} value, the form states what they were opening
 * and the completed sign-in returns them to it in `replace` mode instead of the
 * menu. Only an internal path is ever navigated to: the value is accepted only
 * when it is a root-relative path that resolves to this application's own
 * origin, so it cannot become another origin. A plain `/login` visit renders
 * none of this and lands on the menu as before.
 *
 * Four states are explicit: the empty form, which offers the way to the
 * registration screen; the populated form once values are typed; the submitting
 * state, carried by the form's `aria-busy` and one `role="status"` sentence with
 * the submit control disabled; and the failure state, which leaves the submit
 * control live so the sign-in can be retried.
 *
 * @module client/src/views/LoginView
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { login } from '../api/auth';
import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { BusyStatus, EmailField, FormFeedback, PasswordField } from '../components/FormControls';
import { RETURN_PATH_PARAM } from '../components/ProtectedRoute';
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

/**
 * Notices shown when the guard sent the visitor here from a guarded screen, one per destination.
 * Each names the screen that was asked for and repeats the promise of a return, which is what the
 * guard's `from` parameter makes true.
 */
const CART_RETURN_NOTICE = "Sign in to see your cart. We'll take you back there afterwards.";
const ORDERS_RETURN_NOTICE = "Sign in to see your orders. We'll take you back there afterwards.";
const RESERVATIONS_RETURN_NOTICE =
  "Sign in to see your reservations. We'll take you back there afterwards.";
const OTHER_RETURN_NOTICE =
  "Sign in to continue to that page. We'll take you back there afterwards.";

/** Where a completed sign-in lands when there is no guarded screen to return to: the catalog. */
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

/**
 * The courtesy check for the address, applied to the value as it stands: the
 * value is trimmed exactly as the request body is, so a field holding only
 * spaces is missing rather than malformed, and only a value the endpoint would
 * accept passes.
 *
 * @param value - The address as typed.
 * @returns The message the field shows while the value is unusable, or
 *   undefined when the value may be sent.
 */
function emailMessage(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed === '') {
    return EMAIL_REQUIRED_MESSAGE;
  }

  return EMAIL_PATTERN.test(trimmed) ? undefined : EMAIL_INVALID_MESSAGE;
}

/**
 * The courtesy check for the password: presence, and nothing more. No password
 * rule is invented, because the endpoint documents none for a sign-in.
 *
 * @param value - The password as typed.
 * @returns The message the field shows while the value is empty, or undefined
 *   when the value may be sent.
 */
function passwordMessage(value: string): string | undefined {
  return value === '' ? PASSWORD_REQUIRED_MESSAGE : undefined;
}

/** The courtesy rule each field of this form is held to, keyed the API's way. */
const FIELD_RULES: Record<ValidatedField, (value: string) => string | undefined> = {
  email: emailMessage,
  password: passwordMessage,
};

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
 * @param candidate - The `from` parameter of the current address, or null when it has none.
 * @returns The internal path to return to once the session is open, or null when the parameter is
 * absent or is not an internal path.
 *
 * Only a root-relative path that resolves to this application's own origin is accepted, so a
 * protocol-relative `//host` address, an absolute URL, a bare relative segment and a `/\host`
 * address are all refused: the completed sign-in navigates to this value, and it must never be able
 * to leave this application. A backslash is a path separator to URL resolution, which is how
 * `/\host` becomes another origin, so the prefix alone does not settle it and the resolved origin
 * decides.
 */
function acceptedReturnPath(candidate: string | null): string | null {
  if (candidate === null || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return null;
  }

  const origin = window.location.origin;

  try {
    return new URL(candidate, origin).origin === origin ? candidate : null;
  } catch {
    // No base to resolve against — an opaque `null` origin, for one — or a candidate the parser
    // refuses: neither can be shown to stay on this application, so neither is accepted.
    return null;
  }
}

/**
 * @param returnPath - The accepted return path the visitor will be sent back to.
 * @returns The notice naming the screen they were sent here from, chosen from the path's first
 * segment so `/reservations`, `/reservations/new` and `/reservations/:id` read the same way.
 */
function returnNotice(returnPath: string): string {
  const [firstSegment = ''] = returnPath.slice(1).split(/[/?#]/);

  if (firstSegment === 'cart') {
    return CART_RETURN_NOTICE;
  }
  if (firstSegment === 'orders') {
    return ORDERS_RETURN_NOTICE;
  }
  if (firstSegment === 'reservations') {
    return RESERVATIONS_RETURN_NOTICE;
  }
  return OTHER_RETURN_NOTICE;
}

/**
 * Re-checks a message that is already on screen against the value that replaced
 * it, so the rule a user is being shown stays visible for as long as the value
 * breaks it. A message the field kept passes through unchanged, the message is
 * dropped the moment the value satisfies the rule, and a field with no message
 * gets none — nothing is checked before the first submit.
 *
 * @param current - The messages on screen.
 * @param field - The field being edited.
 * @param value - The value that replaced what the message was about.
 * @returns The messages after the re-check, or the same map when the field had
 *   no message of its own.
 */
function revisedMessages(
  current: FieldMessages,
  field: ValidatedField,
  value: string,
): FieldMessages {
  if (current[field] === undefined) {
    return current;
  }

  const message = FIELD_RULES[field](value);

  if (message === undefined) {
    return withoutField(current, field);
  }

  if (message === current[field]) {
    return current;
  }

  const next: FieldMessages = { ...current };
  next[field] = message;
  return next;
}

/**
 * Screen 2: the sign-in form.
 *
 * The session is opened before the route changes, so the layout shows the
 * account's name as soon as the next screen renders and no second request is
 * needed to learn who is signed in. When the guard sent the visitor here, that
 * screen is the one they asked for, and the form says so above its fields.
 *
 * @returns The login form.
 */
export function LoginView(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: openSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<FieldMessages>({});
  const [details, setDetails] = useState<FieldDetails>({});
  const [summary, setSummary] = useState<ApiError | null>(null);
  const [unexpectedFailure, setUnexpectedFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The guarded screen the visitor was sent here from, when the guard named one and it is internal.
  const returnPath = acceptedReturnPath(searchParams.get(RETURN_PATH_PARAM));

  const showingFieldFailure = Object.keys(messages).length > 0 || Object.keys(details).length > 0;

  /**
   * Applies a user edit to the failures on screen: the edited field's message is
   * re-checked against the new value instead of being discarded, its server
   * `detail` is dropped because a verdict about the value that was submitted
   * cannot be re-checked here, and every form-level message a submit produced is
   * cleared. The other field keeps its own, so correcting one value does not
   * hide the rest.
   *
   * @param field - The field being edited.
   * @param value - The value it now holds.
   */
  function handleEdit(field: ValidatedField, value: string): void {
    setMessages((current) => revisedMessages(current, field, value));
    setDetails((current) => withoutField(current, field));
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
   * sign-in and the registration floor must not be second-guessed here. The
   * field rules are the ones the same fields are re-checked against while they
   * are edited, so a message reads the same whether it arrived on submit or
   * stayed through a correction.
   *
   * @returns A message per offending field; empty when every value is usable.
   */
  function courtesyMessages(): FieldMessages {
    const found: FieldMessages = {};
    const emailFailure = emailMessage(email);
    const passwordFailure = passwordMessage(password);

    if (emailFailure !== undefined) {
      found.email = emailFailure;
    }

    if (passwordFailure !== undefined) {
      found.password = passwordFailure;
    }

    return found;
  }

  /**
   * Opens the session and moves on — back to the guarded screen the guard named, or to the menu —
   * or renders why it was not opened.
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
      // The session is opened before the route changes, so the next screen only
      // ever renders for a visitor the client already knows is signed in.
      openSession(auth);
      // `replace` keeps the completed sign-in form out of the history stack, so
      // Back from the screen returned to does not land on it again.
      navigate(returnPath ?? AFTER_LOGIN_PATH, { replace: true });
    } catch (error) {
      reportFailure(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack" aria-labelledby="login-title">
      {/* Focusable by script only, so the shell's route-change focus can land on this heading. */}
      <h1 className="page-title" id="login-title" tabIndex={-1}>Sign in</h1>
      {/* Only a visitor the guard sent here sees this notice; a plain `/login` visit is unchanged. */}
      {returnPath !== null ? (
        <p className="field__hint" role="status">{returnNotice(returnPath)}</p>
      ) : null}
      <p className="field__hint">
        Sign in to place an order and to keep your table reservations in one place.
      </p>

      <form className="stack" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        {/* One form-level message for both an unknown address and a wrong
          password: the API answers them identically, so the two are
          indistinguishable here as well. The retry sentence is offered only
          while a field is actually highlighted, so it never points at a
          failure the panel above already explains. */}
        <FormFeedback
          error={summary}
          message={unexpectedFailure ? UNEXPECTED_FAILURE_MESSAGE : null}
          hint={showingFieldFailure && !submitting ? RETRY_MESSAGE : null}
        />

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
            handleEdit('email', event.target.value);
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
            handleEdit('password', event.target.value);
          }}
        />

        <BusyStatus message={submitting ? SUBMITTING_MESSAGE : null} />

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
