import { useEffect, useRef, useState } from 'react';
import { fetchSearchSuggestions } from '../api/fetchSuggestions';
import { SuggestionLruCache } from '../api/suggestionCache';
import { SEARCH_DEBOUNCE_MS, SEARCH_SUGGESTION_CACHE_LIMIT } from '../constants/searchConstants';

type UseSearchSuggestionsOptions = {
  debounceMs?: number;
  cacheSize?: number;
  focused: boolean;
  query: string;
};

export function useSearchSuggestions({
  cacheSize = SEARCH_SUGGESTION_CACHE_LIMIT,
  debounceMs = SEARCH_DEBOUNCE_MS,
  focused,
  query,
}: UseSearchSuggestionsOptions) {
  const cacheRef = useRef<SuggestionLruCache | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsQuery, setSuggestionsQuery] = useState('');
  const [resolvedQuery, setResolvedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ variant: 'offline' | 'error'; message: string; subMessage?: string } | null>(null);

  if (!cacheRef.current) {
    cacheRef.current = new SuggestionLruCache(cacheSize);
  }

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    abortRef.current?.abort();
    setErrorState(null);

    if (!focused || normalizedQuery.length < 2) {
      setSuggestions([]);
      setSuggestionsQuery('');
      setResolvedQuery('');
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const cachedSuggestions = cacheRef.current?.get(normalizedQuery);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setSuggestionsQuery(normalizedQuery);
      setResolvedQuery(normalizedQuery);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setResolvedQuery('');

    const debounceId = setTimeout(() => {
      fetchSearchSuggestions(normalizedQuery, controller.signal)
        .then((results) => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;

          cacheRef.current?.set(normalizedQuery, results);
          setSuggestions(results);
          setSuggestionsQuery(normalizedQuery);
          setResolvedQuery(normalizedQuery);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setSuggestionsQuery(normalizedQuery);
          setResolvedQuery(normalizedQuery);
          
          const rawMessage = error instanceof Error ? error.message : String(error);
          console.error('[SearchSuggestions] Fetch failed:', rawMessage);
          
          if (rawMessage.includes('UnknownHostException') || rawMessage.includes('Network') || rawMessage.includes('ConnectException') || rawMessage.includes('Failed to fetch')) {
            setErrorState({
              variant: 'offline',
              message: "You're offline",
              subMessage: 'Check your internet connection',
            });
          } else {
            setErrorState({
              variant: 'error',
              message: 'Something went wrong',
            });
          }
        })
        .finally(() => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(debounceId);
      controller.abort();
    };
  }, [debounceMs, focused, normalizedQuery]);

  const visibleSuggestions =
    normalizedQuery &&
    suggestions.length > 0 &&
    (suggestionsQuery === normalizedQuery || normalizedQuery.startsWith(suggestionsQuery))
      ? suggestions
      : [];

  return {
    errorState,
    hasNoSuggestions:
      normalizedQuery.length > 1 &&
      resolvedQuery === normalizedQuery &&
      !errorState &&
      !isLoading &&
      visibleSuggestions.length === 0,
    isLoading,
    suggestions: visibleSuggestions,
  };
}
