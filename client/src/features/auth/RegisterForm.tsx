/**
 * @fileoverview Registration form component for new user account creation
 * @module features/auth/RegisterForm
 *
 * This component provides a complete registration form with:
 * - Name, email, password, and confirm password input fields with validation
 * - Password strength requirements (minimum 8 characters)
 * - Password matching validation
 * - Form submission with loading state
 * - Error handling and display (validation, server, network)
 * - Debouncing for rapid submissions
 * - Accessibility support (ARIA labels, focus management)
 * - Navigation after successful registration
 *
 * Test coverage target: 90% (high priority as user registration entry point)
 */

import React, { useState, useCallback, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props accepted by the RegisterForm component.
 * @interface RegisterFormProps
 */
export interface RegisterFormProps {
  /** Callback function called on successful registration */
  onSuccess?: () => void;
  /** Custom redirect path after successful registration (default: '/login') */
  redirectTo?: string;
}

/**
 * Form field validation errors.
 * @interface FormErrors
 */
interface FormErrors {
  /** Name field error message */
  name?: string;
  /** Email field error message */
  email?: string;
  /** Password field error message */
  password?: string;
  /** Confirm password field error message */
  confirmPassword?: string;
  /** General form submission error */
  general?: string;
}

/**
 * Form field values.
 * @interface FormValues
 */
interface FormValues {
  /** User's display name */
  name: string;
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
}

/**
 * Form field touched state.
 * @interface TouchedFields
 */
interface TouchedFields {
  name: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default redirect path after successful registration.
 * @constant
 */
const DEFAULT_REDIRECT = '/login';

/**
 * Debounce delay in milliseconds for form submissions.
 * @constant
 */
const SUBMIT_DEBOUNCE_MS = 500;

/**
 * Minimum password length requirement.
 * @constant
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum name length.
 * @constant
 */
const MAX_NAME_LENGTH = 100;

/**
 * Email validation regex pattern.
 * @constant
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * API base URL for authentication endpoints.
 * @constant
 */
const API_BASE_URL = '/api/auth';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates name field.
 * @param name - Name to validate
 * @returns Error message if invalid, undefined if valid
 */
function validateName(name: string): string | undefined {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return 'Name is required';
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return `Name must be less than ${MAX_NAME_LENGTH} characters`;
  }
  return undefined;
}

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
 * Password must be at least 8 characters.
 * @param password - Password to validate
 * @returns Error message if invalid, undefined if valid
 */
function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

/**
 * Validates confirm password matches password.
 * @param password - Original password
 * @param confirmPassword - Password confirmation
 * @returns Error message if invalid, undefined if valid
 */
function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
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
  
  const nameError = validateName(values.name);
  if (nameError) {
    errors.name = nameError;
  }
  
  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }
  
  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }
  
  const confirmPasswordError = validateConfirmPassword(values.password, values.confirmPassword);
  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }
  
  return errors;
}

/**
 * Checks if form has any validation errors.
 * @param errors - Form errors object
 * @returns True if form has errors, false otherwise
 */
function hasErrors(errors: FormErrors): boolean {
  return !!(errors.name || errors.email || errors.password || errors.confirmPassword || errors.general);
}

// ============================================================================
// RegisterForm Component
// ============================================================================

/**
 * Registration form component providing new user account creation functionality.
 *
 * Features:
 * - Name, email, password, and confirm password inputs with validation
 * - Password strength validation (minimum 8 characters)
 * - Password confirmation matching
 * - Loading state during submission
 * - Error message display (validation, server, network)
 * - Debounce protection against rapid submissions
 * - Accessibility compliance (ARIA, keyboard navigation)
 * - Focus management on errors
 * - Success message on registration
 *
 * @param props - Component props
 * @param props.onSuccess - Callback called on successful registration
 * @param props.redirectTo - Path to redirect after registration (default: '/login')
 * @returns The RegisterForm component
 *
 * @example
 * ```tsx
 * <RegisterForm onSuccess={() => console.log('Registered!')} />
 * ```
 *
 * @example With custom redirect
 * ```tsx
 * <RegisterForm redirectTo="/dashboard" />
 * ```
 */
export function RegisterForm({ onSuccess, redirectTo = DEFAULT_REDIRECT }: RegisterFormProps): React.ReactElement {
  const navigate = useNavigate();
  
  // Form state
  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Refs for focus management and debouncing
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const submitCountRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  
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
    // Clear success message when user modifies form
    if (successMessage) {
      setSuccessMessage(null);
    }
  }, [errors, successMessage]);
  
  /**
   * Handles input change events.
   * @param event - Input change event
   */
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'name' || name === 'email' || name === 'password' || name === 'confirmPassword') {
      updateField(name, value);
    }
  }, [updateField]);
  
  /**
   * Handles input blur events for touch tracking.
   * @param event - Input blur event
   */
  const handleBlur = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name } = event.target;
    if (name === 'name' || name === 'email' || name === 'password' || name === 'confirmPassword') {
      setTouched(prev => ({ ...prev, [name]: true }));
      
      // Validate field on blur
      let fieldError: string | undefined;
      switch (name) {
        case 'name':
          fieldError = validateName(values.name);
          break;
        case 'email':
          fieldError = validateEmail(values.email);
          break;
        case 'password':
          fieldError = validatePassword(values.password);
          // Also revalidate confirm password if it's touched
          if (touched.confirmPassword && values.confirmPassword) {
            const confirmError = validateConfirmPassword(values.password, values.confirmPassword);
            if (confirmError) {
              setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
            } else {
              setErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
          }
          break;
        case 'confirmPassword':
          fieldError = validateConfirmPassword(values.password, values.confirmPassword);
          break;
      }
      
      if (fieldError) {
        setErrors(prev => ({ ...prev, [name]: fieldError }));
      }
    }
  }, [values, touched.confirmPassword]);
  
  /**
   * Focuses the first field with an error.
   */
  const focusFirstError = useCallback(() => {
    if (errors.name) {
      nameInputRef.current?.focus();
    } else if (errors.email) {
      emailInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
    } else if (errors.confirmPassword) {
      confirmPasswordInputRef.current?.focus();
    }
  }, [errors]);
  
  /**
   * Handles form submission.
   * Validates form, calls registration API, and handles result.
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
    if (isSubmitting) {
      return;
    }
    
    setSubmitAttempted(true);
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    
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
    setSuccessMessage(null);
    
    try {
      // Call registration API
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      });
      
      const data = await response.json();
      
      if (!isMountedRef.current) return;
      
      if (!response.ok) {
        // Handle different error types from server
        if (response.status === 409) {
          // Email already exists
          setErrors({
            email: data.details?.email || 'An account with this email already exists',
          });
          emailInputRef.current?.focus();
        } else if (response.status === 400 && data.details) {
          // Server validation errors
          const serverErrors: FormErrors = {};
          if (data.details.name) serverErrors.name = data.details.name;
          if (data.details.email) serverErrors.email = data.details.email;
          if (data.details.password) serverErrors.password = data.details.password;
          setErrors(serverErrors);
          setTimeout(focusFirstError, 0);
        } else {
          // General server error
          setErrors({ general: data.error || 'Registration failed. Please try again.' });
        }
        
        // Reset debounce timer on error to allow immediate retry
        lastSubmitTimeRef.current = 0;
        return;
      }
      
      // Success!
      setSuccessMessage('Registration successful! Redirecting...');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Navigate to redirect path after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          navigate(redirectTo, { replace: true });
        }
      }, 1500);
      
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // Handle network errors
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('failed')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorText.includes('server') || errorText.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
          console.error('Registration server error:', error);
        }
      }
      
      setErrors({ general: errorMessage });
      
      // Reset debounce timer on error to allow immediate retry
      lastSubmitTimeRef.current = 0;
      
      // Focus name field for retry
      nameInputRef.current?.focus();
      
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [values, isSubmitting, onSuccess, navigate, redirectTo, focusFirstError, errors.general]);
  
  /**
   * Handles keyboard events for form navigation.
   * @param event - Keyboard event
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      // Let the form handle the submission naturally
      return;
    }
  }, []);
  
  // Determine if submit button should be disabled
  // Only disable while submitting - keep enabled after validation errors to allow retry
  const isSubmitDisabled = isSubmitting;
  
  // Show field errors only if touched or submit attempted
  const showNameError = (touched.name || submitAttempted) && errors.name;
  const showEmailError = (touched.email || submitAttempted) && errors.email;
  const showPasswordError = (touched.password || submitAttempted) && errors.password;
  const showConfirmPasswordError = (touched.confirmPassword || submitAttempted) && errors.confirmPassword;
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="register-form"
      aria-label="Registration form"
      noValidate
    >
      {/* Success message */}
      {successMessage && (
        <div 
          role="status" 
          className="register-form__success"
          aria-live="polite"
        >
          {successMessage}
        </div>
      )}
      
      {/* General error message */}
      {errors.general && (
        <div 
          role="alert" 
          className="register-form__error register-form__error--general"
          aria-live="assertive"
        >
          {errors.general}
        </div>
      )}
      
      {/* Name field */}
      <div className="register-form__field">
        <label htmlFor="register-name" className="register-form__label">
          Name
        </label>
        <input
          ref={nameInputRef}
          id="register-name"
          type="text"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`register-form__input ${showNameError ? 'register-form__input--error' : ''}`}
          aria-invalid={showNameError ? 'true' : 'false'}
          aria-describedby={showNameError ? 'register-name-error' : undefined}
          autoComplete="name"
          autoFocus
          disabled={isSubmitting}
        />
        {showNameError && (
          <div 
            id="register-name-error" 
            role="alert"
            className="register-form__error"
            aria-live="polite"
          >
            {errors.name}
          </div>
        )}
      </div>
      
      {/* Email field */}
      <div className="register-form__field">
        <label htmlFor="register-email" className="register-form__label">
          Email
        </label>
        <input
          ref={emailInputRef}
          id="register-email"
          type="email"
          name="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`register-form__input ${showEmailError ? 'register-form__input--error' : ''}`}
          aria-invalid={showEmailError ? 'true' : 'false'}
          aria-describedby={showEmailError ? 'register-email-error' : undefined}
          autoComplete="email"
          disabled={isSubmitting}
        />
        {showEmailError && (
          <div 
            id="register-email-error" 
            role="alert"
            className="register-form__error"
            aria-live="polite"
          >
            {errors.email}
          </div>
        )}
      </div>
      
      {/* Password field */}
      <div className="register-form__field">
        <label htmlFor="register-password" className="register-form__label">
          Password
        </label>
        <input
          ref={passwordInputRef}
          id="register-password"
          type="password"
          name="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`register-form__input ${showPasswordError ? 'register-form__input--error' : ''}`}
          aria-invalid={showPasswordError ? 'true' : 'false'}
          aria-describedby={showPasswordError ? 'register-password-error' : undefined}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {showPasswordError && (
          <div 
            id="register-password-error" 
            role="alert"
            className="register-form__error"
            aria-live="polite"
          >
            {errors.password}
          </div>
        )}
      </div>
      
      {/* Confirm Password field */}
      <div className="register-form__field">
        <label htmlFor="register-confirm-password" className="register-form__label">
          Confirm Password
        </label>
        <input
          ref={confirmPasswordInputRef}
          id="register-confirm-password"
          type="password"
          name="confirmPassword"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`register-form__input ${showConfirmPasswordError ? 'register-form__input--error' : ''}`}
          aria-invalid={showConfirmPasswordError ? 'true' : 'false'}
          aria-describedby={showConfirmPasswordError ? 'register-confirm-password-error' : undefined}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {showConfirmPasswordError && (
          <div 
            id="register-confirm-password-error" 
            role="alert"
            className="register-form__error"
            aria-live="polite"
          >
            {errors.confirmPassword}
          </div>
        )}
      </div>
      
      {/* Submit button */}
      <div className="register-form__actions">
        <button
          type="submit"
          className="register-form__submit"
          disabled={isSubmitDisabled}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="register-form__spinner" aria-hidden="true" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    </form>
  );
}

// Default export for convenience
export default RegisterForm;
