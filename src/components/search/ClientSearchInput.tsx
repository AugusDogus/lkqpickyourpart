"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { SEARCH_CONFIG } from "~/lib/constants";

interface ClientSearchInputProps {
  defaultValue?: string;
}

export function ClientSearchInput({ defaultValue = "" }: ClientSearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  
  // Debounce the query for URL updates (provides search-on-type behavior)
  const [debouncedQuery] = useDebounce(query, SEARCH_CONFIG.DEBOUNCE_DELAY);

  // Update URL when debounced query changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (debouncedQuery.trim()) {
      params.set('q', debouncedQuery.trim());
    } else {
      params.delete('q');
    }
    
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Only push if the URL would actually change
    const currentParams = new URLSearchParams(window.location.search);
    const currentQ = currentParams.get('q') ?? '';
    const newQ = debouncedQuery.trim();
    
    if (currentQ !== newQ) {
      router.push(newUrl);
    }
  }, [debouncedQuery, router, searchParams]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Trigger immediate search by updating URL
        const params = new URLSearchParams(searchParams);
        if (query.trim()) {
          params.set('q', query.trim());
        } else {
          params.delete('q');
        }
        router.push(`/search?${params.toString()}`);
      }
    },
    [query, router, searchParams],
  );

  return (
    <form className="w-full" onSubmit={(e) => e.preventDefault()}>
      <div className="relative w-full text-sm">
        <label className="sr-only" htmlFor="search">
          Search for vehicles
        </label>
        <input
          id="search"
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter year, make, model (e.g., '2018 Honda Civic' or 'Toyota')"
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background flex h-10 w-full min-w-0 rounded-md border px-3 py-1 pl-10 text-base shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50 select-none" aria-hidden="true" />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        <span>💡 Results will stream in as you type! Try: </span>
        <a className="text-primary mr-3 underline hover:no-underline" href="/search?q=Honda+Civic">
          Honda Civic
        </a>
        <a className="text-primary mr-3 underline hover:no-underline" href="/search?q=2020+Toyota">
          2020 Toyota
        </a>
        <a className="text-primary underline hover:no-underline" href="/search?q=Ford+F-150">
          Ford F-150
        </a>
      </div>
    </form>
  );
}