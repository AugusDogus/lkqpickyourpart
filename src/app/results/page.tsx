import { Suspense } from "react";
import Image from "next/image";
import { api } from "~/trpc/server";
import type { Vehicle } from "~/lib/types";

// Server component that awaits a specific location's data
async function LocationResult({ 
  name, 
  dataPromise 
}: { 
  name: string;
  dataPromise: Promise<Vehicle[]>;
}) {
  const results = await dataPromise;
  
  return (
    <li className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          {results.length} vehicles
        </span>
      </div>
      
      {results.length === 0 ? (
        <p className="text-gray-500">No vehicles found at this location</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="mb-2">
                <h4 className="font-medium text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h4>
                <p className="text-sm text-gray-600">{vehicle.color}</p>
              </div>
              
              {vehicle.images.length > 0 && (
                <div className="mb-3">
                  <Image
                    src={vehicle.images[0]?.thumbnailUrl ?? ''}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    width={200}
                    height={96}
                    className="h-24 w-full rounded object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-1 text-xs text-gray-500">
                <p>VIN: {vehicle.vin}</p>
                <p>Stock: {vehicle.stockNumber}</p>
                <p>
                  Location: Section {vehicle.yardLocation.section}, 
                  Row {vehicle.yardLocation.row}, 
                  Space {vehicle.yardLocation.space}
                </p>
                <p>Available: {new Date(vehicle.availableDate).toLocaleDateString()}</p>
              </div>
              
              <div className="mt-3 flex space-x-2">
                <a
                  href={vehicle.detailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Details
                </a>
                <a
                  href={vehicle.partsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                >
                  Parts
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

// Loading fallback component for each location
function LocationFallback({ name }: { name: string }) {
  return (
    <li className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
              <div className="mt-2 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

// Main RSC page component
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams.q ?? "";
  
  if (!searchQuery) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <h1 className="text-xl font-bold text-gray-900">
                LKQ Search Results
              </h1>
            </div>
          </div>
        </header>
        
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-900">No search query provided</h2>
            <p className="text-gray-600">Please provide a search query to see results.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all locations first (this is fast)
  const locations = await api.vehicles.getLocations();
  
  // Create promises for each location's data without awaiting them
  const locationTasks = locations.map(location => ({
    name: location.name,
    promise: api.vehicles.getByLocation({ 
      locationId: location.id, 
      searchQuery 
    }),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                LKQ Search Results
              </h1>
              <p className="text-sm text-gray-600">
                Search query: &quot;{searchQuery}&quot;
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Searching {locations.length} locations
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">
            Results by Location
          </h2>
          <p className="text-sm text-gray-600">
            Results will appear as each location finishes searching
          </p>
        </div>

        <ul className="space-y-0">
          {locationTasks.map(({ name, promise }) => (
            <Suspense 
              key={name} 
              fallback={<LocationFallback name={name} />}
            >
              <LocationResult 
                name={name} 
                dataPromise={promise} 
              />
            </Suspense>
          ))}
        </ul>
      </div>
    </div>
  );
}