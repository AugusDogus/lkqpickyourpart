import { Suspense } from "react";
import { Search } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { SearchForm } from "~/components/search/SearchForm";
import { YearFilterWrapper } from "~/components/search/YearFilterWrapper";
import { ErrorBoundary } from "~/components/ErrorBoundary";

// Import the streaming results component
import { StreamingSearchResults } from "~/components/search/StreamingSearchResults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minYear?: string; maxYear?: string }>;
}) {
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q?.trim() ?? "";
  const minYear = resolvedParams.minYear ? parseInt(resolvedParams.minYear) : 1990;
  const maxYear = resolvedParams.maxYear ? parseInt(resolvedParams.maxYear) : new Date().getFullYear();

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
          <SearchForm defaultValue={searchQuery} />
        </div>

        {/* Year Filter - Only show when we have a query */}
        {searchQuery && (
          <div className="mb-8">
            <div className="mx-auto max-w-md rounded-lg border bg-white p-4 shadow-sm">
              <YearFilterWrapper 
                searchQuery={searchQuery}
                defaultMinYear={minYear}
                defaultMaxYear={maxYear}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && (
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

        {/* Streaming Search Results */}
        {searchQuery && (
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm group overflow-hidden py-0">
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
                    ))}
                  </div>
                </div>
              }
            >
              <StreamingSearchResults
                searchQuery={searchQuery}
                yearRange={[minYear, maxYear]}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
