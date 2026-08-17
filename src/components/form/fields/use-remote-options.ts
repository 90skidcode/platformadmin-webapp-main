import { useEffect, useState } from "react";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { FieldOption, OptionsSource } from "../types";

/** Resolves a `select` field's `optionsSource` -- static is synchronous;
 * remote fetches through the BFF proxy (plan §6), same as any other
 * `endpoint.url`, so the same environment/tenant scoping applies. */
export function useRemoteOptions(
  source: OptionsSource | undefined,
  apiFetcher: ApiFetcher,
) {
  const [options, setOptions] = useState<FieldOption[]>(
    source?.type === "static" ? source.options : [],
  );
  const [loading, setLoading] = useState(source?.type === "remote");

  useEffect(() => {
    if (!source || source.type !== "remote") return;
    let cancelled = false;
    setLoading(true);

    apiFetcher(source.url)
      .then((res) => res.json())
      .then((data: unknown[]) => {
        if (cancelled) return;
        const valueKey = source.valueKey ?? "value";
        const labelKey = source.labelKey ?? "label";
        setOptions(
          data.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              value: String(record[valueKey]),
              label: String(record[labelKey] ?? record[valueKey]),
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `source`/`apiFetcher` identity churn is intentionally ignored; schemas are static JSON, not per-render values.
  }, [source?.type === "remote" ? source.url : null]);

  return { options, loading };
}
