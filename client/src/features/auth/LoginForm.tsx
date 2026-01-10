/**
 * @fileoverview Login form component for user authentication
 * @module features/auth/LoginForm
 *
 * This component provides a complete login form with:
 * - Email and password input fields with validation
 * - Form submission with loading state
 * - Error handling and display
 * - Debouncing for rapid submissions
 * - Accessibility support (ARIA labels, focus management)
 * - Integration with AuthContext for state management
 * - Navigation after successful login
 *
 * Test coverage target: 90% (high priority as primary user entry point)
 */

import React, { useState, useCallback, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from './AuthContext';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props accepted by the LoginForm component.
 * @interface LoginFormProps
 */
export interface LoginFormProps {
  /** Callback function called on successful login */
  onSuccess?: () => void;
  /** Custom redirect path after successful login (default: '/dashboard') */
  redirectTo?: string;
}

/**
 * Form field validation errors.
 * @interface FormErrors
 */
interface FormErrors {
  /** Email field error message */
  email?: string;
  /** Password field error message */
  password?: string;
  /** General form submission error */
  general?: string;
}

/**
 * Form field values.
 * @interface FormValues
 */
interface FormValues {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default redirect path after successful login.
 * @constant
 */
const DEFAULT_REDIRECT = '/dashboard';

/**
 * Debounce delay in milliseconds for form submissions.
 * @constant
 */
const SUBMIT_DEBOUNCE_MS = 500;

/**
 * Email validation regex pattern.
 * @constant
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates email format.
 * @param email - Email address to validate
 * @returns Error message if invalid, undefined if valid
 */
function validateEmail(email: string): string | undefined {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

/**
 * Validates password requirements.
 * @param password - Password to validate
 * @returns Error message if invalid, undefined if valid
 */
function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  return undefined;
}

/**
 * Validates all form fields.
 * @param values - Form values to validate
 * @returns Object containing any validation errors
 */
function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  
  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }
  
  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }
  
  return errors;
}

/**
 * Checks if form has any validation errors.
 * @param errors - Form errors object
 * @returns True if form has errors, false otherwise
 */
function hasErrors(errors: FormErrors): boolean {
  return !!(errors.email || errors.password || errors.general);
}

// ============================================================================
// LoginForm Component
// ============================================================================

/**
 * Login form component providing user authentication functionality.
 *
 * Features:
 * - Email and password input with validation
 * - Loading state during submission
 * - Error message display
 * - Debounce protection against rapid submissions
 * - Accessibility compliance (ARIA, keyboard navigation)
 * - Focus management on errors
 *
 * @param props - Component props
 * @param props.onSuccess - Callback called on successful login
 * @param props.redirectTo - Path to redirect after login (default: '/dashboard')
 * @returns The LoginForm component
 *
 * @example
 * ```tsx
 * <LoginForm onSuccess={() => console.log('Logged in!')} />
 * ```
 *
 * @example With custom redirect
 * ```tsx
 * <LoginForm redirectTo="/menu" />
 * ```
 */
export function LoginForm({ onSuccess, redirectTo = DEFAULT_REDIRECT }: LoginFormProps): React.ReactElement {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useAuthContext();
  
  // Form state
  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Refs for focus management and debouncing
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const submitCountRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  
  // Combined loading state
  const isLoading = isSubmitting || authLoading;
  
  // Track mount status for async operations
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  /**
   * Updates form field value and clears associated error.
   * @param field - Field name to update
   * @param value - New value for the field
   */
  const updateField = useCallback((field: keyof FormValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);
  
  /**
   * Handles input change events.
   * @param event - Input change event
   */
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'email' || name === 'password') {
      updateField(name, value);
    }
  }, [updateField]);
  
  /**
   * Handles input blur events for touch tracking.
   * @param event - Input blur event
   */
  const handleBlur = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name } = event.target;
    if (name === 'email' || name === 'password') {
      setTouched(prev => ({ ...prev, [name]: true }));
      
      // Validate field on blur
      const fieldError = name === 'email' 
        ? validateEmail(values.email)
        : validatePassword(values.password);
      
      if (fieldError) {
        setErrors(prev => ({ ...prev, [name]: fieldError }));
      }
    }
  }, [values]);
  
  /**
   * Focuses the first field with an error.
   */
  const focusFirstError = useCallback(() => {
    if (errors.email) {
      emailInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
    }
  }, [errors]);
  
  /**
   * Handles form submission.
   * Validates form, calls login API, and handles result.
   * @param event - Form submit event
   */
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Debounce rapid submissions (only when NOT in error state)
    // Allow immediate retry after errors
    const now = Date.now();
    const hasExistingError = !!errors.general;
    if (!hasExistingError && now - lastSubmitTimeRef.current < SUBMIT_DEBOUNCE_MS) {
      submitCountRef.current += 1;
      return;
    }
    lastSubmitTimeRef.current = now;
    submitCountRef.current = 0;
    
    // Don't submit if already loading
    if (isLoading) {
      return;
    }
    
    setSubmitAttempted(true);
    setTouched({ email: true, password: true });
    
    // Validate form
    const formErrors = validateForm(values);
    setErrors(formErrors);
    
    if (hasErrors(formErrors)) {
      // Focus first error field after state update
      setTimeout(focusFirstError, 0);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Attempt login through AuthContext
      await login(values.email.trim(), values.password);
      
      if (!isMountedRef.current) return;
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Navigate to redirect path
      navigate(redirectTo, { replace: true });
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // Handle different error types
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('network') || errorText.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorText.includes('invalid') || errorText.includes('credentials') || 
                   errorText.includes('email') || errorText.includes('password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorText.includes('server') || errorText.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
          // Log server errors for debugging
          console.error('Login server error:', error);
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ general: errorMessage });
      
      // Reset debounce timer on error to allow immediate retry
      lastSubmitTimeRef.current = 0;
      
      // Focus email field for retry
      emailInputRef.current?.focus();
      
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [values, isLoading, login, onSuccess, navigate, redirectTo, focusFirstError, errors.general]);
  
  /**
   * Handles keyboard events for form submission.
   * @param event - Keyboard event
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Let the form handle the submission naturally
      return;
    }
  }, []);
  
  // Determine if submit button should be disabled
  const isSubmitDisabled = isLoading || (submitAttempted && hasErrors(validateForm(values)));
  
  // Show field errors only if touched or submit attempted
  const showEmailError = (touched.email || submitAttempted) && errors.email;
  const showPasswordError = (touched.password || submitAttempted) && errors.password;
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="login-form"
      aria-label="Login form"
      noValidate
    >
      {/* General error message */}
      {errors.general && (
        <div 
          role="alert" 
          className="login-form__error login-form__error--general"
          aria-live="assertive"
        >
          {errors.general}
        </div>
      )}
      
      {/* Email field */}
      <div className="login-form__field">
        <label htmlFor="login-email" className="login-form__label">
          Email
        </label>
        <input
          ref={emailInputRef}
          id="login-email"
          type="email"
          name="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`login-form__input ${showEmailError ? 'login-form__input--error' : ''}`}
          aria-invalid={showEmailError ? 'true' : 'false'}
          aria-describedby={showEmailError ? 'login-email-error' : undefined}
          autoComplete="email"
          autoFocus
          disabled={isLoading}
        />
        {showEmailError && (
          <div 
            id="login-email-error" 
            role="alert"
            className="login-form__error"
            aria-live="polite"
          >
            {errors.email}
          </div>
        )}
      </div>
      
      {/* Password field */}
      <div className="login-form__field">
        <label htmlFor="login-password" className="login-form__label">
          Password
        </label>
        <input
          ref={passwordInputRef}
          id="login-password"
          type="password"
          name="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`login-form__input ${showPasswordError ? 'login-form__input--error' : ''}`}
          aria-invalid={showPasswordError ? 'true' : 'false'}
          aria-describedby={showPasswordError ? 'login-password-error' : undefined}
          autoComplete="current-password"
          disabled={isLoading}
        />
        {showPasswordError && (
          <div 
            id="login-password-error" 
            role="alert"
            className="login-form__error"
            aria-live="polite"
          >
            {errors.password}
          </div>
        )}
      </div>
      
      {/* Submit button */}
      <div className="login-form__actions">
        <button
          type="submit"
          className="login-form__submit"
          disabled={isSubmitDisabled}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span className="login-form__spinner" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </div>
    </form>
  );
}

// Default export for convenience
export default LoginForm;
