"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Options<T> = {
  intervalMs?: number | false;
  initialData?: T;
  enabled?: boolean;
  onError?: (e: unknown) => void;
};

export function useAutoFetch<T = unknown>(
  url: string,
  { intervalMs = false, initialData, enabled = true, onError }: Options<T> = {}
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: "include", signal: controller.signal });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const json = (await res.json()) as T;
      setData(json);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      setError(e);
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }, [url, enabled, onError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!intervalMs || !enabled) return;
    const id = setInterval(() => load(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled, load]);

  const refetch = useMemo(() => load, [load]);

  return { data, error, loading, refetch } as const;
}
