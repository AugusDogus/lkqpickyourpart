"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";

interface YearFilterProps {
  yearRange: [number, number];
  onYearChange: (range: [number, number]) => void;
  minYear: number;
  maxYear: number;
  isLoading?: boolean;
  className?: string;
}

export function YearFilter({
  yearRange,
  onYearChange,
  minYear,
  maxYear,
  isLoading = false,
  className,
}: YearFilterProps) {
  // Local state for input values to allow typing
  const [minInputValue, setMinInputValue] = useState(yearRange[0].toString());
  const [maxInputValue, setMaxInputValue] = useState(yearRange[1].toString());

  // Update local input values when yearRange prop changes (from slider)
  useMemo(() => {
    setMinInputValue(yearRange[0].toString());
    setMaxInputValue(yearRange[1].toString());
  }, [yearRange]);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (values.length === 2) {
        onYearChange([values[0]!, values[1]!]);
      }
    },
    [onYearChange],
  );

  const handleMinYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setMinInputValue(inputValue);

      const value = parseInt(inputValue);
      if (!isNaN(value) && value >= minYear && value <= maxYear) {
        // Ensure min doesn't exceed max
        const newMin = Math.min(value, yearRange[1]);
        onYearChange([newMin, yearRange[1]]);
      }
    },
    [onYearChange, minYear, maxYear, yearRange],
  );

  const handleMaxYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setMaxInputValue(inputValue);

      const value = parseInt(inputValue);
      if (!isNaN(value) && value >= minYear && value <= maxYear) {
        // Ensure max doesn't go below min
        const newMax = Math.max(value, yearRange[0]);
        onYearChange([yearRange[0], newMax]);
      }
    },
    [onYearChange, minYear, maxYear, yearRange],
  );

  const handleMinYearBlur = useCallback(() => {
    const value = parseInt(minInputValue);
    if (isNaN(value)) {
      setMinInputValue(yearRange[0].toString());
      toast.error("Please enter a valid year");
    } else if (value < minYear) {
      setMinInputValue(minYear.toString());
      onYearChange([minYear, yearRange[1]]);
      toast.info(`Snapped to minimum year ${minYear}`);
    } else if (value > maxYear) {
      setMinInputValue(maxYear.toString());
      onYearChange([maxYear, yearRange[1]]);
      toast.info(`Snapped to maximum year ${maxYear}`);
    } else if (value > yearRange[1]) {
      setMinInputValue(yearRange[1].toString());
      onYearChange([yearRange[1], yearRange[1]]);
      toast.info(`Min year cannot exceed max year (${yearRange[1]})`);
    }
  }, [minInputValue, minYear, maxYear, yearRange, onYearChange]);

  const handleMaxYearBlur = useCallback(() => {
    const value = parseInt(maxInputValue);
    if (isNaN(value)) {
      setMaxInputValue(yearRange[1].toString());
      toast.error("Please enter a valid year");
    } else if (value < minYear) {
      setMaxInputValue(minYear.toString());
      onYearChange([yearRange[0], minYear]);
      toast.info(`Snapped to minimum year ${minYear}`);
    } else if (value > maxYear) {
      setMaxInputValue(maxYear.toString());
      onYearChange([yearRange[0], maxYear]);
      toast.info(`Snapped to maximum year ${maxYear}`);
    } else if (value < yearRange[0]) {
      setMaxInputValue(yearRange[0].toString());
      onYearChange([yearRange[0], yearRange[0]]);
      toast.info(`Max year cannot be less than min year (${yearRange[0]})`);
    }
  }, [maxInputValue, minYear, maxYear, yearRange, onYearChange]);

  const handleMinYearKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = parseInt(minInputValue);
        if (isNaN(value)) {
          setMinInputValue(yearRange[0].toString());
          toast.error("Please enter a valid year");
        } else if (value < minYear) {
          setMinInputValue(minYear.toString());
          onYearChange([minYear, yearRange[1]]);
          toast.info(`Snapped to minimum year ${minYear}`);
        } else if (value > maxYear) {
          setMinInputValue(maxYear.toString());
          onYearChange([maxYear, yearRange[1]]);
          toast.info(`Snapped to maximum year ${maxYear}`);
        } else if (value > yearRange[1]) {
          setMinInputValue(yearRange[1].toString());
          onYearChange([yearRange[1], yearRange[1]]);
          toast.info(`Min year cannot exceed max year (${yearRange[1]})`);
        }
      }
    },
    [minInputValue, minYear, maxYear, yearRange, onYearChange],
  );

  const handleMaxYearKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = parseInt(maxInputValue);
        if (isNaN(value)) {
          setMaxInputValue(yearRange[1].toString());
          toast.error("Please enter a valid year");
        } else if (value < minYear) {
          setMaxInputValue(minYear.toString());
          onYearChange([yearRange[0], minYear]);
          toast.info(`Snapped to minimum year ${minYear}`);
        } else if (value > maxYear) {
          setMaxInputValue(maxYear.toString());
          onYearChange([yearRange[0], maxYear]);
          toast.info(`Snapped to maximum year ${maxYear}`);
        } else if (value < yearRange[0]) {
          setMaxInputValue(yearRange[0].toString());
          onYearChange([yearRange[0], yearRange[0]]);
          toast.info(`Max year cannot be less than min year (${yearRange[0]})`);
        }
      }
    },
    [maxInputValue, minYear, maxYear, yearRange, onYearChange],
  );

  const formatYearRange = useMemo(() => {
    if (yearRange[0] === minYear && yearRange[1] === maxYear) {
      return "All years";
    }
    if (yearRange[0] === yearRange[1]) {
      return `${yearRange[0]}`;
    }
    return `${yearRange[0]} - ${yearRange[1]}`;
  }, [yearRange, minYear, maxYear]);

  // Show loading skeleton while data is being processed
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="px-3">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-col">
              <Skeleton className="mb-1 h-3 w-6" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="mt-5 flex-1 text-center">
              <Skeleton className="mx-auto h-3 w-4" />
            </div>
            <div className="flex flex-col">
              <Skeleton className="mb-1 h-3 w-8" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Year Range</label>
        <span className="text-sm text-muted-foreground">{formatYearRange}</span>
      </div>
      <div className="px-3">
        <Slider
          value={yearRange}
          onValueChange={handleSliderChange}
          min={minYear}
          max={maxYear}
          step={1}
          className="w-full"
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-col">
            <label htmlFor="min-year" className="mb-1 text-xs text-muted-foreground">
              Min
            </label>
            <Input
              id="min-year"
              type="number"
              value={minInputValue}
              onChange={handleMinYearChange}
              onBlur={handleMinYearBlur}
              onKeyDown={handleMinYearKeyDown}
              min={minYear}
              max={maxYear}
              className="h-8 w-20 text-center text-sm"
            />
          </div>
          <div className="mt-5 flex-1 text-center text-xs text-muted-foreground">
            to
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="max-year"
              className="mb-1 text-right text-xs text-muted-foreground"
            >
              Max
            </label>
            <Input
              id="max-year"
              type="number"
              value={maxInputValue}
              onChange={handleMaxYearChange}
              onBlur={handleMaxYearBlur}
              onKeyDown={handleMaxYearKeyDown}
              min={minYear}
              max={maxYear}
              className="h-8 w-20 text-center text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
