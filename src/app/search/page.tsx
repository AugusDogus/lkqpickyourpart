import { Suspense } from "react";
import { api } from "~/trpc/server";
import { SearchResults } from "~/components/search/SearchResults";
import { StreamingSearchForm } from "~/components/search/StreamingSearchForm";
import { Skeleton } from "~/components/ui/skeleton";
import { Search } from "lucide-react";
import type { Vehicle, SearchResult } from "~/lib/types";

// Server component that fetches and combines all search results
async function StreamingSearchResults({ 
  searchQuery,
  searchParams 
}: { 
  searchQuery: string;
  searchParams: { minYear?: string; maxYear?: string };
}) {
  const startTime = Date.now();
  
  // Get all locations (fast)
  const locations = await api.vehicles.getLocations();
  
  // Create promises for each location without awaiting them
  const locationPromises = locations.map(async (location) => {
    try {
      const vehicles = await api.vehicles.getByLocation({
        locationId: location.id,
        searchQuery
      });
      return vehicles;
    } catch (error) {
      console.error(`Error fetching from ${location.name}:`, error);
      return [];
    }
  });
  
  // Wait for all location searches to complete
  const allLocationResults = await Promise.allSettled(locationPromises);
  
  // Combine all successful results into a flat array
  const allVehicles: Vehicle[] = allLocationResults
    .filter((result): result is PromiseFulfilledResult<Vehicle[]> => 
      result.status === 'fulfilled'
    )
    .flatMap(result => result.value);
  
  // Apply year filtering if specified
  const minYear = searchParams.minYear ? parseInt(searchParams.minYear) : undefined;
  const maxYear = searchParams.maxYear ? parseInt(searchParams.maxYear) : undefined;
  
  const filteredVehicles = allVehicles.filter(vehicle => {
    if (minYear && vehicle.year < minYear) return false;
    if (maxYear && vehicle.year > maxYear) return false;
    return true;
  });
  
  // Calculate metrics
  const searchTime = Date.now() - startTime;
  const successfulLocations = allLocationResults.filter(r => r.status === 'fulfilled').length;
  const failedLocations = locations.length - successfulLocations;
  
  const searchResult: SearchResult = {
    vehicles: filteredVehicles,
    totalCount: filteredVehicles.length,
    page: 1,
    hasMore: false,
    searchTime,
    locationsCovered: successfulLocations,
    locationsWithErrors: failedLocations > 0 ? [`${failedLocations} locations failed`] : [],
  };

  // Calculate year range from results
  const years = allVehicles.map(v => v.year);
  const dataMinYear = years.length > 0 ? Math.min(...years) : 1990;
  const dataMaxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  
  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-medium text-gray-900">
          {searchResult.totalCount.toLocaleString()} vehicles found
          {searchResult.totalCount !== allVehicles.length && (
            <span className="text-sm font-normal text-gray-500">
              {" "}
              (filtered from {allVehicles.length.toLocaleString()})
            </span>
          )}
        </h2>
        <span className="text-sm text-gray-500">
          Searched {searchResult.locationsCovered} locations in {searchResult.searchTime}ms
        </span>
      </div>

      {/* Search Results */}
      <SearchResults searchResult={searchResult} isLoading={false} />
    </div>
  );
}

// Loading fallback for the streaming results
function SearchResultsFallback() {
  return (
    <div className="space-y-6">
      {/* Results Header Skeleton */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Results Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
            <Skeleton className="mb-4 h-48 w-full" />
            <Skeleton className="mb-2 h-6 w-3/4" />
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minYear?: string; maxYear?: string }>;
}) {
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q?.trim() ?? "";

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
                Search across all locations with streaming results
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Input */}
        <div className="mb-6">
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <p className="text-sm text-blue-800">
                <strong>Streaming Search:</strong> Results load as each location finishes, then combine into one list!
              </p>
            </div>
          </div>
          <StreamingSearchForm
            defaultValue={searchQuery}
            placeholder="Enter year, make, model (e.g., '2018 Honda Civic' or 'Toyota')"
          />
        </div>

        {/* Search Results or Empty State */}
        {searchQuery ? (
          <Suspense fallback={<SearchResultsFallback />}>
            <StreamingSearchResults 
              searchQuery={searchQuery} 
              searchParams={resolvedParams}
            />
          </Suspense>
        ) : (
          /* Empty State */
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Search for vehicles
            </h3>
            <p className="mx-auto max-w-md text-gray-500">
              Enter a year, make, model, or any combination to search across all
              LKQ Pick Your Part locations with streaming results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
