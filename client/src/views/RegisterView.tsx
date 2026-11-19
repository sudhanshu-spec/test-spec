/**
 * @fileoverview Registration view — screen 1 of the ten-screen inventory.
 *
 * The account form served at '/register'. It collects a name, an address and a
 * password, posts them through `register` and hands the session the API minted
 * to the session provider before moving to the menu. Route protection and the
 * route table live in `client/src/main.tsx`, an expired session is the session
 * provider's unauthorized hook, and every account rule is the API's, so none of
 * the three is repeated here.
 *
 * Three boundaries this file keeps:
 * - The server is authoritative. The form re-applies only the rules the
 *   registration endpoint documents — a name of at most 80 characters, an
 *   address of the shape `a@b.c`, and a password of at least 8 characters and at
 *   most 72 bytes — so a registration the API would accept is never blocked. The
 *   API's own verdict arrives as `ApiError.details` and is rendered against the
 *   field each entry names.
 * - The password lives only in this component's field state. It travels in the
 *   request body, is never logged and is never re-rendered as text, and no hash,
 *   salt or token column is read because `AuthResponse` carries the secret-free
 *   projection and nothing else.
 * - One error surface. `ApiError` is the only failure type; a throw that is not
 *   one is reported as the fixed internal-error summary rather than as a
 *   rendered exception.
 *
 * Four states are explicit: the empty form, which offers the way to the sign-in
 * screen; the populated form once values are typed; the submitting state,
 * announced through `role="status"` with the submit control disabled; and the
 * failure state, which names each offending field and leaves the submit control
 * live so the registration can be retried.
 *
 * @module client/src/views/RegisterView
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { register } from '../api/auth';
import { EmailField, FormMessage, PasswordField, TextField } from '../components/FormControls';
import { useSession } from '../state/session';

/** Longest accepted name, in characters. Matches the registration endpoint. */
const NAME_MAX_LENGTH = 80;
/** Shortest accepted password, in characters. Matches the registration endpoint. */
const PASSWORD_MIN_LENGTH = 8;
/**
 * Longest accepted password, in BYTES. A multi-byte character counts once as a
 * character yet several times towards the scrypt input limit this cap guards.
 */
const PASSWORD_MAX_BYTES = 72;

/**
 * Deliberately loose, and identical to the pattern the registration endpoint
 * applies: it rejects what cannot be an address and leaves the rest to the API.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_REQUIRED_MESSAGE = 'Enter your name.';
const NAME_TOO_LONG_MESSAGE = `Use ${NAME_MAX_LENGTH} characters or fewer.`;
const EMAIL_REQUIRED_MESSAGE = 'Enter your email address.';
const EMAIL_INVALID_MESSAGE = 'Enter an email address such as name@example.com.';
const PASSWORD_REQUIRED_MESSAGE = 'Choose a password.';
const PASSWORD_TOO_SHORT_MESSAGE = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
const PASSWORD_TOO_LONG_MESSAGE =
  `Use a shorter password: ${PASSWORD_MAX_BYTES} bytes is the maximum, and accented letters and emoji count as several each.`;
const EMAIL_ALREADY_REGISTERED_MESSAGE =
  'An account already uses this email address. Sign in instead of registering again.';
const UNEXPECTED_FAILURE_MESSAGE =
  'Something went wrong while creating your account. Nothing was saved, and you can try again.';
const RETRY_MESSAGE = 'Correct what is highlighted above, then submit the form again to retry.';
const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters.`;
const SUBMIT_LABEL = 'Create account';
const SUBMITTING_MESSAGE = 'Creating your account…';

/** One field of this form that the registration endpoint validates. */
type ValidatedField = 'name' | 'email' | 'password';

/** This form's own messages, keyed by the API's field names. */
type FieldMessages = Partial<Record<ValidatedField, string>>;

/** The API's `details` entries the form renders inline, keyed the same way. */
type FieldDetails = Partial<Record<ValidatedField, ApiFieldDetail>>;

/** @returns Whether the API's field name is one this form renders an input for. */
function isValidatedField(field: string): field is ValidatedField {
  return field === 'name' || field === 'email' || field === 'password';
}

/** @returns The length of the text as UTF-8 bytes, which is what the API caps. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
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
 * Screen 1: the registration form.
 *
 * A successful registration opens the session before navigating, so the layout
 * shows the account's name as soon as the menu renders and no second request is
 * needed to learn who is signed in.
 *
 * @returns The registration form.
 */
export function RegisterView(): JSX.Element {
  const navigate = useNavigate();
  const { login } = useSession();
  const [name, setName] = useState('');
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
   * fields keep theirs, so correcting one value does not hide the rest.
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
   * Renders a failed registration: the fields the API named inline, the
   * duplicate address against the email field, and everything else as the
   * form-level message of the one error envelope.
   *
   * @param error - Whatever `register` threw.
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
    const inlineMessages: FieldMessages = {};

    if (error.code === 'EMAIL_ALREADY_REGISTERED') {
      inlineMessages.email = EMAIL_ALREADY_REGISTERED_MESSAGE;
    } else {
      for (const detail of error.details) {
        if (isValidatedField(detail.field)) {
          inlineDetails[detail.field] = detail;
        }
      }
    }

    const inlineCount = Object.keys(inlineDetails).length + Object.keys(inlineMessages).length;
    // A field this form does not render, a validation failure the API
    // explained with no usable detail, and every other code all have one
    // place to be read: the single envelope message.
    const formLevel = error.code === 'EMAIL_ALREADY_REGISTERED'
      ? false
      : error.code !== 'VALIDATION_ERROR'
        || inlineCount === 0
        || error.details.some((detail) => !isValidatedField(detail.field));

    setMessages(inlineMessages);
    setDetails(inlineDetails);
    setSummary(formLevel ? error : null);
    setUnexpectedFailure(false);
  }

  /**
   * The courtesy checks, reproducing exactly the registration rules the API
   * documents and nothing more. The name counts characters, the password counts
   * characters for its minimum and bytes for its maximum, so no value the API
   * would accept is rejected here.
   *
   * @returns A message per offending field; empty when every value looks usable.
   */
  function courtesyMessages(): FieldMessages {
    const found: FieldMessages = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName === '') {
      found.name = NAME_REQUIRED_MESSAGE;
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      found.name = NAME_TOO_LONG_MESSAGE;
    }

    if (trimmedEmail === '') {
      found.email = EMAIL_REQUIRED_MESSAGE;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      found.email = EMAIL_INVALID_MESSAGE;
    }

    if (password === '') {
      found.password = PASSWORD_REQUIRED_MESSAGE;
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      found.password = PASSWORD_TOO_SHORT_MESSAGE;
    } else if (byteLength(password) > PASSWORD_MAX_BYTES) {
      found.password = PASSWORD_TOO_LONG_MESSAGE;
    }

    return found;
  }

  /**
   * Creates the account, opens its session and moves to the menu, or renders
   * why it was not created.
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
      const auth = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // The session is opened before the route changes, so the menu renders
      // for a signed-in visitor rather than an anonymous one.
      login(auth);
      navigate('/menu', { replace: true });
    } catch (error) {
      reportFailure(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack" aria-labelledby="register-title">
      <h1 className="page-title" id="register-title">Create your account</h1>
      <p className="field__hint">
        One account is all you need to order burgers and reserve a table.
      </p>

      <form className="stack" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        {unexpectedFailure ? (
          <p className="error-summary" role="alert" data-code="INTERNAL_ERROR">
            {UNEXPECTED_FAILURE_MESSAGE}
          </p>
        ) : null}
        {summary ? <FormMessage error={summary} /> : null}

        <TextField
          id="register-name"
          label="Name"
          required
          autoComplete="name"
          value={name}
          error={messages.name ?? null}
          detail={details.name ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setName(event.target.value);
            clearFailure('name');
          }}
        />

        <EmailField
          id="register-email"
          label="Email"
          required
          autoComplete="email"
          value={email}
          error={messages.email ?? null}
          detail={details.email ?? null}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setEmail(event.target.value);
            clearFailure('email');
          }}
        />

        <PasswordField
          id="register-password"
          label="Password"
          required
          hint={PASSWORD_HINT}
          autoComplete="new-password"
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
        Already have an account? <Link className="inline-link" to="/login">Sign in</Link>
      </p>
    </section>
  );
}

export default RegisterView;
