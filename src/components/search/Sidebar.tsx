import { X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { SearchFilters } from "~/lib/types";
import { SidebarContent } from "./SidebarContent";

interface FilterOptions {
  makes: string[];
  colors: string[];
  states: string[];
  salvageYards: string[];
}

interface SidebarProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFilterCount: number;
  clearAllFilters: () => void;
  filters: SearchFilters;
  filterOptions: FilterOptions;
  toggleArrayFilter: (
    key: "makes" | "colors" | "states" | "salvageYards",
    value: string,
  ) => void;
  updateFilter: (
    key: string,
    value: number | [number, number] | string[],
  ) => void;
}

export function Sidebar({
  showFilters,
  setShowFilters,
  activeFilterCount,
  clearAllFilters,
  filters,
  filterOptions,
  toggleArrayFilter,
  updateFilter,
}: SidebarProps) {
  return (
    <div>
      {showFilters && (
        <div className="w-80 flex-shrink-0">
          <Card className="max-h-[calc(100vh-3rem)] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Filters</CardTitle>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-2 w-full bg-transparent"
                >
                  Clear All Filters
                </Button>
              )}
            </CardHeader>

            <CardContent
              className="ml-2 max-h-[calc(100vh-200px)]"
              style={{
                overflowY: "auto",
                scrollbarGutter: "stable",
                scrollbarWidth: "thin",
                scrollbarColor: "rgb(203 213 225) transparent",
              }}
            >
              <SidebarContent
                filters={filters}
                filterOptions={filterOptions}
                toggleArrayFilter={toggleArrayFilter}
                updateFilter={updateFilter}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
