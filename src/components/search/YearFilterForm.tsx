"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

export function YearFilterForm({
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
    router.push(newUrl);
  }, [debouncedYearRange, router, searchParams, searchQuery, currentYear]);

  const handleYearChange = useCallback((newRange: [number, number]) => {
    setYearRange(newRange);
  }, []);

  const handleMinYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseInt(e.target.value);
    if (!isNaN(newMin)) {
      setYearRange([newMin, yearRange[1]]);
    }
  }, [yearRange]);

  const handleMaxYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value);
    if (!isNaN(newMax)) {
      setYearRange([yearRange[0], newMax]);
    }
  }, [yearRange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          Year Range
        </label>
        <span className="text-sm text-gray-500">
          {yearRange[0]} - {yearRange[1]}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="minYear" className="block text-xs font-medium text-gray-700 mb-1">
            Min Year
          </label>
          <input
            id="minYear"
            type="number"
            min="1990"
            max={currentYear}
            value={yearRange[0]}
            onChange={handleMinYearChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="maxYear" className="block text-xs font-medium text-gray-700 mb-1">
            Max Year
          </label>
          <input
            id="maxYear"
            type="number"
            min="1990"
            max={currentYear}
            value={yearRange[1]}
            onChange={handleMaxYearChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Range slider for better UX */}
      <div className="space-y-2">
        <input
          type="range"
          min="1990"
          max={currentYear}
          value={yearRange[0]}
          onChange={(e) => handleYearChange([parseInt(e.target.value), yearRange[1]])}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <input
          type="range"
          min="1990"
          max={currentYear}
          value={yearRange[1]}
          onChange={(e) => handleYearChange([yearRange[0], parseInt(e.target.value)])}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}