"use client";

import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { SearchInput } from "~/components/search/SearchInput";
import {
  SearchResults,
  SearchSummary,
} from "~/components/search/SearchResults";
import { Sidebar } from "~/components/search/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { ERROR_MESSAGES, SEARCH_CONFIG } from "~/lib/constants";
import type { SearchFilters, Vehicle } from "~/lib/types";
import { api } from "~/trpc/react";

function SearchPageContent() {
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });
  const currentYear = new Date().getFullYear();

  // Sidebar state
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState("newest");

  // Get the appropriate icon for the current sort option
  const getSortIcon = useCallback((sortOption: string) => {
    switch (sortOption) {
      case "newest":
      case "oldest":
        return Calendar;
      case "year-desc":
      case "year-asc":
        return ArrowUpDown;
      default:
        return ArrowUpDown;
    }
  }, []);

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

  // Filter state for comprehensive filtering
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    makes: [],
    colors: [],
    states: [],
    salvageYards: [],
    yearRange: [minYearParam ?? 1990, maxYearParam ?? currentYear],
  });

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
        const newRange: [number, number] = [dataMinYear, currentYear];
        setYearRange(newRange);
        setFilters((prev) => ({
          ...prev,
          yearRange: newRange,
        }));
        // Don't update URL params here - let them stay null so they don't appear in URL
      }
    }
  }, [
    dataMinYear,
    currentYear,
    searchResults?.vehicles,
    minYearParam,
    maxYearParam,
  ]);

  // Calculate filter options from search results
  const filterOptions = useMemo(() => {
    if (!searchResults?.vehicles || searchResults.vehicles.length === 0) {
      return {
        makes: [],
        colors: [],
        states: [],
        salvageYards: [],
      };
    }

    const makes = [
      ...new Set(
        searchResults.vehicles.map((vehicle: Vehicle) => vehicle.make),
      ),
    ].sort();
    const colors = [
      ...new Set(
        searchResults.vehicles.map((vehicle: Vehicle) => vehicle.color),
      ),
    ].sort();

    // Create state-to-yard mapping for smart filtering
    const stateToYards = new Map<string, string[]>();
    searchResults.vehicles.forEach((vehicle: Vehicle) => {
      const state = vehicle.location.state;
      const yard = vehicle.location.name;

      if (!stateToYards.has(state)) {
        stateToYards.set(state, []);
      }

      const yards = stateToYards.get(state)!;
      if (!yards.includes(yard)) {
        yards.push(yard);
      }
    });

    // Smart filtering based on current selections
    let states = Array.from(stateToYards.keys()).sort();
    let salvageYards: string[] = [];

    // If states are selected, only show yards in those states
    if (filters.states && filters.states.length > 0) {
      salvageYards = Array.from(
        new Set(
          filters.states.flatMap((state) => stateToYards.get(state) ?? []),
        ),
      ).sort();
    } else {
      // Show all yards
      salvageYards = Array.from(
        new Set(
          searchResults.vehicles.map(
            (vehicle: Vehicle) => vehicle.location.name,
          ),
        ),
      ).sort();
    }

    // If salvage yards are selected, only show states that have those yards
    if (filters.salvageYards && filters.salvageYards.length > 0) {
      const selectedYards = new Set(filters.salvageYards);
      const statesWithSelectedYards = new Set<string>();

      searchResults.vehicles.forEach((vehicle: Vehicle) => {
        if (selectedYards.has(vehicle.location.name)) {
          statesWithSelectedYards.add(vehicle.location.state);
        }
      });

      states = Array.from(statesWithSelectedYards).sort();
    }

    return { makes, colors, states, salvageYards };
  }, [searchResults?.vehicles, filters.states, filters.salvageYards]);

  // Filter update functions
  const updateFilter = useCallback(
    (key: string, value: number | [number, number] | string[]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));

      // Update year range specifically
      if (key === "yearRange") {
        setYearRange(value as [number, number]);
        setHasUserChangedRange(true);
      }
    },
    [],
  );

  const toggleArrayFilter = useCallback(
    (
      filterType: "makes" | "colors" | "states" | "salvageYards",
      value: string,
    ) => {
      setFilters((prev) => {
        const currentArray = prev[filterType] ?? [];

        if (currentArray.includes(value)) {
          // Removing an item - just filter it out
          return {
            ...prev,
            [filterType]: currentArray.filter((item) => item !== value),
          };
        } else {
          // Adding an item - check for compatibility
          const newFilters = { ...prev };

          if (filterType === "states") {
            // If adding a state, check if any selected salvage yards are incompatible
            const incompatibleYards = (prev.salvageYards ?? []).filter(
              (yard) => {
                // Check if this yard exists in the newly selected state
                const stateYards = Array.from(
                  new Set(
                    searchResults?.vehicles
                      ?.filter((vehicle) => vehicle.location.state === value)
                      .map((vehicle) => vehicle.location.name) ?? [],
                  ),
                );
                return !stateYards.includes(yard);
              },
            );

            // Remove incompatible salvage yards
            if (incompatibleYards.length > 0) {
              newFilters.salvageYards = (prev.salvageYards ?? []).filter(
                (yard) => !incompatibleYards.includes(yard),
              );
            }
          } else if (filterType === "salvageYards") {
            // If adding a salvage yard, check if any selected states are incompatible
            const yardStates =
              searchResults?.vehicles
                ?.filter((vehicle) => vehicle.location.name === value)
                .map((vehicle) => vehicle.location.state) ?? [];

            const incompatibleStates = (prev.states ?? []).filter(
              (state) => !yardStates.includes(state),
            );

            // Remove incompatible states
            if (incompatibleStates.length > 0) {
              newFilters.states = (prev.states ?? []).filter(
                (state) => !incompatibleStates.includes(state),
              );
            }
          }

          // Add the new item
          newFilters[filterType] = [...currentArray, value];

          return newFilters;
        }
      });
    },
    [searchResults?.vehicles],
  );

  const clearAllFilters = useCallback(() => {
    // Use data minimum if available, but always use current year as maximum
    const dataYearRange: [number, number] =
      searchResults?.vehicles && searchResults.vehicles.length > 0
        ? [dataMinYear, currentYear]
        : [1990, currentYear];

    setFilters({
      query: "",
      makes: [],
      colors: [],
      states: [],
      salvageYards: [],
      yearRange: dataYearRange,
    });
    setYearRange(dataYearRange);
    setHasUserChangedRange(false);
  }, [currentYear, searchResults?.vehicles, dataMinYear]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    const dataYearRange: [number, number] =
      searchResults?.vehicles && searchResults.vehicles.length > 0
        ? [dataMinYear, currentYear]
        : [1990, currentYear];

    return (
      (filters.makes?.length ?? 0) +
      (filters.colors?.length ?? 0) +
      (filters.states?.length ?? 0) +
      (filters.salvageYards?.length ?? 0) +
      (filters.yearRange &&
      (filters.yearRange[0] !== dataYearRange[0] ||
        filters.yearRange[1] !== dataYearRange[1])
        ? 1
        : 0)
    );
  }, [filters, currentYear, searchResults?.vehicles, dataMinYear]);

  // Comprehensive filtering logic
  const filteredVehicles = useMemo(() => {
    if (!searchResults?.vehicles) return [];

    return searchResults.vehicles.filter((vehicle: Vehicle) => {
      // Year range filter
      if (
        vehicle.year < debouncedYearRange[0] ||
        vehicle.year > debouncedYearRange[1]
      ) {
        return false;
      }

      // Make filter
      if (
        (filters.makes?.length ?? 0) > 0 &&
        !filters.makes?.includes(vehicle.make)
      ) {
        return false;
      }

      // Color filter
      if (
        (filters.colors?.length ?? 0) > 0 &&
        !filters.colors?.includes(vehicle.color)
      ) {
        return false;
      }

      // State filter
      if (
        (filters.states?.length ?? 0) > 0 &&
        !filters.states?.includes(vehicle.location.state)
      ) {
        return false;
      }

      // Salvage yard filter
      if (
        (filters.salvageYards?.length ?? 0) > 0 &&
        !filters.salvageYards?.includes(vehicle.location.name)
      ) {
        return false;
      }

      return true;
    });
  }, [searchResults?.vehicles, debouncedYearRange, filters]);

  // Sorting function
  const sortVehicles = useCallback(
    (vehicles: Vehicle[], sortOption: string) => {
      const sorted = [...vehicles];

      switch (sortOption) {
        case "newest":
          return sorted.sort(
            (a, b) =>
              new Date(b.availableDate).getTime() -
              new Date(a.availableDate).getTime(),
          );
        case "oldest":
          return sorted.sort(
            (a, b) =>
              new Date(a.availableDate).getTime() -
              new Date(b.availableDate).getTime(),
          );
        case "year-desc":
          return sorted.sort((a, b) => b.year - a.year);
        case "year-asc":
          return sorted.sort((a, b) => a.year - b.year);
        default:
          return sorted;
      }
    },
    [],
  );

  // Create filtered and sorted search result
  const filteredSearchResult = useMemo(() => {
    if (!searchResults) return null;

    const sortedVehicles = sortVehicles(filteredVehicles, sortBy);

    return {
      ...searchResults,
      vehicles: sortedVehicles,
      totalCount: sortedVehicles.length,
    };
  }, [searchResults, filteredVehicles, sortBy, sortVehicles]);

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

        <div className="relative flex w-full gap-6">
          {/* Sidebar - only render when filters are shown */}
          {showFilters && (
            <div className="sticky top-6 h-fit">
              <Sidebar
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                activeFilterCount={activeFilterCount}
                clearAllFilters={clearAllFilters}
                filters={filters}
                filterOptions={filterOptions}
                toggleArrayFilter={toggleArrayFilter}
                updateFilter={updateFilter}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="w-full flex-1">
            {/* Search Results Header */}
            {filteredSearchResult && (
              <div className="mb-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">
                      Search Results
                    </h2>
                    <p className="text-gray-600">
                      {filteredSearchResult.totalCount.toLocaleString()}{" "}
                      vehicles found
                      {filteredSearchResult.totalCount !==
                        searchResults?.totalCount && (
                        <span className="text-sm text-gray-500">
                          {" "}
                          (filtered from{" "}
                          {searchResults?.totalCount.toLocaleString()})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getSortIcon(sortBy);
                        return (
                          <IconComponent className="h-4 w-4 text-gray-500" />
                        );
                      })()}
                      <Select
                        value={sortBy}
                        onValueChange={(value) => setSortBy(value)}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="year-desc">
                            Year (High to Low)
                          </SelectItem>
                          <SelectItem value="year-asc">
                            Year (Low to High)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filter Toggle Button */}
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Stats */}
                <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
                  <span>
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
                  Enter a year, make, model, or any combination to search across
                  all LKQ Pick Your Part locations.
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
                sidebarOpen={showFilters}
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
                      : "No vehicles match your current filters. Try adjusting your filters."}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button onClick={clearAllFilters} variant="outline">
                      Clear All Filters
                    </Button>
                  )}
                </div>
              )}
          </div>
        </div>

        {filteredSearchResult && (
          <SearchSummary searchResult={filteredSearchResult} />
        )}
      </div>
    </div>
  );
}

function SearchPageFallback() {
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
        {/* Search Input Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex w-full gap-8">
          {/* Sidebar Skeleton */}
          <div className="w-80 flex-shrink-0">
            <Skeleton className="h-96 w-full" />
          </div>

          {/* Main Content Skeleton */}
          <div className="w-full flex-1">
            {/* Search Results Header Skeleton */}
            <div className="mb-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Skeleton className="mb-2 h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                Search for vehicles
              </h3>
              <p className="mx-auto max-w-md text-gray-500">
                Enter a year, make, model, or any combination to search across
                all LKQ Pick Your Part locations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SearchPageFallback />}>
        <SearchPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
