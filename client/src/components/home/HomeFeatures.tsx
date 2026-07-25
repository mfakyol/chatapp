import {
  IconActivity,
  IconBolt,
  IconChecks,
  IconPaperclip,
  IconShieldLock,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { Translator } from '@/i18n/translate';

const featureIcons = [
  IconBolt,
  IconActivity,
  IconChecks,
  IconPaperclip,
  IconUsersGroup,
  IconShieldLock,
];

export function HomeFeatures({ t }: { t: Translator }) {
  const features = featureIcons.map((icon, i) => ({
    icon,
    title: t(`home.features.${i}.title`),
    desc: t(`home.features.${i}.desc`),
  }));

  return (
    <section className="border-t border-(--border) px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">{t('home.featuresTitle')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-(--text-muted) sm:text-base">
          {t('home.featuresSubtitle')}
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-(--border) bg-(--bg-chat) p-6 transition hover:border-(--border)"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--brand)/15 text-(--brand)">
                <f.icon className="h-6 w-6" stroke={2} />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-(--text-muted)">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
