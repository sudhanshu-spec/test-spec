/**
 * @fileoverview Shared form feedback — labelled inputs, each field's message
 * carried in its own polite live region, the persistent form-level region that
 * holds either the failure panel or the retry hint, and the sentence a form
 * announces while its submit is in flight.
 *
 * One responsibility: render a labelled input with the API's own message for
 * it, and the form-level messages a submit produces, in the one shape every
 * screen uses. No state, no async work, no network — it takes the error
 * envelope's types plus the fixed fallback sentence a view supplies, so the
 * text a user reads for a failure is the API's own `issue` or `message`
 * wherever the API supplied one, and the view's fixed sentence only for a
 * throw that never reached it.
 *
 * Consumers: `LoginView`, `RegisterView`, `ReservationFormView`, the item
 * detail's quantity control in `MenuItemView`, and the Place Order (checkout)
 * step of `CartView`.
 *
 * @module client/src/components/FormControls
 */

import type { InputHTMLAttributes, JSX } from 'react';

import type { ApiError, ApiFieldDetail } from '../api/client';

/** The input types a control in this module may declare. */
export type FormControlType = 'text' | 'email' | 'password' | 'date' | 'time' | 'number';

/**
 * Props shared by the six controls: every native input attribute except the
 * ones this module owns, plus the label, the two error sources and the advisory
 * sentence. `id` and `label` are required because a real `<label htmlFor>` is,
 * and `className` is omitted so the component itself puts `.control` on the
 * input — which is what keeps the 44x44px touch target. An exported control
 * pins its own `type`, so a caller may state a `type` only as the default the
 * control overrides.
 */
export interface FormControlProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'id' | 'className' | 'children' | 'aria-invalid' | 'aria-describedby'
  > {
  /** The input's id, and the target of the label's `htmlFor`. */
  id: string;
  /** Visible label text; never replaced by a placeholder. */
  label: string;
  /** Optional helper text, announced through `aria-describedby`. */
  hint?: string;
  /** A plain message, rendered only when no `detail` is supplied. */
  error?: string | null;
  /** The server's own `details` entry for this field; it wins over `error`. */
  detail?: ApiFieldDetail | null;
  /**
   * A sentence about the value the control now holds — a correction the field
   * made, for instance — announced through `aria-describedby` and rendered in
   * the field's own polite live region. It describes a value the field accepts,
   * so it never marks the control invalid; a supplied `error` or `detail`
   * reports a value the field refuses and wins over it.
   */
  advisory?: string | null;
}

/** Props of {@link FieldError}. */
export interface FieldErrorProps {
  id?: string;
  detail?: ApiFieldDetail | null;
  message?: string | null;
  /** Appended to `.field-error`, never a replacement for it. */
  className?: string;
}

/** Props of {@link FormMessage}. */
export interface FormMessageProps {
  /** The failure as the transport reported it: code plus message. */
  error?: ApiError | null;
  /** Rendered when no `ApiError` object is available. */
  message?: string | null;
}

/** Props of {@link FormFeedback}. */
export interface FormFeedbackProps {
  /** The failure as the transport reported it; its `code` becomes the panel's `data-code`. */
  error?: ApiError | null;
  /** Fixed copy for a failure that is not an `ApiError`; the panel reports it as `INTERNAL_ERROR`. */
  message?: string | null;
  /** The retry sentence, shown only when the panel has nothing to report. */
  hint?: string | null;
}

/** Props of {@link BusyStatus}. */
export interface BusyStatusProps {
  /** The sentence to announce; nothing is rendered when there is none. */
  message?: string | null;
}

/**
 * Renders one field's failure with the server's `issue` string as the visible
 * text; `data-field`/`data-issue` carry the envelope's own values so a test
 * locates an entry without parsing it.
 *
 * The announcement is the polite live region {@link Field} keeps around this
 * paragraph: it is in the DOM before any message is inserted, so the insertion
 * is what a screen reader reads, and it leaves the input's `aria-describedby`
 * as the association a reader returns to. This paragraph therefore carries no
 * `role` of its own — a `role="alert"` would announce the same text twice and
 * make the form-level panel's `getByRole('alert')` ambiguous.
 *
 * @param props - The server detail, or the plain message used instead of it.
 * @returns The error paragraph, or null when there is nothing to report.
 */
export function FieldError({ id, detail, message, className }: FieldErrorProps): JSX.Element | null {
  const text = detail?.issue ?? message;

  if (!text) {
    return null;
  }

  return (
    <p className={className ? `field-error ${className}` : 'field-error'}
      id={id} data-field={detail?.field} data-issue={detail?.issue}>
      {text}
    </p>
  );
}

/**
 * Renders the form-level failure as a live region, showing the API's `message`
 * and exposing its `code` as `data-code`; an error with an empty message shows
 * its code rather than an empty alert.
 *
 * @param props - The transport's error object, or a message to render instead.
 * @returns The alert element, or null when there is nothing to report.
 */
export function FormMessage({ error, message }: FormMessageProps): JSX.Element | null {
  const text = error ? error.message || error.code : message;

  if (!text) {
    return null;
  }

  return (
    <div className="error-summary" role="alert" data-code={error?.code}>
      {text}
    </div>
  );
}

/**
 * Renders the form-level feedback region — the one block above a form's
 * controls that holds whatever the form itself has to say. The region is
 * rendered whether or not it has a message, at the height global.css reserves
 * for it, so a message appearing never moves the controls below it.
 *
 * A failure and the invitation to retry are the same moment, so the panel wins
 * and the hint is shown only when there is no panel text: the two never stack.
 * An `ApiError` reports its own `code`; the fixed copy a view supplies instead
 * of one reports `INTERNAL_ERROR`, which is the server's code for exactly that
 * failure.
 *
 * @param props - The transport's error, the fixed copy used instead of one, and
 *   the retry sentence shown when neither is present.
 * @returns The region, holding at most one message.
 */
export function FormFeedback({ error, message, hint }: FormFeedbackProps): JSX.Element {
  const panelText = error ? error.message || error.code : message;
  const hintText = panelText ? null : hint;

  return (
    <div className="form-feedback">
      {panelText ? (
        <div className="error-summary" role="alert" data-code={error ? error.code : 'INTERNAL_ERROR'}>
          {panelText}
        </div>
      ) : null}
      {hintText ? <p className="field__hint">{hintText}</p> : null}
    </div>
  );
}

/**
 * Renders the sentence a form announces while its submit is in flight, in a
 * `role="status"` region: a screen reader hears the wait without the rest of
 * the page being interrupted, and the sentence is the same on every form.
 *
 * @param props - The in-flight sentence, which the calling form owns.
 * @returns The status paragraph, or null when no submit is in flight.
 */
export function BusyStatus({ message }: BusyStatusProps): JSX.Element | null {
  if (!message) {
    return null;
  }

  return <p className="field__hint" role="status">{message}</p>;
}

/** @returns The ids that exist, space-separated, or undefined when none do. */
function describedByIds(...ids: (string | undefined)[]): string | undefined {
  const present = ids.filter((value): value is string => value !== undefined);
  return present.length === 0 ? undefined : present.join(' ');
}

/** Props of the internal {@link Field}: the shared props plus the type it renders. */
interface FieldProps extends FormControlProps {
  type: FormControlType;
}

/**
 * Renders the label, the input and the messages beneath it — the single wrapper
 * all six exported field controls delegate to.
 *
 * The field's message sits inside a polite live region that is rendered from
 * the first paint, empty or not: a live region inserted together with its text
 * is not announced by a screen reader, while text inserted into a region that
 * was already there is. The region is the field's last child so it also holds
 * the message's reserved line height in global.css.
 *
 * The region holds one sentence at a time: the failure a value was refused with
 * while there is one, and otherwise the advisory sentence a caller supplied
 * about the value the field now holds. Only the failure marks the control
 * invalid, which is what lets a correction be explained without leaving a valid
 * control in the invalid state.
 *
 * @param props - The shared form props plus the input type this field fixes.
 * @returns The field element.
 */
function Field({
  id,
  label,
  hint,
  error,
  detail,
  advisory,
  type,
  required,
  value,
  onChange,
  ...rest
}: FieldProps): JSX.Element {
  const hasError = Boolean(detail?.issue ?? error);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const advisoryText = hasError ? null : (advisory ?? null);
  const advisoryId = advisoryText ? `${id}-advisory` : undefined;

  return (
    <div className={hasError ? 'field field--invalid' : 'field'}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="visually-hidden"> (required)</span> : null}
      </label>
      <input
        {...rest}
        id={id}
        name={rest.name ?? id}
        type={type}
        className="control"
        required={required}
        value={value}
        onChange={onChange}
        aria-invalid={hasError}
        aria-describedby={describedByIds(hintId, advisoryId, errorId)}
      />
      {hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
      <div className="field__feedback" aria-live="polite" aria-atomic="true">
        <FieldError id={`${id}-error`} detail={detail} message={error} />
        {advisoryText ? <p className="field__hint" id={`${id}-advisory`}>{advisoryText}</p> : null}
      </div>
    </div>
  );
}

/** @returns A single-line text field. */
export function TextField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="text" />;
}

/**
 * @returns A single-line address field. The `email` input type is what gives a
 * soft keyboard the address layout and what a browser's own autofill keys on;
 * the value's shape is still checked against the API's documented rule by the
 * form that renders it, since the form submits with `noValidate`.
 */
export function EmailField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="email" />;
}

/** @returns A password field. */
export function PasswordField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="password" />;
}

/** @returns A date field. */
export function DateField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="date" />;
}

/** @returns A time field, defaulting to 30-minute steps. */
export function TimeField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="time" step={props.step ?? '1800'} />;
}

/** @returns A number field, defaulting to whole numbers. */
export function NumberField(props: FormControlProps): JSX.Element {
  return <Field {...props} type="number" inputMode={props.inputMode ?? 'numeric'} step={props.step ?? '1'} />;
}
