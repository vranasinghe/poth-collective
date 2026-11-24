import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "./api";

/** Account-scoped, focus-refreshed requests. Old requests cannot overwrite a newer account or query. */
export function useResource<T>(key: string, load: () => Promise<T>) {
  const { user } = useAuth();
  const scope = `${user?._id ?? "guest"}:${key}`;
  const loader = useRef(load);
  loader.current = load;
  const generation = useRef(0);
  const [state, setState] = useState<{
    scope: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ scope, loading: true });
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setState((s) => ({
      scope,
      data: s.scope === scope ? s.data : undefined,
      loading: true,
    }));
    try {
      const data = await loader.current();
      if (request === generation.current)
        setState({ scope, data, loading: false });
    } catch (e) {
      if (request === generation.current)
        setState({ scope, error: errorMessage(e), loading: false });
    }
  }, [scope]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        generation.current++;
      };
    }, [refresh]),
  );
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  return {
    data: state.scope === scope ? state.data : undefined,
    error: state.scope === scope ? state.error : undefined,
    loading: state.scope !== scope || state.loading,
    refresh,
  };
}
