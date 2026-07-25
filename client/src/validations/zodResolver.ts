import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { FieldError, FieldValues, Resolver } from 'react-hook-form';
import { appendErrors } from 'react-hook-form';
import type { z } from 'zod';

type ZodIssueLike = {
  code?: string;
  message: string;
  path: PropertyKey[];
};

type ZodSchema<T extends FieldValues> = {
  parseAsync: (value: unknown) => Promise<T>;
};

function isZodError(error: unknown): error is z.ZodError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as z.ZodError).issues)
  );
}

function parseIssues(issues: ZodIssueLike[], validateAllFieldCriteria: boolean) {
  const errors: Record<string, FieldError> = {};
  const queue = [...issues];

  for (; queue.length; ) {
    const issue = queue[0];
    const path = issue.path.map(String).join('.');

    if (!errors[path]) {
      errors[path] = { message: issue.message, type: issue.code ?? 'custom' };
    }

    if (validateAllFieldCriteria && issue.code) {
      const types = errors[path].types;
      const messages = types && types[issue.code];
      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        issue.code,
        messages ? ([] as string[]).concat(messages as string[], issue.message) : issue.message
      ) as FieldError;
    }

    queue.shift();
  }

  return errors;
}


export function zodResolver<T extends FieldValues>(schema: ZodSchema<T>): Resolver<T> {
  return async (values, _, options) => {
    try {
      const data = await schema.parseAsync(values);
      if (options.shouldUseNativeValidation) validateFieldsNatively({}, options);
      return { values: data, errors: {} };
    } catch (error) {
      if (!isZodError(error)) throw error;
      return {
        values: {} as Record<string, never>,
        errors: toNestErrors(
          parseIssues(error.issues, !options.shouldUseNativeValidation && options.criteriaMode === 'all'),
          options
        ),
      };
    }
  };
}
