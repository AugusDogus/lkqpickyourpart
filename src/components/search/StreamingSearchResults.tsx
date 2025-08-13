import { Suspense } from "react";
import Image from "next/image";
import { api } from "~/trpc/server";

// Individual location search component that streams independently
async function LocationResults({ 
  locationId, 
  locationName, 
  searchQuery,
  yearRange 
}: { 
  locationId: string;
  locationName: string;
  searchQuery: string;
  yearRange: [number, number];
}) {
  // This will resolve independently for each location
  const vehicles = await api.vehicles.getByLocation({
    locationId,
    searchQuery
  });

  if (vehicles.length === 0) {
    return null; // Don't render anything if no results
  }

  // Apply year filtering
  const filteredVehicles = vehicles.filter(vehicle => {
    return vehicle.year >= yearRange[0] && vehicle.year <= yearRange[1];
  });

  if (filteredVehicles.length === 0) {
    return null; // Don't render if all filtered out
  }

  return (
    <>
      {filteredVehicles.map((vehicle) => (
        <div key={vehicle.id} className="rounded-lg border bg-white p-4 shadow-sm group overflow-hidden transition-shadow hover:shadow-lg">
          {/* Vehicle Card Content */}
          <div className="relative aspect-video overflow-hidden rounded-lg mb-4">
            <Image
              src={vehicle.images[0]?.url ?? "/placeholder-car.jpg"}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              📷 {vehicle.images.length} photos
            </div>
            <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
              #{vehicle.stockNumber}
            </div>
          </div>

          <div className="space-y-3">
            {/* Vehicle Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-600">Color: {vehicle.color}</p>
            </div>

            {/* Details */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">VIN:</span>
                <span className="font-mono text-xs">{vehicle.vin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="text-xs">{vehicle.location.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Available:</span>
                <span className="text-xs">{vehicle.availableDate}</span>
              </div>
            </div>

            {/* Location badge */}
            <div className="flex items-center text-sm text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span>📍 {locationName}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <a
                href={vehicle.detailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                🔍 View Details
              </a>
              <a
                href={vehicle.partsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-center py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                🔧 Find Parts
              </a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Loading skeleton for individual locations
function LocationSkeleton({ locationName }: { locationName: string }) {
  return (
    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
      <div className="animate-pulse">
        <div className="inline-block w-6 h-6 bg-blue-500 rounded-full animate-spin mb-2" />
        <p className="text-sm text-gray-600">🔍 Searching {locationName}...</p>
      </div>
    </div>
  );
}

export async function StreamingSearchResults({
  searchQuery,
  yearRange,
}: {
  searchQuery: string;
  yearRange: [number, number];
}) {
  // Get all locations first (this is fast)
  const locations = await api.vehicles.getLocations();

  // Create streaming components for each location
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          🚀 Search Results for &quot;{searchQuery}&quot;
        </h2>
        <p className="text-sm text-gray-500 mb-2">
          Searching {locations.length} locations in parallel...
        </p>
        <div className="text-xs text-gray-400">
          💡 Results appear as each location finishes - no waiting for the slowest one!
        </div>
      </div>

      {/* Streaming Results Grid */}
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
              yearRange={yearRange}
            />
          </Suspense>
        ))}
      </div>
    </div>
  );
}