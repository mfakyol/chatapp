"use client";

import { useEffect } from "react";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--bg-chat) p-6">
      <p className="text-lg font-semibold text-(--text-normal)">
        {t("common.errorTitle")}
      </p>
      <Button variant="primarySm" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
