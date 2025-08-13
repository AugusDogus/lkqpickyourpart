"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { SearchInputProps } from "~/lib/types";

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Enter year, make, model...",
  enableStreaming = false,
}: SearchInputProps & { enableStreaming?: boolean }) {
  const router = useRouter();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Update URL immediately, no debounce
      onChange(newValue);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (enableStreaming && value.trim()) {
          // Navigate to streaming results page
          router.push(`/results?q=${encodeURIComponent(value.trim())}`);
        } else {
          onSearch();
        }
      }
    },
    [onSearch, enableStreaming, value, router],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        if (enableStreaming) {
          // Navigate to streaming results page
          router.push(`/results?q=${encodeURIComponent(value.trim())}`);
        } else {
          onSearch();
        }
      }
    },
    [onSearch, value, enableStreaming, router],
  );

  const resultsPath = enableStreaming ? "/results" : "/search";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative w-full text-sm">
        <label className="sr-only" htmlFor="search">
          Search for vehicles
        </label>
        <input
          id="search"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background flex h-10 w-full min-w-0 rounded-md border px-3 py-1 pl-10 text-base shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>

      {/* Search Suggestions */}
      <div className="text-muted-foreground mt-2 text-xs">
        <span>Try: </span>
        <Link
          href={`${resultsPath}?q=Honda+Civic`}
          className="text-primary mr-3 underline hover:no-underline"
        >
          Honda Civic
        </Link>
        <Link
          href={`${resultsPath}?q=2020+Toyota`}
          className="text-primary mr-3 underline hover:no-underline"
        >
          2020 Toyota
        </Link>
        <Link
          href={`${resultsPath}?q=Ford+F-150`}
          className="text-primary underline hover:no-underline"
        >
          Ford F-150
        </Link>
      </div>
    </form>
  );
}
