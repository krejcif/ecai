import axios, { AxiosInstance } from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExchangeRate {
  country: string;
  currency: string;
  amount: number;
  code: string;
  rate: number;
  date: string;
}

export interface BusinessInfo {
  ico: string; // Czech business identification number
  name: string;
  legalForm?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  status?: string;
  registrationDate?: string;
}

export interface PragueDataset {
  id: string;
  title: string;
  description: string;
  organization: string;
  resources: Array<{
    id: string;
    url: string;
    format: string;
    name: string;
  }>;
}

export interface CZSOIndicator {
  code: string;
  name: string;
  value: number;
  period: string;
  unit?: string;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, expiresInMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// CZECH DATA FETCHER CLASS
// ============================================================================

export class CzechDataFetcher {
  private httpClient: AxiosInstance;
  private cache: DataCache;

  // API endpoints
  private readonly CNB_EXCHANGE_URL = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
  private readonly ARES_API_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';
  private readonly PRAGUE_OPENDATA_URL = 'https://opendata.praha.eu/api/3/action';
  private readonly CZSO_API_URL = 'https://vdb.czso.cz/pll/eweb';

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Czech-Data-Platform/1.0',
        'Accept': 'text/plain,text/html',
      },
    });
    this.cache = new DataCache();
  }

  // ==========================================================================
  // CNB EXCHANGE RATES
  // ==========================================================================

  /**
   * Fetches current exchange rates from Czech National Bank
   * The CNB provides data in a specific text format that needs parsing
   */
  async fetchCNBExchangeRates(): Promise<ExchangeRate[]> {
    const cacheKey = 'cnb_exchange_rates';
    const cached = this.cache.get<ExchangeRate[]>(cacheKey);

    if (cached) {
      console.log('Returning cached CNB exchange rates');
      return cached;
    }

    try {
      console.log('Fetching CNB exchange rates...');
      const response = await this.httpClient.get(this.CNB_EXCHANGE_URL);
      const rates = this.parseCNBExchangeRates(response.data);

      // Cache for 1 hour (rates update daily)
      this.cache.set(cacheKey, rates, 3600000);

      return rates;
    } catch (error) {
      throw this.handleError('Failed to fetch CNB exchange rates', error);
    }
  }

  /**
   * Parses CNB exchange rate text format
   * Format:
   * Line 1: Date DD.MM.YYYY #sequence
   * Line 2: Headers
   * Line 3+: Country|Currency|Amount|Code|Rate
   */
  private parseCNBExchangeRates(data: string): ExchangeRate[] {
    const lines = data.trim().split('\n');

    if (lines.length < 3) {
      throw new Error('Invalid CNB exchange rate format');
    }

    // Parse date from first line (e.g., "24.12.2025 #243")
    const dateLine = lines[0];
    const dateMatch = dateLine.match(/(\d{2}\.\d{2}\.\d{4})/);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('cs-CZ');

    // Skip header lines (first 2 lines)
    const dataLines = lines.slice(2);

    const rates: ExchangeRate[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      const parts = line.split('|');
      if (parts.length !== 5) continue;

      rates.push({
        country: parts[0].trim(),
        currency: parts[1].trim(),
        amount: parseFloat(parts[2].trim()),
        code: parts[3].trim(),
        rate: parseFloat(parts[4].trim().replace(',', '.')),
        date,
      });
    }

    return rates;
  }

  // ==========================================================================
  // CZECH ARES BUSINESS REGISTRY
  // ==========================================================================

  /**
   * Fetches business information from Czech ARES registry
   * @param ico - Czech business identification number (IČO)
   */
  async fetchBusinessInfo(ico: string): Promise<BusinessInfo | null> {
    const cacheKey = `ares_business_${ico}`;
    const cached = this.cache.get<BusinessInfo>(cacheKey);

    if (cached) {
      console.log(`Returning cached business info for IČO: ${ico}`);
      return cached;
    }

    try {
      console.log(`Fetching business info for IČO: ${ico}...`);
      const response = await this.httpClient.get(`${this.ARES_API_URL}/${ico}`);

      const businessInfo = this.parseARESResponse(response.data, ico);

      // Cache for 24 hours
      this.cache.set(cacheKey, businessInfo, 86400000);

      return businessInfo;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Business not found for IČO: ${ico}`);
        return null;
      }
      throw this.handleError(`Failed to fetch business info for IČO: ${ico}`, error);
    }
  }

  /**
   * Parses ARES API response
   */
  private parseARESResponse(data: any, ico: string): BusinessInfo {
    const businessInfo: BusinessInfo = {
      ico,
      name: data.obchodniJmeno || data.nazev || 'Unknown',
    };

    // Parse legal form
    if (data.pravniForma) {
      businessInfo.legalForm = data.pravniForma.nazev || data.pravniForma;
    }

    // Parse address
    if (data.sidlo) {
      const address = data.sidlo;
      businessInfo.address = {
        street: address.nazevUlice || address.ulice,
        city: address.nazevObce || address.obec,
        postalCode: address.psc,
        country: address.stat || 'Česká republika',
      };
    }

    // Parse status
    if (data.stavSubjektu) {
      businessInfo.status = data.stavSubjektu;
    }

    // Parse registration date
    if (data.datumVzniku) {
      businessInfo.registrationDate = data.datumVzniku;
    }

    return businessInfo;
  }

  /**
   * Search for businesses by name
   */
  async searchBusinesses(query: string, limit: number = 10): Promise<BusinessInfo[]> {
    try {
      console.log(`Searching businesses with query: "${query}"...`);
      const response = await this.httpClient.get(this.ARES_API_URL, {
        params: {
          obchodniJmeno: query,
          pocet: limit,
          start: 0,
        },
      });

      const businesses: BusinessInfo[] = [];
      const items = response.data.ekonomickeSubjekty || [];

      for (const item of items) {
        businesses.push(this.parseARESResponse(item, item.ico));
      }

      return businesses;
    } catch (error) {
      throw this.handleError(`Failed to search businesses for query: ${query}`, error);
    }
  }

  // ==========================================================================
  // PRAGUE OPEN DATA
  // ==========================================================================

  /**
   * Fetches datasets from Prague Open Data portal
   */
  async fetchPragueDatasets(limit: number = 20): Promise<PragueDataset[]> {
    const cacheKey = `prague_datasets_${limit}`;
    const cached = this.cache.get<PragueDataset[]>(cacheKey);

    if (cached) {
      console.log('Returning cached Prague datasets');
      return cached;
    }

    try {
      console.log('Fetching Prague Open Data datasets...');
      const response = await this.httpClient.get(`${this.PRAGUE_OPENDATA_URL}/package_list`);

      // Get list of dataset IDs
      const datasetIds = response.data.result?.slice(0, limit) || [];

      // Fetch details for each dataset
      const datasets: PragueDataset[] = [];
      for (const id of datasetIds) {
        try {
          const detailResponse = await this.httpClient.get(
            `${this.PRAGUE_OPENDATA_URL}/package_show`,
            { params: { id } }
          );

          const pkg = detailResponse.data.result;
          datasets.push({
            id: pkg.id,
            title: pkg.title || pkg.name,
            description: pkg.notes || '',
            organization: pkg.organization?.title || '',
            resources: (pkg.resources || []).map((r: any) => ({
              id: r.id,
              url: r.url,
              format: r.format,
              name: r.name,
            })),
          });
        } catch (err) {
          console.warn(`Failed to fetch dataset ${id}:`, err);
        }
      }

      // Cache for 6 hours
      this.cache.set(cacheKey, datasets, 21600000);

      return datasets;
    } catch (error) {
      throw this.handleError('Failed to fetch Prague datasets', error);
    }
  }

  /**
   * Fetches Prague public transport data
   */
  async fetchPragueTransportData(): Promise<any> {
    try {
      console.log('Fetching Prague public transport data...');

      // Search for transport-related datasets
      const response = await this.httpClient.get(
        `${this.PRAGUE_OPENDATA_URL}/package_search`,
        {
          params: {
            q: 'doprava transport',
            rows: 10,
          },
        }
      );

      const results = response.data.result?.results || [];

      return results.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.notes,
        tags: item.tags?.map((t: any) => t.name) || [],
        resources: item.resources?.map((r: any) => ({
          url: r.url,
          format: r.format,
          name: r.name,
        })) || [],
      }));
    } catch (error) {
      throw this.handleError('Failed to fetch Prague transport data', error);
    }
  }

  // ==========================================================================
  // CZSO (CZECH STATISTICAL OFFICE)
  // ==========================================================================

  /**
   * Note: CZSO API requires specific authentication and complex queries
   * This is a simplified implementation for demonstration
   */
  async fetchCZSOEconomicIndicators(): Promise<any> {
    try {
      console.log('Fetching CZSO economic indicators...');

      // The CZSO API is complex and requires specific package/procedure calls
      // This is a placeholder that would need to be customized based on
      // specific data requirements

      return {
        note: 'CZSO API requires specific authentication and query parameters',
        endpoint: this.CZSO_API_URL,
        documentation: 'https://www.czso.cz/csu/czso/otevrena_data',
        example: 'Contact CZSO for API access and specific data package identifiers',
      };
    } catch (error) {
      throw this.handleError('Failed to fetch CZSO data', error);
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Error handler with detailed logging
   */
  private handleError(message: string, error: any): Error {
    const errorDetails = {
      message,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    };

    console.error('CzechDataFetcher Error:', errorDetails);

    return new Error(`${message}: ${error.message}`);
  }

  /**
   * Get exchange rate for specific currency
   */
  async getExchangeRate(currencyCode: string): Promise<ExchangeRate | null> {
    const rates = await this.fetchCNBExchangeRates();
    return rates.find(r => r.code === currencyCode.toUpperCase()) || null;
  }

  /**
   * Convert amount from foreign currency to CZK
   */
  async convertToCZK(amount: number, currencyCode: string): Promise<number> {
    const rate = await this.getExchangeRate(currencyCode);
    if (!rate) {
      throw new Error(`Exchange rate not found for currency: ${currencyCode}`);
    }
    return (amount / rate.amount) * rate.rate;
  }

  /**
   * Convert amount from CZK to foreign currency
   */
  async convertFromCZK(amount: number, currencyCode: string): Promise<number> {
    const rate = await this.getExchangeRate(currencyCode);
    if (!rate) {
      throw new Error(`Exchange rate not found for currency: ${currencyCode}`);
    }
    return (amount * rate.amount) / rate.rate;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CzechDataFetcher;
