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
 * carried by the form's `aria-busy` and one `role="status"` sentence with the
 * submit control disabled; and the failure state, which names each offending
 * field and leaves the submit control live so the registration can be retried.
 *
 * @module client/src/views/RegisterView
 */

import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import type { ApiFieldDetail } from '../api/client';
import { register } from '../api/auth';
import { BusyStatus, EmailField, FormFeedback, PasswordField, TextField } from '../components/FormControls';
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
/** Names the fields rather than a position: this region sits above them, while the highlighted field and its message sit below. */
const RETRY_MESSAGE = 'Correct the highlighted fields, then submit the form again to retry.';
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

/**
 * The courtesy check for the name, applied to the value as it stands: trimmed
 * exactly as the request body is, present, and within the length the endpoint
 * accepts.
 *
 * @param value - The name as typed.
 * @returns The message the field shows while the value is unusable, or
 *   undefined when the value may be sent.
 */
function nameMessage(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed === '') {
    return NAME_REQUIRED_MESSAGE;
  }

  return trimmed.length > NAME_MAX_LENGTH ? NAME_TOO_LONG_MESSAGE : undefined;
}

/**
 * The courtesy check for the address: trimmed as the request body is, present,
 * and of the shape the endpoint applies.
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
 * The courtesy check for the password, in the order the endpoint applies it:
 * present, then at least the minimum number of characters, then within the byte
 * ceiling scrypt input is capped at.
 *
 * @param value - The password as typed.
 * @returns The message the field shows while the value is unusable, or
 *   undefined when the value may be sent.
 */
function passwordMessage(value: string): string | undefined {
  if (value === '') {
    return PASSWORD_REQUIRED_MESSAGE;
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_TOO_SHORT_MESSAGE;
  }

  return byteLength(value) > PASSWORD_MAX_BYTES ? PASSWORD_TOO_LONG_MESSAGE : undefined;
}

/** The courtesy rule each field of this form is held to, keyed the API's way. */
const FIELD_RULES: Record<ValidatedField, (value: string) => string | undefined> = {
  name: nameMessage,
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

  const showingFieldFailure = Object.keys(messages).length > 0 || Object.keys(details).length > 0;

  /**
   * Applies a user edit to the failures on screen: the edited field's message is
   * re-checked against the new value instead of being discarded, its server
   * `detail` is dropped because a verdict about the value that was submitted
   * cannot be re-checked here, and every form-level message a submit produced is
   * cleared. The other fields keep their own, so correcting one value does not
   * hide the rest. The duplicate-address verdict is pinned to the email field as
   * one of its messages, so what is left of it after a re-check describes the
   * address the user is now typing rather than the one that was refused.
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
   * would accept is rejected here. The field rules are the ones the same fields
   * are re-checked against while they are edited, so a message reads the same
   * whether it arrived on submit or stayed through a correction.
   *
   * @returns A message per offending field; empty when every value looks usable.
   */
  function courtesyMessages(): FieldMessages {
    const found: FieldMessages = {};
    const nameFailure = nameMessage(name);
    const emailFailure = emailMessage(email);
    const passwordFailure = passwordMessage(password);

    if (nameFailure !== undefined) {
      found.name = nameFailure;
    }

    if (emailFailure !== undefined) {
      found.email = emailFailure;
    }

    if (passwordFailure !== undefined) {
      found.password = passwordFailure;
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
      <h1 className="page-title" tabIndex={-1} id="register-title">Create your account</h1>
      <p className="field__hint">
        One account is all you need to order burgers and reserve a table.
      </p>

      <form className="stack" onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        <FormFeedback
          error={summary}
          message={unexpectedFailure ? UNEXPECTED_FAILURE_MESSAGE : null}
          hint={showingFieldFailure && !submitting ? RETRY_MESSAGE : null}
        />

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
            handleEdit('name', event.target.value);
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
            handleEdit('email', event.target.value);
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
        Already have an account? <Link className="inline-link" to="/login">Sign in</Link>
      </p>
    </section>
  );
}

export default RegisterView;
