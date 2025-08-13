"use client";

import { AlertCircle, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { SearchInput } from "~/components/search/SearchInput";
import { SearchResults } from "~/components/search/SearchResults";
import { YearFilter } from "~/components/search/YearFilter";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { ERROR_MESSAGES, SEARCH_CONFIG } from "~/lib/constants";
import { filterVehiclesByYear } from "~/lib/utils";
import { api } from "~/trpc/react";

function SearchPageContent() {
  // URL state for search query
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });
  
  // Local state for year filter
  const currentYear = new Date().getFullYear();
  const [yearRange, setYearRange] = useState<[number, number]>([1990, currentYear]);

  // Debounced query for API calls
  const [debouncedQuery] = useDebounce(query, SEARCH_CONFIG.DEBOUNCE_DELAY);

  // Search results from tRPC
  const { data: searchResults, isLoading: searchLoading } = api.vehicles.search.useQuery(
    { query: debouncedQuery },
    { 
      enabled: debouncedQuery.trim().length >= SEARCH_CONFIG.MIN_QUERY_LENGTH,
      staleTime: 30000, // Cache results for 30 seconds
    }
  );

  // Filter vehicles by year range
  const filteredVehicles = useMemo(() => {
    if (!searchResults?.vehicles) return [];
    return filterVehiclesByYear(searchResults.vehicles, yearRange);
  }, [searchResults?.vehicles, yearRange]);

  // Prepare search result data
  const searchResult = useMemo(() => {
    if (!searchResults) {
      return {
        vehicles: [],
        totalCount: 0,
        page: 1,
        hasMore: false,
        locationsCovered: 0,
        searchTime: 0,
        locationsWithErrors: [],
      };
    }

    return {
      vehicles: filteredVehicles,
      totalCount: filteredVehicles.length,
      page: 1,
      hasMore: false,
      locationsCovered: searchResults.locationsCovered,
      searchTime: searchResults.searchTime,
      locationsWithErrors: searchResults.locationsWithErrors,
    };
  }, [filteredVehicles, searchResults]);

  // Show empty state when no query
  const showEmptyState = !query.trim();
  
  // Show error state for very short queries
  const showErrorState = query.trim().length > 0 && query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH;

  // Handlers
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      void setQuery(newQuery);
    },
    [setQuery],
  );

  const handleSearch = useCallback(() => {
    // Search is handled automatically by the debounced query
  }, []);

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                LKQ Global Search
              </h1>
              <span className="text-sm text-gray-500">
                Search across all locations
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Input */}
        <div className="mb-6">
          <SearchInput
            value={query}
            onChange={handleQueryChange}
            onSearch={handleSearch}
            placeholder="Enter year, make, model (e.g., '2018 Honda Civic' or 'Toyota')"
            isLoading={searchLoading}
          />
        </div>

        {/* Year Filter - Only show when we have results */}
        {!showEmptyState && !showErrorState && searchResults && (
          <div className="mb-8">
            <div className="mx-auto max-w-md rounded-lg border bg-white p-4 shadow-sm">
              <YearFilter
                yearRange={yearRange}
                onYearChange={handleYearChange}
                minYear={1990}
                maxYear={currentYear}
                isLoading={searchLoading}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmptyState && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Search for vehicles
            </h3>
            <p className="mx-auto max-w-md text-gray-500">
              Enter a year, make, model, or any combination to search across all
              LKQ Pick Your Part locations.
            </p>
          </div>
        )}

        {/* Error State */}
        {showErrorState && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Query too short</AlertTitle>
            <AlertDescription>
              {ERROR_MESSAGES.QUERY_TOO_SHORT.replace(
                "{minLength}",
                SEARCH_CONFIG.MIN_QUERY_LENGTH.toString(),
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {!showEmptyState && !showErrorState && (
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm group overflow-hidden py-0">
                        <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 p-0">
                          <div className="bg-muted relative aspect-video overflow-hidden">
                            <Skeleton className="w-full h-full" />
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="mb-3">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                        <div className="p-4 pt-0">
                          <div className="flex gap-2">
                            <Skeleton className="h-9 flex-1" />
                            <Skeleton className="h-9 flex-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
            >
              <SearchResults
                searchResult={searchResult}
                isLoading={searchLoading}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span>Loading search...</span>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
