/**
 * Open Prices Connector
 * Fetches price data from Open Prices API
 * API: https://prices.openfoodfacts.org
 */

import { BaseConnector, ConnectorMetadata, FetchOptions } from './base-connector';

export interface Price {
  id: number;
  product_code?: string;
  product_name?: string;
  category_tag?: string;
  labels_tags?: string[];
  origins_tags?: string[];
  price: number;
  price_per?: string; // e.g., "KILOGRAM", "UNIT"
  currency: string;
  location_osm_id?: number;
  location_osm_type?: string;
  date: string; // ISO date string
  proof_id?: number;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface PriceTrend {
  product_code: string;
  prices: Array<{
    date: string;
    price: number;
    currency: string;
  }>;
  average_price: number;
  min_price: number;
  max_price: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percent_change?: number;
}

export interface PriceStats {
  total_prices: number;
  unique_products: number;
  unique_locations: number;
  date_range: {
    from: string;
    to: string;
  };
  average_price?: number;
  currency?: string;
}

export interface OpenPricesResponse {
  items: Price[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PriceSearchParams {
  product_code?: string;
  product_name?: string;
  category_tag?: string;
  location_osm_id?: number;
  currency?: string;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  price_min?: number;
  price_max?: number;
  page?: number;
  size?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export class OpenPricesConnector extends BaseConnector<OpenPricesResponse> {
  private readonly baseUrl = 'https://prices.openfoodfacts.org/api/v1';

  constructor() {
    super({
      requestsPerSecond: 5,
      requestsPerMinute: 100,
    });
  }

  /**
   * Fetch prices from Open Prices API
   */
  async fetch(
    params: PriceSearchParams = {},
    options?: FetchOptions
  ): Promise<OpenPricesResponse> {
    const {
      product_code,
      product_name,
      category_tag,
      location_osm_id,
      currency,
      date_from,
      date_to,
      price_min,
      price_max,
      page = 1,
      size = 20,
      order_by = 'date',
      order_direction = 'desc',
    } = params;

    const queryParams: Record<string, any> = {
      page,
      size,
      order_by,
      order_direction,
    };

    // Add optional filters
    if (product_code) queryParams.product_code = product_code;
    if (product_name) queryParams.product_name = product_name;
    if (category_tag) queryParams.category_tag = category_tag;
    if (location_osm_id) queryParams.location_osm_id = location_osm_id;
    if (currency) queryParams.currency = currency;
    if (date_from) queryParams.date__gte = date_from;
    if (date_to) queryParams.date__lte = date_to;
    if (price_min !== undefined) queryParams.price__gte = price_min;
    if (price_max !== undefined) queryParams.price__lte = price_max;

    const url = this.buildUrl(`${this.baseUrl}/prices`, queryParams);
    const rawData = await this.fetchWithRetry(url, options);
    return this.transform(rawData);
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(
    productCode: string,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      currency?: string;
      fetchOptions?: FetchOptions;
    }
  ): Promise<Price[]> {
    const response = await this.fetch(
      {
        product_code: productCode,
        date_from: options?.dateFrom,
        date_to: options?.dateTo,
        currency: options?.currency,
        size: 100,
        order_by: 'date',
        order_direction: 'asc',
      },
      options?.fetchOptions
    );

    return response.items;
  }

  /**
   * Calculate price trends for a product
   */
  async calculatePriceTrend(
    productCode: string,
    options?: {
      dateFrom?: string;
      dateTo?: string;
      currency?: string;
      fetchOptions?: FetchOptions;
    }
  ): Promise<PriceTrend | null> {
    const prices = await this.getPriceHistory(productCode, options);

    if (prices.length === 0) {
      return null;
    }

    const priceData = prices.map(p => ({
      date: p.date,
      price: p.price,
      currency: p.currency,
    }));

    const priceValues = priceData.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let percentChange: number | undefined;

    if (priceData.length >= 2) {
      const firstPrice = priceData[0].price;
      const lastPrice = priceData[priceData.length - 1].price;
      percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

      if (percentChange > 5) {
        trend = 'increasing';
      } else if (percentChange < -5) {
        trend = 'decreasing';
      }
    }

    return {
      product_code: productCode,
      prices: priceData,
      average_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      trend,
      percent_change: percentChange,
    };
  }

  /**
   * Get price statistics
   */
  async getPriceStats(
    params: PriceSearchParams = {},
    options?: FetchOptions
  ): Promise<PriceStats> {
    const response = await this.fetch(
      { ...params, size: 1000 },
      options
    );

    const uniqueProducts = new Set(
      response.items
        .map(p => p.product_code)
        .filter(Boolean)
    );

    const uniqueLocations = new Set(
      response.items
        .map(p => p.location_osm_id)
        .filter(Boolean)
    );

    const dates = response.items
      .map(p => p.date)
      .filter(Boolean)
      .sort();

    const prices = response.items.map(p => p.price);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : undefined;

    const currencies = response.items.map(p => p.currency);
    const mostCommonCurrency = this.getMostCommon(currencies);

    return {
      total_prices: response.total,
      unique_products: uniqueProducts.size,
      unique_locations: uniqueLocations.size,
      date_range: {
        from: dates[0] || '',
        to: dates[dates.length - 1] || '',
      },
      average_price: avgPrice,
      currency: mostCommonCurrency,
    };
  }

  /**
   * Get latest prices for a product
   */
  async getLatestPrices(
    productCode: string,
    limit = 10,
    options?: FetchOptions
  ): Promise<Price[]> {
    const response = await this.fetch(
      {
        product_code: productCode,
        size: limit,
        order_by: 'date',
        order_direction: 'desc',
      },
      options
    );

    return response.items;
  }

  /**
   * Search prices by location
   */
  async searchByLocation(
    locationId: number,
    params?: Omit<PriceSearchParams, 'location_osm_id'>,
    options?: FetchOptions
  ): Promise<OpenPricesResponse> {
    return this.fetch({ ...params, location_osm_id: locationId }, options);
  }

  /**
   * Transform raw API response to standardized format
   */
  transform(rawData: any): OpenPricesResponse {
    return {
      items: (rawData.items || []).map((item: any) => this.transformPrice(item)),
      total: rawData.total || 0,
      page: rawData.page || 1,
      size: rawData.size || 20,
      pages: rawData.pages || 0,
    };
  }

  /**
   * Transform a single price item
   */
  private transformPrice(item: any): Price {
    return {
      id: item.id,
      product_code: item.product_code,
      product_name: item.product_name,
      category_tag: item.category_tag,
      labels_tags: item.labels_tags || [],
      origins_tags: item.origins_tags || [],
      price: item.price,
      price_per: item.price_per,
      currency: item.currency,
      location_osm_id: item.location_osm_id,
      location_osm_type: item.location_osm_type,
      date: item.date,
      proof_id: item.proof_id,
      owner: item.owner,
      created: item.created,
      updated: item.updated,
    };
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: 'OpenPrices',
      source: 'https://prices.openfoodfacts.org',
      version: '1.0',
      description:
        'Open Prices is an open database of product prices, collected by contributors',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 100,
      },
    };
  }

  /**
   * Utility to get most common item in array
   */
  private getMostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;

    const counts = new Map<T, number>();
    arr.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon: T | undefined;

    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    });

    return mostCommon;
  }
}
