import { Suspense } from "react";
import Image from "next/image";
import { api } from "~/trpc/server";
import { StreamingSearchForm } from "~/components/search/StreamingSearchForm";
import { Skeleton } from "~/components/ui/skeleton";
import { Search } from "lucide-react";

// Individual location search component that streams independently
async function LocationResults({ 
  locationId, 
  locationName, 
  searchQuery 
}: { 
  locationId: string;
  locationName: string;
  searchQuery: string;
}) {
  // This will resolve independently for each location
  const vehicles = await api.vehicles.getByLocation({
    locationId,
    searchQuery
  });

  if (vehicles.length === 0) {
    return null; // Don't render anything if no results
  }

  return (
    <>
      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="rounded-lg border bg-white p-4 shadow-sm group overflow-hidden transition-shadow hover:shadow-lg">
          {/* Vehicle Card Content */}
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted mb-4">
            <Image
              src={vehicle.images[0]?.url ?? '/placeholder-car.jpg'}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="object-cover w-full h-full"
              loading="lazy"
              fill
            />
            <span className="absolute top-3 left-3 bg-black/50 text-white px-2 py-1 text-xs rounded">
              📍 {locationName}
            </span>
            <span className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
              Stock #{vehicle.stockNumber}
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-muted-foreground">
                Color: {vehicle.color}
              </p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">VIN:</span>
                <span className="font-mono text-xs">{vehicle.vin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-xs">{vehicle.yardLocation.section}-{vehicle.yardLocation.row}-{vehicle.yardLocation.space}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span className="text-xs">{vehicle.availableDate}</span>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <a
                href={vehicle.detailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-primary text-primary-foreground text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Details
              </a>
              <a
                href={vehicle.partsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border bg-background text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                Find Parts
              </a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Loading skeleton for individual location
function LocationSkeleton({ locationName }: { locationName: string }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        🔍 Searching {locationName}...
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
          <Skeleton className="mb-4 h-48 w-full" />
          <Skeleton className="mb-2 h-6 w-3/4" />
          <Skeleton className="mb-2 h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Streaming search results that shows results as each location finishes
async function StreamingSearchResults({ searchQuery }: { searchQuery: string }) {
  // Get all locations (fast) - this happens immediately
  const locations = await api.vehicles.getLocations();
  
  return (
    <div className="space-y-6">
      {/* Search Info */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Search Results for &quot;{searchQuery}&quot;
        </h2>
        <div className="text-sm text-gray-500">
          Searching {locations.length} locations...
        </div>
      </div>

      {/* Results that stream in as each location finishes */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Suspense 
            key={location.id}
            fallback={<LocationSkeleton locationName={location.name} />}
          >
            <LocationResults
              locationId={location.id}
              locationName={location.name}
              searchQuery={searchQuery}
            />
          </Suspense>
        ))}
      </div>

      {/* Search completed indicator */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        🏁 Results streaming from {locations.length} locations
      </div>
    </div>
  );
}

// Main search page
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
                LKQ Streaming Search
              </h1>
              <span className="text-sm text-gray-500">
                ⚡ Results stream in real-time
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
                <strong>True Streaming:</strong> Results appear instantly as each location finishes searching!
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
          <Suspense fallback={
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LocationSkeleton key={i} locationName={`Location ${i + 1}`} />
                ))}
              </div>
            </div>
          }>
            <StreamingSearchResults searchQuery={searchQuery} />
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
              Enter a search term and watch results stream in real-time as each location finishes searching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
