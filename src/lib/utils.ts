import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Vehicle } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function filterVehiclesByYear(vehicles: Vehicle[], yearRange: [number, number]): Vehicle[] {
  const [minYear, maxYear] = yearRange;
  return vehicles.filter(vehicle => vehicle.year >= minYear && vehicle.year <= maxYear);
}
