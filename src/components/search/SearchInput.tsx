"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SearchInputProps } from "~/lib/types";

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Enter year, make, model...",
  isLoading = false,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Keep localValue in sync when external value changes (e.g., URL updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce local input forwarding to parent
  const debouncedNotify = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (next: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onChange(next);
      }, 150);
    };
  }, [onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      debouncedNotify(newValue);
    },
    [debouncedNotify],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch();
      }
    },
    [onSearch],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (localValue.trim()) {
        onSearch();
      }
    },
    [onSearch, localValue],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full text-sm">
        <label className="sr-only" htmlFor="search">
          Search for vehicles
        </label>
        <input
          id="search"
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background flex h-10 w-full min-w-0 rounded-md border px-3 py-1 pl-10 pr-9 text-base shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50 select-none" />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin opacity-60" />)
        }
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
