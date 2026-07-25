'use client';

import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createNewGroupSchema, type NewGroupFormValues, zodResolver } from '@/validations';
import { Conversation, PublicUser } from '@/types';
import { createGroupConversation } from '@/services/conversation.service';
import { fullName } from '@/lib/utils';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormHint } from '@/components/ui/FormHint';


export function NewGroupForm({
  friends,
  onCreated,
}: {
  friends: PublicUser[];
  onCreated: (conversation: Conversation) => void;
}) {
  const { t, locale, messages } = useT();
  const schema = useMemo(() => createNewGroupSchema(messages), [locale, messages]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewGroupFormValues>({
    resolver: useMemo(() => zodResolver(schema), [schema]),
    defaultValues: { name: '', members: [] },
  });

  const onSubmit = handleSubmit(async ({ name, members }) => {
    const res = await createGroupConversation(name, members);
    if (!res.success) {
      setError('name', { message: res.error });
      return;
    }
    onCreated(res.data.conversation);
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 flex flex-col gap-3">
      <Input
        {...register('name')}
        variant="compact"
        placeholder={t('sidebar.groupNamePlaceholder')}
        error={errors.name?.message}
      />
      <FormHint>{t('sidebar.groupHint')}</FormHint>
      <Controller
        name="members"
        control={control}
        render={({ field }) => (
          <>
            {friends.map((f) => (
              <Checkbox
                key={f.username}
                id={`group-member-${f.username}`}
                checked={field.value.includes(f.username)}
                onChange={() => {
                  field.onChange(
                    field.value.includes(f.username)
                      ? field.value.filter((username) => username !== f.username)
                      : [...field.value, f.username]
                  );
                }}
                label={
                  <>
                    {fullName(f)} <span className="text-(--text-muted)">@{f.username}</span>
                  </>
                }
              />
            ))}
          </>
        )}
      />
      <Button type="submit" variant="primarySm" loading={isSubmitting} className="mt-2 w-full py-2">
        {t('sidebar.createGroup')}
      </Button>
    </form>
  );
}
