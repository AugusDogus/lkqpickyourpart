"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import type { SearchResult } from "~/lib/types";
import { VehicleCard } from "./VehicleCard";

interface SearchResultsProps {
  searchResult: SearchResult;
  isLoading: boolean;
}

export function SearchResults({ searchResult, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Loading Skeletons */}
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden py-0">
            <CardHeader className="p-0">
              <Skeleton className="aspect-video" />
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 p-4 pt-0">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {searchResult.vehicles.map((vehicle) => (
          <VehicleCard
            key={`${vehicle.location.locationCode}-${vehicle.id}`}
            vehicle={vehicle}
          />
        ))}
      </div>

      {/* Search Summary */}
      <div className="text-muted-foreground border-t pt-6 text-center text-sm">
        <p>
          Showing {searchResult.vehicles.length} of{" "}
          {searchResult.totalCount.toLocaleString()} vehicles
          {searchResult.locationsCovered > 0 && (
            <span className="ml-1">
              from {searchResult.locationsCovered} locations
            </span>
          )}
        </p>
        {searchResult.locationsWithErrors.length > 0 && (
          <p className="text-destructive mt-1 text-xs">
            {searchResult.locationsWithErrors.length} locations had errors
          </p>
        )}
      </div>
    </div>
  );
}
