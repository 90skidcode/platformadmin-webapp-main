import { useEffect, useMemo, useRef, useState } from "react";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { FieldOption, OptionsSource } from "../types";

function extractArrayFromResponse(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body)) return body;

  const record = body as Record<string, unknown>;
  const data = record.data ?? record;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    if (Array.isArray(dataRecord.items)) return dataRecord.items;
    if (Array.isArray(dataRecord.products)) return dataRecord.products;
    if (Array.isArray(dataRecord.users)) return dataRecord.users;
    if (Array.isArray(dataRecord.results)) return dataRecord.results;
    const firstArray = Object.values(dataRecord).find(Array.isArray);
    if (firstArray) return firstArray as unknown[];
  }
  return [];
}

/** In-memory cache for remote options across component lifecycle and re-renders */
const REMOTE_OPTIONS_CACHE = new Map<string, FieldOption[]>();

/** Resolves a `select` field's `optionsSource` -- static is synchronous;
 * remote fetches through the BFF proxy (plan §6), same as any other
 * `endpoint.url`, so the same environment/tenant scoping applies.
 * Supports cascading dependencies via `parentValue` with caching and request deduplication. */
export function useRemoteOptions(
  source: OptionsSource | undefined,
  apiFetcher: ApiFetcher,
  parentValue?: unknown,
) {
  const fetcherRef = useRef(apiFetcher);
  useEffect(() => {
    fetcherRef.current = apiFetcher;
  }, [apiFetcher]);

  // 1. Instant static resolution via useMemo (zero async delay for static schemas)
  const staticOptions = useMemo<FieldOption[] | null>(() => {
    if (!source || source.type !== "static") return null;

    if (source.optionsByParent) {
      return parentValue
        ? (source.optionsByParent[String(parentValue)] ?? [])
        : [];
    }

    if (parentValue !== undefined && parentValue !== "") {
      const parentStr = String(parentValue);
      return (source.options ?? []).filter((opt) => {
        if (!opt.parentValue) return true;
        if (Array.isArray(opt.parentValue)) {
          return opt.parentValue.includes(parentStr);
        }
        return String(opt.parentValue) === parentStr;
      });
    }

    // If options are tagged with parentValue but parent is not selected yet, return empty list
    const hasParentTaggedOptions = (source.options ?? []).some(
      (opt) => opt.parentValue !== undefined,
    );
    if (hasParentTaggedOptions) {
      return [];
    }

    return source.options ?? [];
  }, [source, parentValue]);

  // 2. Derive target URL for remote options
  const resolvedUrl = useMemo(() => {
    if (!source || source.type !== "remote") return null;

    const isDependent = !!source.dependsOn || source.url.includes("{");
    if (isDependent && !parentValue) {
      return null;
    }

    let url = source.url;
    if (typeof parentValue === "object" && parentValue !== null) {
      url = url.replace(/\{(\w+)\}/g, (match, key) => {
        const val = (parentValue as Record<string, unknown>)[key];
        return val !== undefined && val !== ""
          ? encodeURIComponent(String(val))
          : match;
      });
    } else if (parentValue !== undefined && parentValue !== "") {
      const parentStr = encodeURIComponent(String(parentValue));
      if (url.includes("{")) {
        url = url.replace(/\{(\w+)\}/g, () => parentStr);
      } else if (source.dependsOn) {
        const sep = url.includes("?") ? "&" : "?";
        url += `${sep}${encodeURIComponent(source.dependsOn)}=${parentStr}`;
      }
    }

    if (/\{(\w+)\}/.test(url)) {
      return null;
    }

    return url;
  }, [source, parentValue]);

  const valueKey =
    source?.type === "remote" ? (source.valueKey ?? "value") : "value";
  const labelKey =
    source?.type === "remote" ? (source.labelKey ?? "label") : "label";
  const cacheKey = resolvedUrl
    ? `${resolvedUrl}::${valueKey}::${labelKey}`
    : null;
  const cachedOptions = cacheKey
    ? REMOTE_OPTIONS_CACHE.get(cacheKey)
    : undefined;

  // 3. Remote options state
  const [remoteState, setRemoteState] = useState<{
    url: string | null;
    options: FieldOption[];
  }>({
    url: null,
    options: [],
  });

  useEffect(() => {
    if (!resolvedUrl || !cacheKey || cachedOptions) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    fetcherRef
      .current(resolvedUrl, { signal: abortController.signal })
      .then((res) => res.json())
      .then((body: unknown) => {
        if (!isMounted) return;
        const items = extractArrayFromResponse(body);
        const mappedOptions: FieldOption[] = items.map((item) => {
          const record = item as Record<string, unknown>;
          return {
            value: String(record[valueKey] ?? ""),
            label: String(record[labelKey] ?? record[valueKey] ?? ""),
          };
        });

        REMOTE_OPTIONS_CACHE.set(cacheKey, mappedOptions);
        setRemoteState({
          url: resolvedUrl,
          options: mappedOptions,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (isMounted) {
          setRemoteState({
            url: resolvedUrl,
            options: [],
          });
        }
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [resolvedUrl, cacheKey, cachedOptions, valueKey, labelKey]);

  if (staticOptions !== null) {
    return {
      options: staticOptions,
      loading: false,
    };
  }

  if (source?.type !== "remote" || !resolvedUrl) {
    return {
      options: [],
      loading: false,
    };
  }

  const isCurrentUrlLoaded = remoteState.url === resolvedUrl;
  const currentOptions =
    cachedOptions ?? (isCurrentUrlLoaded ? remoteState.options : []);
  const isLoading = !cachedOptions && !isCurrentUrlLoaded;

  return {
    options: currentOptions,
    loading: isLoading,
  };
}
