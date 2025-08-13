import { api } from "~/trpc/server";
import { ClientSearchWrapper } from "~/components/search/ClientSearchWrapper";
import { SEARCH_CONFIG } from "~/lib/constants";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minYear?: string; maxYear?: string }>;
}) {
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q?.trim() ?? "";
  const currentYear = new Date().getFullYear();
  
  // Simple year range - no expensive calculations
  const minYear = resolvedParams.minYear ? parseInt(resolvedParams.minYear) : 1990;
  const maxYear = resolvedParams.maxYear ? parseInt(resolvedParams.maxYear) : currentYear;
  const yearRange: [number, number] = [minYear, maxYear];

  // Show error state for very short queries
  const showErrorState = searchQuery.length > 0 && searchQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH;

  // Get search results server-side if we have a valid query
  let searchResults = null;
  if (searchQuery && !showErrorState) {
    // Use the streaming backend procedures for true RSC streaming
    try {
      // First get all locations
      const locations = await api.vehicles.getLocations();
      
      // Then fetch from each location in parallel
      const locationResults = await Promise.all(
        locations.map(location => 
          api.vehicles.getByLocation({ 
            locationId: location.id, 
            searchQuery 
          }).catch(() => []) // Handle errors gracefully
        )
      );

      // Combine all results from all locations
      const allVehicles = locationResults.flat();
      
      // Filter by year range
      const filteredVehicles = allVehicles.filter(vehicle => 
        vehicle.year >= yearRange[0] && vehicle.year <= yearRange[1]
      );

      searchResults = {
        vehicles: filteredVehicles,
        totalCount: filteredVehicles.length,
        page: 1,
        hasMore: false,
        locationsCovered: locations.length,
        searchTime: 0,
        locationsWithErrors: [],
      };
    } catch (error) {
      console.error('Search error:', error);
      searchResults = {
        vehicles: [],
        totalCount: 0,
        page: 1,
        hasMore: false,
        locationsCovered: 0,
        searchTime: 0,
        locationsWithErrors: [],
      };
    }
  }

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
        {/* Use existing SearchInput component with client wrapper for URL state */}
        <ClientSearchWrapper 
          defaultQuery={searchQuery}
          defaultYearRange={yearRange}
          currentYear={currentYear}
          searchResults={searchResults}
          showEmptyState={!searchQuery}
          showErrorState={showErrorState}
        />
      </div>
    </div>
  );
}
