"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useIsMobile } from "~/hooks/use-media-query";
import type { SearchResult } from "~/lib/types";
import { VehicleCard } from "./VehicleCard";

interface SearchSummaryProps {
  searchResult: SearchResult;
}

export function SearchSummary({ searchResult }: SearchSummaryProps) {
  return (
    <div className="text-muted-foreground mt-6 border-t pt-6 text-center text-sm">
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
  );
}

interface SearchResultsProps {
  searchResult: SearchResult;
  isLoading: boolean;
  sidebarOpen?: boolean;
}

export function SearchResults({
  searchResult,
  isLoading,
  sidebarOpen = false,
}: SearchResultsProps) {
  const isMobile = useIsMobile();
  const amountOfSkeletons = isMobile ? 1 : 6;

  if (isLoading) {
    return (
      <div
        className={`grid w-full gap-6 ${
          sidebarOpen
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {/* Loading Skeletons */}
        {Array.from({ length: amountOfSkeletons }).map((_, index) => (
          <Card key={index} className="overflow-hidden py-0">
            <CardHeader className="p-0">
              <Skeleton className="aspect-video rounded-t-md rounded-b-none" />
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
    <div
      className={`grid w-full gap-6 ${
        sidebarOpen
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {searchResult.vehicles.map((vehicle) => (
        <VehicleCard
          key={`${vehicle.location.locationCode}-${vehicle.id}`}
          vehicle={vehicle}
        />
      ))}
    </div>
  );
}
