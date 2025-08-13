"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { SEARCH_CONFIG } from "~/lib/constants";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
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
    
    // Preserve year filters if they exist
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Only push if the URL would actually change
    const currentParams = new URLSearchParams(window.location.search);
    const currentQ = currentParams.get('q') ?? '';
    const newQ = debouncedQuery.trim();
    
    if (currentQ !== newQ) {
      router.push(newUrl);
    }
  }, [debouncedQuery, router, searchParams]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Trigger immediate search by updating URL
      const params = new URLSearchParams(searchParams);
      if (query.trim()) {
        params.set('q', query.trim());
      } else {
        params.delete('q');
      }
      const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
      router.push(newUrl);
    }
  }, [query, router, searchParams]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Trigger immediate search by updating URL
    const params = new URLSearchParams(searchParams);
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl);
  }, [query, router, searchParams]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>

      {/* Search Suggestions */}
      <div className="text-muted-foreground mt-2 text-xs">
        <span>Try: </span>
        <Link
          href="/search?q=Honda+Civic"
          className="text-primary mr-3 underline hover:no-underline"
        >
          Honda Civic
        </Link>
        <Link
          href="/search?q=2020+Toyota"
          className="text-primary mr-3 underline hover:no-underline"
        >
          2020 Toyota
        </Link>
        <Link
          href="/search?q=Ford+F-150"
          className="text-primary underline hover:no-underline"
        >
          Ford F-150
        </Link>
      </div>
    </form>
  );
}