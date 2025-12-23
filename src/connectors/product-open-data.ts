/**
 * Product Open Data Connector
 * Connects to various open product data sources
 * Handles UPC/EAN barcodes and product metadata
 */

import { BaseConnector, ConnectorMetadata, FetchOptions } from './base-connector';

export interface BarcodeInfo {
  barcode: string;
  type: 'UPC' | 'EAN-8' | 'EAN-13' | 'UPC-A' | 'UPC-E' | 'ISBN' | 'UNKNOWN';
  isValid: boolean;
  checkDigit?: string;
}

export interface ProductMetadata {
  barcode: string;
  barcodeInfo: BarcodeInfo;
  name?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  description?: string;
  attributes?: Record<string, any>;
  images?: string[];
  identifiers?: {
    upc?: string;
    ean?: string;
    isbn?: string;
    asin?: string;
    mpn?: string; // Manufacturer Part Number
    sku?: string;
  };
  dimensions?: {
    weight?: string;
    height?: string;
    width?: string;
    length?: string;
  };
  sources: string[];
  lastUpdated?: string;
}

export interface ProductSearchParams {
  barcode?: string;
  name?: string;
  brand?: string;
  category?: string;
  limit?: number;
}

export interface ProductOpenDataResponse {
  products: ProductMetadata[];
  total: number;
  sources: string[];
}

export class ProductOpenDataConnector extends BaseConnector<ProductOpenDataResponse> {
  // Using multiple open data sources
  private readonly dataSources = {
    openFoodFacts: 'https://world.openfoodfacts.org/api/v2',
    upcItemDb: 'https://api.upcitemdb.com/prod/trial',
    // Add more open data sources as needed
  };

  constructor() {
    super({
      requestsPerSecond: 3,
      requestsPerMinute: 50,
    });
  }

  /**
   * Fetch product data from multiple sources
   */
  async fetch(
    params: ProductSearchParams = {},
    options?: FetchOptions
  ): Promise<ProductOpenDataResponse> {
    const { barcode, name, brand, category, limit = 20 } = params;

    const products: ProductMetadata[] = [];
    const sources: string[] = [];

    // If barcode is provided, fetch from barcode-specific sources
    if (barcode) {
      const barcodeProducts = await this.fetchByBarcode(barcode, options);
      if (barcodeProducts.length > 0) {
        products.push(...barcodeProducts);
        sources.push('barcode_lookup');
      }
    }

    // Search by other parameters
    if (name || brand || category) {
      const searchProducts = await this.searchProducts(
        { name, brand, category, limit },
        options
      );
      products.push(...searchProducts);
      sources.push('product_search');
    }

    return this.transform({ products, sources });
  }

  /**
   * Fetch product by barcode
   */
  async fetchByBarcode(
    barcode: string,
    options?: FetchOptions
  ): Promise<ProductMetadata[]> {
    const barcodeInfo = this.parseBarcodeType(barcode);
    const products: ProductMetadata[] = [];

    // Try Open Food Facts first (free and open)
    try {
      const offUrl = `${this.dataSources.openFoodFacts}/product/${barcode}.json`;
      const offData = await this.fetchWithRetry(offUrl, options);

      if (offData.status === 1 && offData.product) {
        products.push(this.transformFromOpenFoodFacts(offData.product, barcodeInfo));
      }
    } catch (error) {
      console.error('Error fetching from Open Food Facts:', error);
    }

    return products;
  }

  /**
   * Search products by name, brand, or category
   */
  async searchProducts(
    params: Omit<ProductSearchParams, 'barcode'>,
    options?: FetchOptions
  ): Promise<ProductMetadata[]> {
    const { name, brand, category, limit = 20 } = params;
    const products: ProductMetadata[] = [];

    // Search Open Food Facts
    try {
      const queryParams: Record<string, any> = {
        page_size: limit,
      };

      const searchTerms: string[] = [];
      if (name) searchTerms.push(name);
      if (brand) searchTerms.push(`brands:${brand}`);
      if (category) searchTerms.push(`categories:${category}`);

      if (searchTerms.length > 0) {
        queryParams.search_terms = searchTerms.join(' ');
      }

      const url = this.buildUrl(`${this.dataSources.openFoodFacts}/search`, queryParams);
      const data = await this.fetchWithRetry(url, options);

      if (data.products && Array.isArray(data.products)) {
        data.products.forEach((product: any) => {
          const barcodeInfo = this.parseBarcodeType(product.code || '');
          products.push(this.transformFromOpenFoodFacts(product, barcodeInfo));
        });
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }

    return products;
  }

  /**
   * Parse and validate barcode type
   */
  parseBarcodeType(barcode: string): BarcodeInfo {
    const cleaned = barcode.replace(/[^0-9]/g, '');
    const length = cleaned.length;

    let type: BarcodeInfo['type'] = 'UNKNOWN';
    let isValid = false;
    let checkDigit: string | undefined;

    switch (length) {
      case 8:
        type = 'EAN-8';
        isValid = this.validateEAN(cleaned);
        checkDigit = cleaned[7];
        break;
      case 12:
        type = 'UPC-A';
        isValid = this.validateUPC(cleaned);
        checkDigit = cleaned[11];
        break;
      case 13:
        // Could be EAN-13 or ISBN
        if (cleaned.startsWith('978') || cleaned.startsWith('979')) {
          type = 'ISBN';
        } else {
          type = 'EAN-13';
        }
        isValid = this.validateEAN(cleaned);
        checkDigit = cleaned[12];
        break;
      default:
        type = 'UNKNOWN';
        isValid = false;
    }

    return {
      barcode: cleaned,
      type,
      isValid,
      checkDigit,
    };
  }

  /**
   * Validate EAN barcode using checksum
   */
  private validateEAN(barcode: string): boolean {
    if (!/^\d+$/.test(barcode)) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop();

    if (checkDigit === undefined) return false;

    let sum = 0;
    digits.forEach((digit, index) => {
      sum += digit * (index % 2 === 0 ? 1 : 3);
    });

    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }

  /**
   * Validate UPC barcode using checksum
   */
  private validateUPC(barcode: string): boolean {
    if (!/^\d+$/.test(barcode)) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop();

    if (checkDigit === undefined) return false;

    let sum = 0;
    digits.forEach((digit, index) => {
      sum += digit * (index % 2 === 0 ? 3 : 1);
    });

    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }

  /**
   * Transform data from Open Food Facts to standard format
   */
  private transformFromOpenFoodFacts(
    product: any,
    barcodeInfo: BarcodeInfo
  ): ProductMetadata {
    return {
      barcode: product.code || product._id,
      barcodeInfo,
      name: product.product_name,
      brand: product.brands,
      manufacturer: product.manufacturing_places,
      category: product.categories,
      description: product.ingredients_text,
      attributes: {
        quantity: product.quantity,
        packaging: product.packaging,
        labels: product.labels,
        nutriscore: product.nutriscore_grade,
        nova_group: product.nova_group,
        ecoscore: product.ecoscore_grade,
      },
      images: [
        product.image_url,
        product.image_front_url,
        product.image_ingredients_url,
        product.image_nutrition_url,
      ].filter(Boolean),
      identifiers: {
        ean: barcodeInfo.type.startsWith('EAN') ? barcodeInfo.barcode : undefined,
        upc: barcodeInfo.type.startsWith('UPC') ? barcodeInfo.barcode : undefined,
        isbn: barcodeInfo.type === 'ISBN' ? barcodeInfo.barcode : undefined,
      },
      dimensions: {
        weight: product.quantity,
      },
      sources: ['openfoodfacts'],
      lastUpdated: product.last_modified_t
        ? new Date(product.last_modified_t * 1000).toISOString()
        : undefined,
    };
  }

  /**
   * Transform raw data to standardized format
   */
  transform(rawData: any): ProductOpenDataResponse {
    return {
      products: rawData.products || [],
      total: rawData.products?.length || 0,
      sources: rawData.sources || [],
    };
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: 'ProductOpenData',
      source: 'Multiple Open Data Sources',
      version: '1.0',
      description:
        'Aggregates product data from multiple open data sources including barcode lookups and product metadata',
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 50,
      },
    };
  }

  /**
   * Enrich product data with multiple sources
   */
  async enrichProduct(
    barcode: string,
    options?: FetchOptions
  ): Promise<ProductMetadata | null> {
    const products = await this.fetchByBarcode(barcode, options);

    if (products.length === 0) {
      return null;
    }

    // Merge data from multiple sources
    return this.mergeProductData(products);
  }

  /**
   * Merge product data from multiple sources
   */
  private mergeProductData(products: ProductMetadata[]): ProductMetadata {
    if (products.length === 1) {
      return products[0];
    }

    const merged = products[0];
    const allSources = new Set<string>();

    products.forEach(product => {
      // Merge sources
      product.sources.forEach(source => allSources.add(source));

      // Fill in missing fields
      if (!merged.name && product.name) merged.name = product.name;
      if (!merged.brand && product.brand) merged.brand = product.brand;
      if (!merged.manufacturer && product.manufacturer)
        merged.manufacturer = product.manufacturer;
      if (!merged.category && product.category) merged.category = product.category;
      if (!merged.description && product.description)
        merged.description = product.description;

      // Merge images
      if (product.images) {
        merged.images = [...new Set([...(merged.images || []), ...product.images])];
      }

      // Merge attributes
      merged.attributes = {
        ...merged.attributes,
        ...product.attributes,
      };

      // Merge identifiers
      merged.identifiers = {
        ...merged.identifiers,
        ...product.identifiers,
      };
    });

    merged.sources = Array.from(allSources);
    return merged;
  }
}
