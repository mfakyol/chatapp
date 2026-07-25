import { IconArrowRight, IconMessages } from "@tabler/icons-react";
import type { Translator } from "@/i18n/translate";
import type { PublicUser } from "@/types";
import { LinkButton } from "@/components/ui/LinkButton";

export function HomeCta({
  t,
  user,
}: {
  t: Translator;
  user: PublicUser | null;
}) {
  const primaryHref = user ? "/chat" : "/register";
  const primaryLabel = user ? t("home.openChat") : t("home.getStarted");

  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="home-cta-card mx-auto max-w-3xl rounded-3xl border border-(--border) bg-(--bg-chat) px-6 py-14 text-center text-(--text-normal)">
        <IconMessages
          className="mx-auto h-10 w-10 text-(--brand)"
          stroke={1.75}
        />
        <h2 className="mt-4 text-2xl font-semibold text-(--text-normal) sm:text-3xl">
          {t("home.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-(--text-muted) sm:text-base">
          {t("home.ctaSubtitle")}
        </p>
        <LinkButton
          href={primaryHref}
          variant="primaryLg"
          className="mt-8 inline-flex"
        >
          {primaryLabel}
          <IconArrowRight className="h-4 w-4" stroke={2.5} />
        </LinkButton>
      </div>
    </section>
  );
}
