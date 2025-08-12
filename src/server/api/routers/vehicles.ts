import * as cheerio from "cheerio";
import { backOff } from "exponential-backoff";
import { revalidateTag, unstable_cache } from "next/cache";
import pLimit from "p-limit";
import { z } from "zod";
import { API_ENDPOINTS, SEARCH_CONFIG } from "~/lib/constants";
import type {
  Location,
  ParsedVehicleData,
  SearchFilters,
  SearchResult,
  Vehicle,
  VehicleImage,
} from "~/lib/types";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { locationsRouter } from "./locations";

// Type for cheerio selection - extract from vehicleRows type
type CheerioSelection = ReturnType<ReturnType<typeof cheerio.load>>;

// Schema for search filters
const searchFiltersSchema = z.object({
  query: z.string(),
  makes: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  yearRange: z.tuple([z.number(), z.number()]).optional(),
  dateRange: z.tuple([z.date(), z.date()]).optional(),
  maxDistance: z.number().optional(),
  userLocation: z.tuple([z.number(), z.number()]).optional(),
  sortBy: z.enum(["distance", "date", "year", "make", "location"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/**
 * Utility function to add delay between requests
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  return backOff(
    async () => {
      const response = await fetch(url, options);

      // If successful, return the response
      if (response.ok) {
        return response;
      }

      // If client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `Client error: ${response.status} - ${response.statusText}`,
        );
      }

      // Server error (5xx) - retry with backoff
      throw new Error(
        `Server error: ${response.status} - ${response.statusText}`,
      );
    },
    {
      numOfAttempts: SEARCH_CONFIG.MAX_RETRIES,
      startingDelay: SEARCH_CONFIG.BASE_RETRY_DELAY,
      maxDelay: SEARCH_CONFIG.MAX_RETRY_DELAY,
      retry: (error: Error, attemptNumber: number) => {
        console.log(
          `Request failed (attempt ${attemptNumber}/${SEARCH_CONFIG.MAX_RETRIES}): ${error.message}`,
        );
        return true; // Always retry unless it's a client error (handled above)
      },
    },
  );
}

/**
 * Internal function to fetch vehicle inventory without caching
 */
async function fetchVehicleInventoryInternal(
  location: Location,
  searchQuery: string,
): Promise<ParsedVehicleData[]> {
  try {
    // Use the AJAX endpoint that returns search results HTML
    const url = new URL(
      `${API_ENDPOINTS.LKQ_BASE}${API_ENDPOINTS.VEHICLE_INVENTORY}`,
    );
    url.searchParams.set("page", "1");
    url.searchParams.set("filter", searchQuery);
    url.searchParams.set("store", location.locationCode);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SEARCH_CONFIG.REQUEST_TIMEOUT,
    );

    // Realistic browser headers to simulate AJAX request from the inventory page
    const response = await fetchWithRetry(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "X-Requested-With": "XMLHttpRequest", // Important for AJAX requests
        Referer: `${API_ENDPOINTS.LKQ_BASE}${location.urls.inventory}`,
        Origin: API_ENDPOINTS.LKQ_BASE,
        DNT: "1",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    return parseVehicleInventoryHTML(html, location);
  } catch (error) {
    console.error(
      `Error fetching inventory for location ${location.locationCode}:`,
      error,
    );

    // Add delay even on error to avoid hammering the server
    await delay(SEARCH_CONFIG.REQUEST_DELAY);

    return [];
  }
}

/**
 * Cached version of fetchVehicleInventoryInternal using Next.js cache
 *
 * ⚠️  LEGAL WARNING: This function performs web scraping of LKQ's website.
 * Before deploying to production, review LEGAL_CONSIDERATIONS.md and:
 * - Seek legal counsel
 * - Review LKQ's Terms of Service
 * - Consider requesting official API access
 * - Ensure compliance with applicable laws
 */
const fetchVehicleInventory = unstable_cache(
  async (location: Location, searchQuery: string) => {
    return fetchVehicleInventoryInternal(location, searchQuery);
  },
  ["vehicle-inventory"],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ["vehicles"],
  },
);

/**
 * Helper function to clear vehicle cache when needed
 */
export function clearVehicleCache(): void {
  revalidateTag("vehicles");
}

/**
 * Parses vehicle inventory HTML to extract vehicle data using Cheerio
 */
function parseVehicleInventoryHTML(
  html: string,
  location: Location,
): ParsedVehicleData[] {
  const vehicles: ParsedVehicleData[] = [];

  try {
    const $ = cheerio.load(html);
    const vehicleRows = $(".pypvi_resultRow");

    vehicleRows.each((index, element) => {
      const vehicleId = $(element).attr("id");
      if (!vehicleId) {
        return;
      }

      const vehicle = parseVehicleElement($(element), vehicleId, location);
      if (vehicle) {
        vehicles.push(vehicle);
      }
    });
  } catch (error) {
    console.error("Error parsing vehicle inventory HTML:", error);
  }

  return vehicles;
}

/**
 * Extract field value by removing the label and trimming whitespace
 */
function extractFieldValue(text: string, label: string): string {
  return text.replace(label, "").trim();
}

/**
 * Split text on multiple consecutive spaces (2 or more)
 */
function splitOnMultipleSpaces(text: string): string[] {
  return text.split("  ").filter((part) => part.trim().length > 0);
}

/**
 * Parse yard location from a text containing section, row, and space information
 */
function parseYardLocation(text: string): {
  section: string;
  row: string;
  space: string;
} {
  const locationParts = splitOnMultipleSpaces(text);

  const section =
    locationParts
      .find((part) => part.includes("Section:"))
      ?.replace("Section:", "")
      .trim() ?? "";

  const row =
    locationParts
      .find((part) => part.includes("Row:"))
      ?.replace("Row:", "")
      .trim() ?? "";

  const space =
    locationParts
      .find((part) => part.includes("Space:"))
      ?.replace("Space:", "")
      .trim() ?? "";

  return { section, row, space };
}

/**
 * Parse vehicle details from detail items
 */
function parseVehicleDetails($element: CheerioSelection): {
  color: string;
  vin: string;
  stockNumber: string;
  yardLocation: { section: string; row: string; space: string };
} {
  const detailItems = $element.find(".pypvi_detailItem");
  const details = Array.from(detailItems).map((item) =>
    cheerio.load(item).text(),
  );

  const colorText = details.find((text) => text.includes("Color:"));
  const color = colorText ? extractFieldValue(colorText, "Color:") : "Unknown";

  const vinText = details.find((text) => text.includes("VIN:"));
  const vin = vinText ? extractFieldValue(vinText, "VIN:") : "";

  const stockText = details.find((text) => text.includes("Stock #:"));
  const stockNumber = stockText ? extractFieldValue(stockText, "Stock #:") : "";

  const locationText = details.find((text) => text.includes("Section:"));
  const yardLocation = locationText
    ? parseYardLocation(locationText)
    : { section: "", row: "", space: "" };

  return { color, vin, stockNumber, yardLocation };
}

/**
 * Check if a character is whitespace
 */
function isWhitespace(char: string): boolean {
  return (
    char === " " ||
    char === "\t" ||
    char === "\n" ||
    char === "\r" ||
    char === "\f" ||
    char === "\v"
  );
}

/**
 * Normalize whitespace in text by replacing multiple whitespace characters with single spaces
 */
function normalizeWhitespace(text: string): string {
  const chars = Array.from(text);

  const result = chars.reduce<string[]>((acc, char) => {
    if (!isWhitespace(char)) {
      return [...acc, char];
    } else if (acc.length > 0 && acc[acc.length - 1] !== " ") {
      return [...acc, " "];
    }
    return acc;
  }, []);

  return result.join("").trim();
}

/**
 * Parse year, make, model from vehicle title
 */
function parseVehicleTitle(
  ymmText: string,
): { year: number; make: string; model: string } | null {
  const normalizedText = normalizeWhitespace(ymmText.trim());

  if (!normalizedText) return null;

  const ymmParts = normalizedText.split(" ");
  if (ymmParts.length < 3) return null;

  return {
    year: parseInt(ymmParts[0] ?? "0"),
    make: ymmParts[1] ?? "",
    model: ymmParts.slice(2).join(" "),
  };
}

/**
 * Convert text to URL-friendly slug by replacing spaces with hyphens
 */
function createSlug(text: string): string {
  return text.toLowerCase().split(" ").join("-");
}

/**
 * Generate vehicle URLs
 */
function generateVehicleUrls(
  year: number,
  make: string,
  model: string,
  location: Location,
): { detailsUrl: string; partsUrl: string; pricesUrl: string } {
  const modelSlug = createSlug(model);

  return {
    detailsUrl: `${API_ENDPOINTS.LKQ_BASE}${location.urls.inventory}${year}-${make.toLowerCase()}-${modelSlug}/`,
    partsUrl: `${API_ENDPOINTS.LKQ_BASE}${location.urls.parts}?year=${year}&make=${make}&model=${model}`,
    pricesUrl: `${API_ENDPOINTS.LKQ_BASE}${location.urls.prices}`,
  };
}

/**
 * Parse individual vehicle element using Cheerio
 */
function parseVehicleElement(
  $element: CheerioSelection,
  vehicleId: string,
  location: Location,
): ParsedVehicleData | null {
  try {
    // Extract year, make, model from the pypvi_ymm link
    const ymmLink = $element.find(".pypvi_ymm");
    if (ymmLink.length === 0) return null;

    const ymmText = ymmLink.text();
    const titleData = parseVehicleTitle(ymmText);
    if (!titleData) return null;

    const { year, make, model } = titleData;

    // Extract vehicle details
    const { color, vin, stockNumber, yardLocation } =
      parseVehicleDetails($element);

    // Extract available date
    const detailItems = $element.find(".pypvi_detailItem");
    const availableItem = Array.from(detailItems).find((item) => {
      const $item = cheerio.load(item);
      return $item.text().includes("Available:");
    });

    const availableDate = availableItem
      ? (cheerio.load(availableItem)("time").attr("datetime") ??
        new Date().toISOString())
      : new Date().toISOString();

    // Extract images
    const images = parseVehicleImagesCheerio($element);

    // Generate URLs
    const { detailsUrl, partsUrl, pricesUrl } = generateVehicleUrls(
      year,
      make,
      model,
      location,
    );

    return {
      id: vehicleId,
      year,
      make,
      model,
      color,
      vin,
      stockNumber,
      availableDate,
      yardLocation,
      images,
      detailsUrl,
      partsUrl,
      pricesUrl,
    };
  } catch (error) {
    console.error(`Error parsing vehicle element ${vehicleId}:`, error);
    return null;
  }
}

/**
 * Remove crop parameters from image URL
 */
function removeCropParameters(url: string): string {
  const urlObj = new URL(url);
  urlObj.searchParams.delete("w");
  urlObj.searchParams.delete("h");
  urlObj.searchParams.delete("mode");
  return urlObj.toString();
}

/**
 * Parse main vehicle image
 */
function parseMainImage($element: CheerioSelection): VehicleImage | null {
  const mainImg = $element.find(".pypvi_image img");
  if (mainImg.length === 0) return null;

  const imgSrc = mainImg.attr("src");
  if (!imgSrc) return null;

  return {
    url: removeCropParameters(imgSrc),
    thumbnailUrl: imgSrc,
    type: getImageType(imgSrc),
  };
}

/**
 * Parse additional vehicle images from fancybox links
 */
function parseAdditionalImages($element: CheerioSelection): VehicleImage[] {
  const fancyboxLinks = $element.find("a[data-fancybox]");

  return Array.from(fancyboxLinks)
    .map((link) => {
      const $link = cheerio.load(link);
      const url = $link("a").attr("href");
      const thumbnailUrl = $link("a").attr("data-thumb");

      if (!url || !thumbnailUrl) return null;

      return {
        url,
        thumbnailUrl,
        type: getImageType(url),
      };
    })
    .filter((image): image is VehicleImage => image !== null);
}

/**
 * Parse vehicle images using Cheerio
 */
function parseVehicleImagesCheerio($element: CheerioSelection): VehicleImage[] {
  const mainImage = parseMainImage($element);
  const additionalImages = parseAdditionalImages($element);

  return [mainImage, ...additionalImages].filter(
    (image): image is VehicleImage => image !== null,
  );
}

/**
 * Determine image type from URL
 */
function getImageType(url: string): VehicleImage["type"] {
  if (url.includes("CAR-FRONT-LEFT")) return "CAR-FRONT-LEFT";
  if (url.includes("CAR-BACK-LEFT")) return "CAR-BACK-LEFT";
  if (url.includes("CAR-BACK-RIGHT")) return "CAR-BACK-RIGHT";
  if (url.includes("CAR-FRONT-RIGHT")) return "CAR-FRONT-RIGHT";
  if (url.includes("CAR-BACK")) return "CAR-BACK";
  if (url.includes("CAR-FRONT")) return "CAR-FRONT";
  if (url.includes("CAR-LEFT")) return "CAR-LEFT";
  if (url.includes("CAR-RIGHT")) return "CAR-RIGHT";
  if (url.includes("ENGINE")) return "ENGINE";
  if (url.includes("INTERIOR")) return "INTERIOR";
  return "OTHER";
}

/**
 * Filter vehicles based on search criteria
 */
function filterVehicles(
  vehicles: Vehicle[],
  filters: SearchFilters,
): Vehicle[] {
  return vehicles.filter((vehicle) => {
    // Filter by makes
    if (filters.makes?.length && !filters.makes.includes(vehicle.make)) {
      return false;
    }

    // Filter by models
    if (filters.models?.length && !filters.models.includes(vehicle.model)) {
      return false;
    }

    // Filter by colors
    if (filters.colors?.length && !filters.colors.includes(vehicle.color)) {
      return false;
    }

    // Filter by year range
    if (filters.yearRange) {
      const [minYear, maxYear] = filters.yearRange;
      if (vehicle.year < minYear || vehicle.year > maxYear) {
        return false;
      }
    }

    // Filter by date range
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      const vehicleDate = new Date(vehicle.availableDate);
      if (vehicleDate < startDate || vehicleDate > endDate) {
        return false;
      }
    }

    // Filter by distance
    if (
      filters.maxDistance &&
      filters.userLocation &&
      vehicle.location.distance > filters.maxDistance
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Sort vehicles based on criteria
 */
function sortVehicles(
  vehicles: Vehicle[],
  sortBy?: SearchFilters["sortBy"],
  sortOrder: SearchFilters["sortOrder"] = "asc",
): Vehicle[] {
  if (!sortBy) return vehicles;

  const multiplier = sortOrder === "desc" ? -1 : 1;

  return vehicles.sort((a, b) => {
    switch (sortBy) {
      case "distance":
        return (a.location.distance - b.location.distance) * multiplier;
      case "date":
        return (
          (new Date(a.availableDate).getTime() -
            new Date(b.availableDate).getTime()) *
          multiplier
        );
      case "year":
        return (a.year - b.year) * multiplier;
      case "make":
        return a.make.localeCompare(b.make) * multiplier;
      case "location":
        return (
          a.location.displayName.localeCompare(b.location.displayName) *
          multiplier
        );
      default:
        return 0;
    }
  });
}

export const vehiclesRouter = createTRPCRouter({
  /**
   * Global search across all LKQ locations
   */
  search: publicProcedure
    .input(searchFiltersSchema)
    .query(async ({ input }): Promise<SearchResult> => {
      const startTime = Date.now();

      // Search all locations
      const locationsToSearch = await locationsRouter
        .createCaller({ headers: new Headers() })
        .getAll();

      // Perform parallel searches with concurrency limit using p-limit
      const limit = pLimit(SEARCH_CONFIG.MAX_CONCURRENT_REQUESTS);
      const locationsWithErrors: string[] = [];

      const allVehiclePromises = locationsToSearch.map((location) =>
        limit(async () => {
          try {
            const parsedVehicles = await fetchVehicleInventory(
              location,
              input.query,
            );
            return parsedVehicles.map(
              (vehicle) =>
                ({
                  ...vehicle,
                  location,
                }) as Vehicle,
            );
          } catch (error) {
            console.error(
              `Error fetching vehicles from ${location.locationCode}:`,
              error,
            );
            locationsWithErrors.push(location.locationCode);
            return [];
          }
        }),
      );

      const allVehicleResults = await Promise.all(allVehiclePromises);
      const allVehicles = allVehicleResults.flat();

      // Apply filters
      const filteredVehicles = filterVehicles(allVehicles, input);

      // Sort results
      const sortedVehicles = sortVehicles(
        filteredVehicles,
        input.sortBy,
        input.sortOrder,
      );

      // Return ALL results - no pagination
      const allResults = sortedVehicles;

      const searchTime = Date.now() - startTime;

      return {
        vehicles: allResults,
        totalCount: allResults.length,
        page: 1,
        hasMore: false,
        searchTime,
        locationsCovered: locationsToSearch.length - locationsWithErrors.length,
        locationsWithErrors,
      };
    }),

  /**
   * Get vehicle by ID
   */
  getById: publicProcedure
    .input(
      z.object({
        vehicleId: z.string(),
        locationCode: z.string(),
      }),
    )
    .query(async ({ input }): Promise<Vehicle | null> => {
      const location = await locationsRouter
        .createCaller({ headers: new Headers() })
        .getByCode({
          locationCode: input.locationCode,
        });

      if (!location) return null;

      // Fetch specific vehicle (this is simplified - in reality would need to search)
      const vehicles = await fetchVehicleInventory(location, "");
      const vehicleData = vehicles.find((v) => v.id === input.vehicleId);

      if (!vehicleData) return null;

      return {
        ...vehicleData,
        location,
      };
    }),

  /**
   * Get popular makes across all locations
   */
  getPopularMakes: publicProcedure.query(async (): Promise<string[]> => {
    // This would ideally analyze actual inventory data
    // For now, return predefined popular makes
    return [
      "HONDA",
      "TOYOTA",
      "FORD",
      "CHEVROLET",
      "NISSAN",
      "HYUNDAI",
      "KIA",
      "MAZDA",
      "SUBARU",
      "VOLKSWAGEN",
    ];
  }),

  /**
   * Get models for a specific make
   */
  getModelsForMake: publicProcedure
    .input(
      z.object({
        make: z.string(),
      }),
    )
    .query(async ({ input }): Promise<string[]> => {
      // This would ideally query actual inventory data
      // For now, return common models for popular makes
      const makeModels: Record<string, string[]> = {
        HONDA: ["ACCORD", "CIVIC", "CR-V", "PILOT", "ODYSSEY", "FIT", "HR-V"],
        TOYOTA: [
          "CAMRY",
          "COROLLA",
          "RAV4",
          "PRIUS",
          "HIGHLANDER",
          "SIENNA",
          "TACOMA",
        ],
        FORD: [
          "F-150",
          "ESCAPE",
          "FOCUS",
          "FUSION",
          "EXPLORER",
          "EDGE",
          "MUSTANG",
        ],
        CHEVROLET: [
          "SILVERADO",
          "EQUINOX",
          "MALIBU",
          "CRUZE",
          "TAHOE",
          "SUBURBAN",
          "IMPALA",
        ],
        NISSAN: [
          "ALTIMA",
          "SENTRA",
          "ROGUE",
          "PATHFINDER",
          "FRONTIER",
          "TITAN",
          "VERSA",
        ],
      };

      return makeModels[input.make.toUpperCase()] ?? [];
    }),
});
