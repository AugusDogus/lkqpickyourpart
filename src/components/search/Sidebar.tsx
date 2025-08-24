import { ChevronDown, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import type { SearchFilters } from "~/lib/types";

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
          <Card className="sticky top-4">
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

            <CardContent className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto">
              {/* Make Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-gray-50">
                  <span className="font-medium">Make</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {filterOptions.makes.map((make) => (
                    <div key={make} className="flex items-center space-x-2">
                      <Checkbox
                        id={`make-${make}`}
                        checked={filters.makes?.includes(make)}
                        onCheckedChange={() => toggleArrayFilter("makes", make)}
                      />
                      <Label htmlFor={`make-${make}`} className="text-sm">
                        {make}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Year Range Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-gray-50">
                  <span className="font-medium">Year Range</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-4">
                  <div className="px-2">
                    <div className="mb-2 flex justify-between text-sm text-gray-600">
                      <span>{filters.yearRange?.[0]}</span>
                      <span>{filters.yearRange?.[1]}</span>
                    </div>
                    <Slider
                      value={filters.yearRange}
                      onValueChange={(value) =>
                        updateFilter("yearRange", value as [number, number])
                      }
                      min={2000}
                      max={2024}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Color Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-gray-50">
                  <span className="font-medium">Color</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {filterOptions.colors.map((color) => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={`color-${color}`}
                        checked={filters.colors?.includes(color)}
                        onCheckedChange={() =>
                          toggleArrayFilter("colors", color)
                        }
                      />
                      <Label htmlFor={`color-${color}`} className="text-sm">
                        {color}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Location Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-gray-50">
                  <span className="font-medium">State</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {filterOptions.states.map((state) => (
                    <div key={state} className="flex items-center space-x-2">
                      <Checkbox
                        id={`state-${state}`}
                        checked={filters.states?.includes(state)}
                        onCheckedChange={() =>
                          toggleArrayFilter("states", state)
                        }
                      />
                      <Label htmlFor={`state-${state}`} className="text-sm">
                        {state}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Salvage Yard Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded p-2 hover:bg-gray-50">
                  <span className="font-medium">Salvage Yard</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {filterOptions.salvageYards.map((yard) => (
                    <div key={yard} className="flex items-center space-x-2">
                      <Checkbox
                        id={`yard-${yard}`}
                        checked={filters.salvageYards?.includes(yard)}
                        onCheckedChange={() =>
                          toggleArrayFilter("salvageYards", yard)
                        }
                      />
                      <Label htmlFor={`yard-${yard}`} className="text-sm">
                        {yard}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
