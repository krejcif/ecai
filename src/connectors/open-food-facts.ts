/**
 * OpenFoodFacts Connector
 * Fetches product data from Open Food Facts API
 * API Docs: https://world.openfoodfacts.org/api/v2/
 */

import { BaseConnector, ConnectorMetadata, FetchOptions } from './base-connector';

export interface NutritionData {
  energy_100g?: number;
  fat_100g?: number;
  saturated_fat_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
  fiber_100g?: number;
  [key: string]: any;
}

export interface OpenFoodFactsProduct {
  code: string; // Barcode
  product_name: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  image_url?: string;
  image_small_url?: string;
  quantity?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  nutriments?: NutritionData;
  ingredients_text?: string;
  allergens?: string;
  countries?: string;
  stores?: string;
  labels?: string;
  packaging?: string;
  manufacturing_places?: string;
  prices?: Array<{
    amount: number;
    currency: string;
    location?: string;
    date?: string;
  }>;
}

export interface OpenFoodFactsResponse {
  count: number;
  page: number;
  page_size: number;
  page_count: number;
  products: OpenFoodFactsProduct[];
}

export interface SearchParams {
  search?: string;
  categories?: string;
  brands?: string;
  countries?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'product_name' | 'popularity' | 'last_modified_t' | 'created_t';
  fields?: string[]; // Specific fields to return
}

export class OpenFoodFactsConnector extends BaseConnector<OpenFoodFactsResponse> {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2';

  constructor() {
    super({
      requestsPerSecond: 5,
      requestsPerMinute: 100,
    });
  }

  /**
   * Fetch products from Open Food Facts
   */
  async fetch(
    params: SearchParams = {},
    options?: FetchOptions
  ): Promise<OpenFoodFactsResponse> {
    const {
      search,
      categories,
      brands,
      countries,
      page = 1,
      page_size = 20,
      sort_by = 'popularity',
      fields,
    } = params;

    const queryParams: Record<string, any> = {
      page,
      page_size,
      sort_by,
    };

    // Build search query
    const searchTerms: string[] = [];
    if (search) searchTerms.push(search);
    if (categories) searchTerms.push(`categories:${categories}`);
    if (brands) searchTerms.push(`brands:${brands}`);
    if (countries) searchTerms.push(`countries:${countries}`);

    if (searchTerms.length > 0) {
      queryParams.search_terms = searchTerms.join(' ');
    }

    // Specify fields to return
    if (fields && fields.length > 0) {
      queryParams.fields = fields.join(',');
    } else {
      queryParams.fields = [
        'code',
        'product_name',
        'brands',
        'categories',
        'categories_tags',
        'image_url',
        'image_small_url',
        'quantity',
        'nutriscore_grade',
        'nova_group',
        'ecoscore_grade',
        'nutriments',
        'ingredients_text',
        'allergens',
        'countries',
        'stores',
        'labels',
        'packaging',
        'manufacturing_places',
      ].join(',');
    }

    const url = this.buildUrl(`${this.baseUrl}/search`, queryParams);
    const rawData = await this.fetchWithRetry(url, options);
    return this.transform(rawData);
  }

  /**
   * Fetch a single product by barcode
   */
  async fetchByBarcode(
    barcode: string,
    options?: FetchOptions
  ): Promise<OpenFoodFactsProduct | null> {
    const url = `${this.baseUrl}/product/${barcode}.json`;
    const rawData = await this.fetchWithRetry(url, options);

    if (rawData.status === 0 || !rawData.product) {
      return null;
    }

    return this.transformProduct(rawData.product);
  }

  /**
   * Transform raw API response to standardized format
   */
  transform(rawData: any): OpenFoodFactsResponse {
    return {
      count: rawData.count || 0,
      page: rawData.page || 1,
      page_size: rawData.page_size || 20,
      page_count: rawData.page_count || 0,
      products: (rawData.products || []).map((product: any) =>
        this.transformProduct(product)
      ),
    };
  }

  /**
   * Transform a single product
   */
  private transformProduct(product: any): OpenFoodFactsProduct {
    return {
      code: product.code || product._id,
      product_name: product.product_name || 'Unknown',
      brands: product.brands,
      categories: product.categories,
      categories_tags: product.categories_tags || [],
      image_url: product.image_url,
      image_small_url: product.image_small_url,
      quantity: product.quantity,
      nutriscore_grade: product.nutriscore_grade,
      nova_group: product.nova_group,
      ecoscore_grade: product.ecoscore_grade,
      nutriments: product.nutriments,
      ingredients_text: product.ingredients_text,
      allergens: product.allergens,
      countries: product.countries,
      stores: product.stores,
      labels: product.labels,
      packaging: product.packaging,
      manufacturing_places: product.manufacturing_places,
    };
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: 'OpenFoodFacts',
      source: 'https://world.openfoodfacts.org',
      version: '2.0',
      description:
        'Open Food Facts is a free, online database of food products from around the world',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 100,
      },
    };
  }

  /**
   * Search products by category
   */
  async searchByCategory(
    category: string,
    page = 1,
    pageSize = 20,
    options?: FetchOptions
  ): Promise<OpenFoodFactsResponse> {
    return this.fetch({ categories: category, page, page_size: pageSize }, options);
  }

  /**
   * Search products by brand
   */
  async searchByBrand(
    brand: string,
    page = 1,
    pageSize = 20,
    options?: FetchOptions
  ): Promise<OpenFoodFactsResponse> {
    return this.fetch({ brands: brand, page, page_size: pageSize }, options);
  }

  /**
   * Get products with specific nutriscore
   */
  async searchByNutriscore(
    grade: 'a' | 'b' | 'c' | 'd' | 'e',
    page = 1,
    pageSize = 20,
    options?: FetchOptions
  ): Promise<OpenFoodFactsResponse> {
    const url = this.buildUrl(`${this.baseUrl}/search`, {
      nutrition_grades: grade,
      page,
      page_size: pageSize,
    });
    const rawData = await this.fetchWithRetry(url, options);
    return this.transform(rawData);
  }
}
