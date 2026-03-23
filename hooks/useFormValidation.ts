import { useState, useCallback, useMemo } from 'react';

export type ValidationRule<T = any> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  match?: keyof T;
  custom?: (value: any, formData?: T) => string | null;
  message?: string;
};

export type ValidationRules<T = any> = {
  [K in keyof T]?: ValidationRule<T>;
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface UseFormValidationOptions<T> {
  rules: ValidationRules<T>;
  initialValues?: Partial<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  handleSubmit: (onSubmit: (values: T, errors: Record<string, string>) => void | Promise<void>) => (e: React.FormEvent) => Promise<void>;
  reset: () => void;
  validate: () => boolean;
  setFieldError: (field: string, message: string) => void;
  clearErrors: () => void;
}

function getMessage(rule: ValidationRule, field: string): string {
  if (rule.message) return rule.message;
  
  if (rule.required) return `${field} is required`;
  if (rule.email) return `${field} must be a valid email`;
  if (rule.url) return `${field} must be a valid URL`;
  if (rule.minLength) return `${field} must be at least ${rule.minLength} characters`;
  if (rule.maxLength) return `${field} must be at most ${rule.maxLength} characters`;
  if (rule.min !== undefined) return `${field} must be at least ${rule.min}`;
  if (rule.max !== undefined) return `${field} must be at most ${rule.max}`;
  if (rule.pattern) return `${field} has an invalid format`;
  
  return `${field} is invalid`;
}

export function useFormValidation<T extends Record<string, any>>({
  rules,
  initialValues = {} as T,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (field: keyof T, value: any, allValues?: T): string | null => {
      const rule = rules[field];
      if (!rule) return null;

      if (rule.required && (value === undefined || value === null || value === '')) {
        return getMessage(rule, String(field));
      }

      if (value === undefined || value === null || value === '') {
        return null;
      }

      if (rule.minLength && String(value).length < rule.minLength) {
        return getMessage(rule, String(field));
      }

      if (rule.maxLength && String(value).length > rule.maxLength) {
        return getMessage(rule, String(field));
      }

      if (rule.min !== undefined && Number(value) < rule.min) {
        return getMessage(rule, String(field));
      }

      if (rule.max !== undefined && Number(value) > rule.max) {
        return getMessage(rule, String(field));
      }

      if (rule.pattern && !rule.pattern.test(String(value))) {
        return getMessage(rule, String(field));
      }

      if (rule.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return getMessage(rule, String(field));
        }
      }

      if (rule.url) {
        try {
          new URL(String(value));
        } catch {
          return getMessage(rule, String(field));
        }
      }

      if (rule.match) {
        const matchField = rule.match as keyof T;
        const matchValue = allValues?.[matchField];
        if (value !== matchValue) {
          return `${field} must match ${String(matchField)}`;
        }
      }

      if (rule.custom) {
        const customError = rule.custom(value, allValues);
        if (customError) return customError;
      }

      return null;
    },
    [rules]
  );

  const validate = useCallback(
    (valuesToValidate?: T): boolean => {
      const currentValues = valuesToValidate || values;
      const newErrors: Record<string, string> = {};
      let isValid = true;

      (Object.keys(rules) as Array<keyof T>).forEach((field) => {
        const error = validateField(field, currentValues[field], currentValues);
        if (error) {
          newErrors[field as string] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [rules, validateField, values]
  );

  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange && touched[field as string]) {
        const error = validateField(field, value);
        setErrors((prev) => {
          if (error) return { ...prev, [field as string]: error };
          const { [field as string]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validateOnChange, touched, validateField]
  );

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
      setValue(name as keyof T, processedValue);
    },
    [setValue]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<any>) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (validateOnBlur) {
        const error = validateField(name as keyof T, value);
        setErrors((prev) => {
          if (error) return { ...prev, [name]: error };
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validateOnBlur, validateField]
  );

  const handleSubmit = useCallback(
    (onSubmit: (values: T, errors: Record<string, string>) => void | Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const allTouched = Object.keys(rules).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setTouched(allTouched);

        const isValid = validate();

        try {
          await onSubmit(values, errors);
        } finally {
          setIsSubmitting(false);
        }
      },
    [rules, validate, values, errors]
  );

  const reset = useCallback(() => {
    setValuesState(initialValues as T);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validate,
    setFieldError,
    clearErrors,
  };
}

export const validators = {
  required: (message?: string) => ({
    required: true,
    message: message || 'This field is required',
  }),

  email: (message?: string) => ({
    email: true,
    message: message || 'Please enter a valid email address',
  }),

  minLength: (min: number, message?: string) => ({
    minLength: min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string) => ({
    maxLength: max,
    message: message || `Must be at most ${max} characters`,
  }),

  pattern: (regex: RegExp, message?: string) => ({
    pattern: regex,
    message: message || 'Invalid format',
  }),

  min: (min: number, message?: string) => ({
    min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string) => ({
    max,
    message: message || `Must be at most ${max}`,
  }),

  url: (message?: string) => ({
    url: true,
    message: message || 'Please enter a valid URL',
  }),

  match: (field: string, message?: string) => ({
    match: field as any,
    message: message || `Must match ${field}`,
  }),

  custom: (fn: (value: any, formData?: any) => string | null, message?: string) => ({
    custom: fn,
    message: message || 'Invalid value',
  }),
};

export default useFormValidation;
