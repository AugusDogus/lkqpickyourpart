"use client";

import { Filter } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import type { SearchFilters } from "~/lib/types";
import { SidebarContent } from "./SidebarContent";

interface FilterOptions {
  makes: string[];
  colors: string[];
  states: string[];
  salvageYards: string[];
}

interface MobileFiltersDrawerProps {
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

export function MobileFiltersDrawer({
  activeFilterCount,
  clearAllFilters,
  filters,
  filterOptions,
  toggleArrayFilter,
  updateFilter,
}: MobileFiltersDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-transparent"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">Filters</DrawerTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
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
        </DrawerHeader>
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto px-4 pb-4">
          <SidebarContent
            filters={filters}
            filterOptions={filterOptions}
            toggleArrayFilter={toggleArrayFilter}
            updateFilter={updateFilter}
          />
        </div>
        <div className="border-t bg-background p-4">
          <DrawerClose asChild>
            <Button className="w-full">Apply Filters</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}