import { Suspense } from "react";
import Image from "next/image";
import { api } from "~/trpc/server";
import { Skeleton } from "~/components/ui/skeleton";

// Individual location search component that streams independently
async function LocationResults({ 
  locationId, 
  _locationName, 
  searchQuery,
  yearRange 
}: { 
  locationId: string;
  _locationName: string;
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
    return null;
  }

  return (
    <>
      {filteredVehicles.map((vehicle) => (
        <div key={vehicle.id} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm group overflow-hidden py-0 transition-shadow hover:shadow-lg">
          <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 p-0">
            <div className="bg-muted relative aspect-video overflow-hidden">
              <Image
                src={vehicle.images[0]?.url ?? '/placeholder-car.jpg'}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&]:hover:bg-secondary/90 absolute top-3 left-3 bg-black/50 text-white hover:bg-black/70">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                {vehicle.images.length > 1 ? vehicle.images.length - 1 : 0} more
              </span>
              <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 absolute top-3 right-3">
                Stock #{vehicle.stockNumber}
              </span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="mb-3">
              <h3 className="text-foreground text-lg font-semibold">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-muted-foreground text-sm">
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
            
            <div className="text-muted-foreground mt-3 flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin mr-1.5 h-4 w-4" aria-hidden="true">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{vehicle.location.city}, {vehicle.location.stateAbbr}</span>
            </div>
          </div>
          
          <div className="items-center [.border-t]:pt-6 flex flex-col gap-2 p-4 pt-0">
            <div className="flex w-full gap-2">
              <a
                href={vehicle.detailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3 flex-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye mr-1.5 h-4 w-4" aria-hidden="true">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                View Details
              </a>
              <a
                href={vehicle.partsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 has-[>svg]:px-3 flex-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings mr-1.5 h-4 w-4" aria-hidden="true">
                  <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Find Parts
              </a>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Loading skeleton that matches the original vehicle card design
function LocationSkeleton() {
  return (
    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm group overflow-hidden py-0">
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
  );
}

// Main streaming search results component
export async function StreamingSearchResults({ 
  searchQuery, 
  yearRange 
}: { 
  searchQuery: string;
  yearRange: [number, number];
}) {
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
            fallback={<LocationSkeleton />}
          >
            <LocationResults
              locationId={location.id}
              _locationName={location.name}
              searchQuery={searchQuery}
              yearRange={yearRange}
            />
          </Suspense>
        ))}
      </div>

      {/* Search completed indicator */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        Results streaming from {locations.length} locations
      </div>
    </div>
  );
}