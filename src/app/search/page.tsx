"use client";

import { AlertCircle, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useDebounce } from "use-debounce";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import { SearchInput } from "~/components/search/SearchInput";
import { SearchResults } from "~/components/search/SearchResults";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ERROR_MESSAGES, SEARCH_CONFIG } from "~/lib/constants";
import { api } from "~/trpc/react";

function SearchPageContent() {
  const [query, setQuery] = useQueryState("q", { defaultValue: "" });

  // Debounce the query for search API calls
  const [debouncedQuery] = useDebounce(query, SEARCH_CONFIG.DEBOUNCE_DELAY);

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

  const handleSearch = () => {
    void refetchSearch();
  };

  const handleQueryChange = (newQuery: string) => {
    void setQuery(newQuery);
  };

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
        <div className="mb-8">
          <SearchInput
            value={query}
            onChange={handleQueryChange}
            onSearch={handleSearch}
            placeholder="Enter year, make, model (e.g., '2018 Honda Civic' or 'Toyota')"
            isLoading={searchLoading}
          />
        </div>

        {/* Search Results Header */}
        {searchResults && (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-medium text-gray-900">
                {searchResults.totalCount.toLocaleString()} vehicles found
              </h2>
              <span className="text-sm text-gray-500">
                Searched {searchResults.locationsCovered} locations in{" "}
                {searchResults.searchTime}ms
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
        {(searchResults ?? searchLoading) && (
          <SearchResults
            searchResult={
              searchResults ?? {
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
          searchResults?.totalCount === 0 &&
          !searchLoading && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                <AlertCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No vehicles found
              </h3>
              <p className="mx-auto mb-6 max-w-md text-gray-500">
                No vehicles match your search. Try different search terms.
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
