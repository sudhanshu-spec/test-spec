/**
 * @fileoverview Shared form controls — labelled inputs, inline field errors and
 * the form-level error summary.
 *
 * One responsibility: render a labelled input with the API's own message for
 * it. No state, no async work, no network — it takes the error envelope's types
 * only, so the text a user reads for a failure is always the server's, never a
 * client-side substitute for it.
 *
 * Consumers: `LoginView`, `RegisterView`, `ReservationFormView` and the Place
 * Order (checkout) step of `CartView`.
 *
 * @module client/src/components/FormControls
 */

import type { InputHTMLAttributes, JSX } from 'react';

import type { ApiError, ApiFieldDetail } from '../api/client';

/** The input types a control in this module may declare. */
export type FormControlType = 'text' | 'email' | 'password' | 'date' | 'time' | 'number';

/**
 * Props shared by the six controls: every native input attribute except the
 * ones this module owns, plus the label and the two error sources. `id` and
 * `label` are required because a real `<label htmlFor>` is, and `className` is
 * omitted so the component itself puts `.control` on the input — which is what
 * keeps the 44x44px touch target. An exported control pins its own `type`, so a
 * caller may state a `type` only as the default the control overrides.
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

/**
 * Renders one field's failure with the server's `issue` string as the visible
 * text; `data-field`/`data-issue` carry the envelope's own values so a test
 * locates an entry without parsing it. No `role`: field errors are announced
 * through the input's `aria-describedby`, so a second live region would make
 * `getByRole('alert')` ambiguous.
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
 * all five exported controls delegate to.
 *
 * @param props - The shared form props plus the input type this field fixes.
 * @returns The field element.
 */
function Field({ id, label, hint, error, detail, type, required, value, onChange, ...rest }: FieldProps): JSX.Element {
    const hasError = Boolean(detail?.issue ?? error);
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = hasError ? `${id}-error` : undefined;

    return (
        <div className="field">
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
                aria-describedby={describedByIds(hintId, errorId)}
            />
            {hint ? <p className="field__hint" id={`${id}-hint`}>{hint}</p> : null}
            <FieldError id={`${id}-error`} detail={detail} message={error} />
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
