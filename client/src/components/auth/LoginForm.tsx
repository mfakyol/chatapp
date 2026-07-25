'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { createLoginSchema, type LoginFormValues, zodResolver } from '@/validations';
import { useAuthStore } from '@/stores/auth.store';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const { t, locale, messages } = useT();
  const loginSchema = useMemo(() => createLoginSchema(messages), [locale, messages]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: useMemo(() => zodResolver(loginSchema), [loginSchema]),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ identifier, password }) => {
    const res = await login(identifier, password);
    if (!res.success) {
      setError('identifier', { message: res.error });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input
        {...register('identifier')}
        placeholder={t('login.identifier')}
        autoComplete="username"
        error={errors.identifier?.message}
      />
      <Input
        {...register('password')}
        placeholder={t('login.password')}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
      />
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full py-3">
        {isSubmitting ? t('login.submitting') : t('login.submit')}
      </Button>
    </form>
  );
}
