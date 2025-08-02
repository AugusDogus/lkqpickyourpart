"use client";

import { AlertCircle, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { SearchInput } from "~/components/search/SearchInput";
import { SearchResults } from "~/components/search/SearchResults";
import { YearFilter } from "~/components/search/YearFilter";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ERROR_MESSAGES, SEARCH_CONFIG } from "~/lib/constants";
import type { Vehicle } from "~/lib/types";
import { api } from "~/trpc/react";

function SearchPageContent() {
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });
  const currentYear = new Date().getFullYear();

  // URL state for year range (using null as default to indicate no custom range set)
  const [minYearParam, setMinYearParam] = useQueryState("minYear", {
    parse: (value) => parseInt(value) || null,
    serialize: (value) => value?.toString() ?? "",
  });
  const [maxYearParam, setMaxYearParam] = useQueryState("maxYear", {
    parse: (value) => parseInt(value) || null,
    serialize: (value) => value?.toString() ?? "",
  });

  // Local state for year range (for real-time updates) - use fallback defaults initially
  const [yearRange, setYearRange] = useState<[number, number]>([
    minYearParam ?? 1990,
    maxYearParam ?? currentYear,
  ]);

  // Track if user has manually changed the year range
  const [hasUserChangedRange, setHasUserChangedRange] = useState(
    // Check if URL already has custom year parameters
    minYearParam !== null || maxYearParam !== null,
  );

  // Debounce the query for search API calls
  const [debouncedQuery] = useDebounce(query, SEARCH_CONFIG.DEBOUNCE_DELAY);

  // Debounce the year range for filtering performance (but not slider visual state)
  const [debouncedYearRange] = useDebounce(yearRange, 100);

  // Debounce year range for URL updates (stops updating URL while dragging)
  const [debouncedYearRangeForURL] = useDebounce(yearRange, 300);

  // Perform search with debounced query
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = api.vehicles.search.useQuery(
    {
      query: debouncedQuery,
    },
    {
      enabled: debouncedQuery.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  // Calculate min/max years from search results after API call
  const { minYear: dataMinYear, maxYear: dataMaxYear } = useMemo(() => {
    if (!searchResults?.vehicles || searchResults.vehicles.length === 0) {
      return { minYear: 1990, maxYear: currentYear }; // Fallback only when no data
    }

    const years = searchResults.vehicles.map(
      (vehicle: Vehicle) => vehicle.year,
    );
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years),
    };
  }, [searchResults?.vehicles, currentYear]);

  const handleSearch = () => {
    void refetchSearch();
  };

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      void setQuery(newQuery);
    },
    [setQuery],
  );

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
    setHasUserChangedRange(true);
  }, []);

  // Sync local state when URL parameters change (e.g., browser back/forward)
  useMemo(() => {
    setYearRange([minYearParam ?? dataMinYear, maxYearParam ?? dataMaxYear]);
  }, [minYearParam, maxYearParam, dataMinYear, dataMaxYear]);

  // Update URL parameters with debounced year range (only if user has manually changed it)
  useMemo(() => {
    if (hasUserChangedRange) {
      const [min, max] = debouncedYearRangeForURL;

      // If the values match the data defaults, clear the URL parameters
      if (min === dataMinYear && max === dataMaxYear) {
        void setMinYearParam(null);
        void setMaxYearParam(null);
        // Don't reset hasUserChangedRange - keep it true so future changes still update URL
      } else {
        void setMinYearParam(min);
        void setMaxYearParam(max);
      }
    }
  }, [
    debouncedYearRangeForURL,
    hasUserChangedRange,
    dataMinYear,
    dataMaxYear,
    setMinYearParam,
    setMaxYearParam,
  ]);

  // Update year range when search results change (but only if URL params are null - no custom range)
  useMemo(() => {
    if (searchResults?.vehicles && searchResults.vehicles.length > 0) {
      // Only auto-update if user hasn't set custom range in URL
      const hasNoCustomRange = minYearParam === null && maxYearParam === null;
      if (hasNoCustomRange) {
        setYearRange([dataMinYear, dataMaxYear]);
        // Don't update URL params here - let them stay null so they don't appear in URL
      }
    }
  }, [
    dataMinYear,
    dataMaxYear,
    searchResults?.vehicles,
    minYearParam,
    maxYearParam,
  ]);

  // Filter vehicles based on debounced year range for performance
  const filteredVehicles = useMemo(() => {
    if (!searchResults?.vehicles) return [];

    return searchResults.vehicles.filter((vehicle: Vehicle) => {
      return (
        vehicle.year >= debouncedYearRange[0] &&
        vehicle.year <= debouncedYearRange[1]
      );
    });
  }, [searchResults?.vehicles, debouncedYearRange]);

  // Create filtered search result
  const filteredSearchResult = useMemo(() => {
    if (!searchResults) return null;

    return {
      ...searchResults,
      vehicles: filteredVehicles,
      totalCount: filteredVehicles.length,
    };
  }, [searchResults, filteredVehicles]);

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

        {/* Year Filter */}
        {(searchLoading ||
          (searchResults && searchResults.vehicles.length > 0)) && (
          <div className="mb-8">
            <div className="mx-auto max-w-md rounded-lg border bg-white p-4 shadow-sm">
              <YearFilter
                yearRange={yearRange}
                onYearChange={handleYearChange}
                minYear={dataMinYear}
                maxYear={dataMaxYear}
                isLoading={searchLoading}
              />
            </div>
          </div>
        )}

        {/* Search Results Header */}
        {filteredSearchResult && (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">
                {filteredSearchResult.totalCount.toLocaleString()} vehicles
                found
                {filteredSearchResult.totalCount !==
                  searchResults?.totalCount && (
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    (filtered from {searchResults?.totalCount.toLocaleString()})
                  </span>
                )}
              </h2>
              <span className="text-sm text-gray-500">
                Searched {searchResults?.locationsCovered} locations in{" "}
                {searchResults?.searchTime}ms
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {searchError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Search Error</AlertTitle>
            <AlertDescription>
              {searchError.message || ERROR_MESSAGES.SEARCH_FAILED}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!debouncedQuery && !searchLoading && (
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

        {/* Search Results */}
        {(filteredSearchResult ?? searchLoading) && (
          <SearchResults
            searchResult={
              filteredSearchResult ?? {
                vehicles: [],
                totalCount: 0,
                page: 1,
                hasMore: false,
                searchTime: 0,
                locationsCovered: 0,
                locationsWithErrors: [],
              }
            }
            isLoading={searchLoading}
          />
        )}

        {/* No Results */}
        {debouncedQuery &&
          filteredSearchResult?.totalCount === 0 &&
          !searchLoading && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                <AlertCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No vehicles found
              </h3>
              <p className="mx-auto mb-6 max-w-md text-gray-500">
                {searchResults?.totalCount === 0
                  ? "No vehicles match your search. Try different search terms."
                  : "No vehicles match your search in the selected year range. Try adjusting the year filter."}
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ErrorBoundary>
      <SearchPageContent />
    </ErrorBoundary>
  );
}
