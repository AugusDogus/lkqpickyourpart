"use client";

import { AlertCircle, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useMemo, useState } from "react";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { SearchInput } from "~/components/search/SearchInput";
import { SearchResults } from "~/components/search/SearchResults";
import { YearFilter } from "~/components/search/YearFilter";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { ERROR_MESSAGES, SEARCH_CONFIG } from "~/lib/constants";
import { filterVehiclesByYear } from "~/lib/utils";
import type { SearchResult } from "~/lib/types";

interface ClientSearchWrapperProps {
  defaultQuery: string;
  defaultYearRange: [number, number];
  currentYear: number;
  searchResults: SearchResult | null;
  showEmptyState: boolean;
  showErrorState: boolean;
}

export function ClientSearchWrapper({
  defaultQuery,
  defaultYearRange,
  currentYear,
  searchResults,
  showEmptyState,
  showErrorState,
}: ClientSearchWrapperProps) {
  // URL state for search query - this provides search-on-type behavior
  const [query, setQuery] = useQueryState("q", { defaultValue: defaultQuery });

  // Local state for year filter
  const [yearRange, setYearRange] = useState<[number, number]>(defaultYearRange);

  // Apply year filtering to server-provided results
  const filteredVehicles = useMemo(() => {
    if (!searchResults?.vehicles) return [];
    return filterVehiclesByYear(searchResults.vehicles, yearRange);
  }, [searchResults?.vehicles, yearRange]);

  // Prepare final search result data for SearchResults component
  const finalSearchResult = useMemo(() => {
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
      ...searchResults,
      vehicles: filteredVehicles,
      totalCount: filteredVehicles.length,
    };
  }, [searchResults, filteredVehicles]);

  // Handlers for existing components
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      void setQuery(newQuery);
    },
    [setQuery],
  );

  const handleSearch = useCallback(() => {
    // Search is handled automatically by URL state changes
  }, []);

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
  }, []);

  return (
    <>
      {/* Use existing SearchInput component */}
      <div className="mb-6">
        <SearchInput
          value={query}
          onChange={handleQueryChange}
          onSearch={handleSearch}
          placeholder="Enter year, make, model (e.g., '2018 Honda Civic' or 'Toyota')"
          isLoading={false}
        />
      </div>

      {/* Use existing YearFilter component - Only show when we have results */}
      {!showEmptyState && !showErrorState && searchResults && (
        <div className="mb-8">
          <div className="mx-auto max-w-md rounded-lg border bg-white p-4 shadow-sm">
            <YearFilter
              yearRange={yearRange}
              onYearChange={handleYearChange}
              minYear={1990}
              maxYear={currentYear}
              isLoading={false}
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

      {/* Use existing SearchResults component */}
      {!showEmptyState && !showErrorState && (
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            }
          >
            <SearchResults
              searchResult={finalSearchResult}
              isLoading={false}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}