"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useThemeStore } from "@/stores/theme.store";
import { useHydrated } from "@/hooks/useHydrated";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useT();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const hydrated = useHydrated();

  const isDark = !hydrated || theme === "dark";
  const label = isDark ? t("common.themeLight") : t("common.themeDark");

  return (
    <Button
      type="button"
      variant="icon"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={className}
    >
      {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </Button>
  );
}
