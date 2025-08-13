"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { YearFilter } from "./YearFilter";

export function YearFilterWrapper({
  searchQuery,
  defaultMinYear = 1990,
  defaultMaxYear = new Date().getFullYear(),
  dataMinYear = 1990,
  dataMaxYear = new Date().getFullYear(),
}: {
  searchQuery: string;
  defaultMinYear?: number;
  defaultMaxYear?: number;
  dataMinYear?: number;
  dataMaxYear?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
    if (min !== dataMinYear) {
      params.set('minYear', min.toString());
    } else {
      params.delete('minYear');
    }
    
    if (max !== dataMaxYear) {
      params.set('maxYear', max.toString());
    } else {
      params.delete('maxYear');
    }
    
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Only push if the URL would actually change
    const currentParams = new URLSearchParams(window.location.search);
    const currentMin = currentParams.get('minYear') ?? dataMinYear.toString();
    const currentMax = currentParams.get('maxYear') ?? dataMaxYear.toString();
    const newMin = min === dataMinYear ? dataMinYear.toString() : min.toString();
    const newMax = max === dataMaxYear ? dataMaxYear.toString() : max.toString();
    
    if (currentMin !== newMin || currentMax !== newMax) {
      router.push(newUrl);
    }
  }, [debouncedYearRange, router, searchParams, searchQuery, dataMinYear, dataMaxYear]);

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
  }, []);

  return (
    <YearFilter
      yearRange={yearRange}
      onYearChange={handleYearChange}
      minYear={dataMinYear}
      maxYear={dataMaxYear}
      isLoading={false}
    />
  );
}