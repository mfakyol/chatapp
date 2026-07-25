'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { createRegisterSchema, type RegisterFormValues, zodResolver } from '@/validations';
import { useAuthStore } from '@/stores/auth.store';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function RegisterForm() {
  const registerUser = useAuthStore((s) => s.register);
  const { t, locale, messages } = useT();
  const registerSchema = useMemo(() => createRegisterSchema(messages), [locale, messages]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: useMemo(() => zodResolver(registerSchema), [registerSchema]),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const res = await registerUser(data);
    if (!res.success) {
      setError('password', { message: res.error });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex gap-3">
        <Input
          {...register('firstName')}
          className="w-1/2"
          placeholder={t('register.firstName')}
          autoComplete="given-name"
          error={errors.firstName?.message}
        />
        <Input
          {...register('lastName')}
          className="w-1/2"
          placeholder={t('register.lastName')}
          autoComplete="family-name"
          error={errors.lastName?.message}
        />
      </div>
      <Input
        {...register('username')}
        placeholder={t('register.username')}
        autoComplete="username"
        error={errors.username?.message}
      />
      <Input
        {...register('email')}
        placeholder={t('register.email')}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        placeholder={t('register.password')}
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
      />
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full py-3">
        {isSubmitting ? t('register.submitting') : t('register.submit')}
      </Button>
    </form>
  );
}
