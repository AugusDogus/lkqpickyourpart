"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { YearFilter } from "./YearFilter";

export function YearFilterWrapper({
  searchQuery,
  defaultMinYear = 1990,
  defaultMaxYear = new Date().getFullYear(),
}: {
  searchQuery: string;
  defaultMinYear?: number;
  defaultMaxYear?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  
  const [yearRange, setYearRange] = useState<[number, number]>([
    defaultMinYear,
    defaultMaxYear,
  ]);

  // Debounce the year range for URL updates (stops updating URL while dragging)
  const [debouncedYearRange] = useDebounce(yearRange, 300);

  // Update URL when debounced year range changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    // Keep the search query
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    
    // Update year filters
    const [min, max] = debouncedYearRange;
    if (min !== 1990) {
      params.set('minYear', min.toString());
    } else {
      params.delete('minYear');
    }
    
    if (max !== currentYear) {
      params.set('maxYear', max.toString());
    } else {
      params.delete('maxYear');
    }
    
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Only push if the URL would actually change
    const currentParams = new URLSearchParams(window.location.search);
    const currentMin = currentParams.get('minYear') ?? '1990';
    const currentMax = currentParams.get('maxYear') ?? currentYear.toString();
    const newMin = min === 1990 ? '1990' : min.toString();
    const newMax = max === currentYear ? currentYear.toString() : max.toString();
    
    if (currentMin !== newMin || currentMax !== newMax) {
      router.push(newUrl);
    }
  }, [debouncedYearRange, router, searchParams, searchQuery, currentYear]);

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
  }, []);

  return (
    <YearFilter
      yearRange={yearRange}
      onYearChange={handleYearChange}
      minYear={1990}
      maxYear={currentYear}
      isLoading={false}
    />
  );
}