import { ExchangeRate, BusinessInfo, PragueDataset } from './czechDataFetcher';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NormalizedData {
  source: string;
  timestamp: number;
  data: any;
  metadata?: {
    recordCount?: number;
    dataType?: string;
    processingTime?: number;
  };
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  count: number;
}

export interface AggregationResult {
  groupBy: string;
  aggregations: {
    [key: string]: number | string;
  };
  count: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

// ============================================================================
// DATA PROCESSOR CLASS
// ============================================================================

export class DataProcessor {

  // ==========================================================================
  // DATA NORMALIZATION
  // ==========================================================================

  /**
   * Normalizes exchange rate data to a standard format
   */
  normalizeExchangeRates(rates: ExchangeRate[]): NormalizedData {
    const startTime = Date.now();

    const normalized = rates.map(rate => ({
      currency: {
        code: rate.code,
        name: rate.currency,
        country: rate.country,
      },
      exchange: {
        amount: rate.amount,
        rate: rate.rate,
        ratePerUnit: rate.rate / rate.amount,
      },
      date: this.parseDate(rate.date),
      timestamp: new Date().getTime(),
    }));

    return {
      source: 'CNB Exchange Rates',
      timestamp: Date.now(),
      data: normalized,
      metadata: {
        recordCount: normalized.length,
        dataType: 'exchange_rates',
        processingTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Normalizes business information data
   */
  normalizeBusinessInfo(businesses: BusinessInfo[]): NormalizedData {
    const startTime = Date.now();

    const normalized = businesses.map(business => ({
      identifier: {
        ico: business.ico,
        type: 'czech_business_id',
      },
      name: business.name,
      legalForm: business.legalForm || null,
      location: business.address ? {
        street: business.address.street || null,
        city: business.address.city || null,
        postalCode: business.address.postalCode || null,
        country: business.address.country || 'Czech Republic',
        formatted: this.formatAddress(business.address),
      } : null,
      status: business.status || 'unknown',
      registrationDate: business.registrationDate || null,
      metadata: {
        source: 'ARES',
        fetchedAt: new Date().toISOString(),
      },
    }));

    return {
      source: 'ARES Business Registry',
      timestamp: Date.now(),
      data: normalized,
      metadata: {
        recordCount: normalized.length,
        dataType: 'business_info',
        processingTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Normalizes Prague Open Data datasets
   */
  normalizePragueDatasets(datasets: PragueDataset[]): NormalizedData {
    const startTime = Date.now();

    const normalized = datasets.map(dataset => ({
      id: dataset.id,
      title: dataset.title,
      description: this.truncateText(dataset.description, 500),
      organization: dataset.organization,
      resourceCount: dataset.resources.length,
      resources: dataset.resources.map(resource => ({
        id: resource.id,
        url: resource.url,
        format: resource.format.toLowerCase(),
        name: resource.name,
        dataType: this.detectDataType(resource.format),
      })),
      metadata: {
        source: 'Prague Open Data',
        fetchedAt: new Date().toISOString(),
      },
    }));

    return {
      source: 'Prague Open Data',
      timestamp: Date.now(),
      data: normalized,
      metadata: {
        recordCount: normalized.length,
        dataType: 'open_data_catalog',
        processingTime: Date.now() - startTime,
      },
    };
  }

  // ==========================================================================
  // STATISTICAL ANALYSIS
  // ==========================================================================

  /**
   * Calculates statistical summary for numeric array
   */
  calculateStatistics(values: number[]): StatisticalSummary {
    if (values.length === 0) {
      throw new Error('Cannot calculate statistics for empty array');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;

    // Mean
    const mean = values.reduce((sum, val) => sum + val, 0) / count;

    // Median
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

    // Mode
    const frequency: { [key: number]: number } = {};
    let maxFreq = 0;
    let mode = values[0];

    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });

    // Variance and Standard Deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      mean: this.round(mean, 4),
      median: this.round(median, 4),
      mode: this.round(mode, 4),
      min: sorted[0],
      max: sorted[count - 1],
      stdDev: this.round(stdDev, 4),
      variance: this.round(variance, 4),
      count,
    };
  }

  /**
   * Analyzes exchange rate statistics
   */
  analyzeExchangeRates(rates: ExchangeRate[]): {
    overall: StatisticalSummary;
    byCurrency: { [code: string]: StatisticalSummary };
  } {
    // Overall statistics (rate per unit)
    const ratesPerUnit = rates.map(r => r.rate / r.amount);
    const overall = this.calculateStatistics(ratesPerUnit);

    // Statistics by currency
    const byCurrency: { [code: string]: StatisticalSummary } = {};

    const currencyGroups = this.groupBy(rates, 'code');
    for (const [code, currencyRates] of Object.entries(currencyGroups)) {
      const currencyValues = currencyRates.map((r: ExchangeRate) => r.rate / r.amount);
      byCurrency[code] = this.calculateStatistics(currencyValues);
    }

    return { overall, byCurrency };
  }

  /**
   * Calculates percentile for a value in a dataset
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculates correlation coefficient between two datasets
   */
  calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length');
    }

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumXSquared += dx * dx;
      sumYSquared += dy * dy;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // ==========================================================================
  // DATA AGGREGATION
  // ==========================================================================

  /**
   * Groups array of objects by a specific key
   */
  groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }

  /**
   * Aggregates data with custom aggregation functions
   */
  aggregate<T>(
    data: T[],
    groupByKey: keyof T,
    aggregations: {
      [key: string]: {
        field: keyof T;
        operation: 'sum' | 'avg' | 'min' | 'max' | 'count';
      };
    }
  ): AggregationResult[] {
    const grouped = this.groupBy(data, groupByKey);
    const results: AggregationResult[] = [];

    for (const [groupValue, items] of Object.entries(grouped)) {
      const result: AggregationResult = {
        groupBy: groupValue,
        aggregations: {},
        count: items.length,
      };

      for (const [aggName, aggConfig] of Object.entries(aggregations)) {
        const values = items.map(item => item[aggConfig.field]);

        switch (aggConfig.operation) {
          case 'sum':
            result.aggregations[aggName] = (values as number[]).reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'avg':
            result.aggregations[aggName] = (values as number[]).reduce((sum, val) => sum + Number(val), 0) / values.length;
            break;
          case 'min':
            result.aggregations[aggName] = Math.min(...(values as number[]));
            break;
          case 'max':
            result.aggregations[aggName] = Math.max(...(values as number[]));
            break;
          case 'count':
            result.aggregations[aggName] = values.length;
            break;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Aggregates exchange rates by currency
   */
  aggregateExchangeRatesByCurrency(rates: ExchangeRate[]): AggregationResult[] {
    return this.aggregate(rates, 'code', {
      avgRate: { field: 'rate', operation: 'avg' },
      minRate: { field: 'rate', operation: 'min' },
      maxRate: { field: 'rate', operation: 'max' },
    });
  }

  /**
   * Creates time series data from array of values
   */
  createTimeSeries(
    values: number[],
    startDate: Date,
    intervalMs: number = 86400000 // 1 day default
  ): TimeSeriesPoint[] {
    return values.map((value, index) => ({
      timestamp: startDate.getTime() + (index * intervalMs),
      value,
      label: new Date(startDate.getTime() + (index * intervalMs)).toISOString(),
    }));
  }

  /**
   * Calculates moving average for time series
   */
  calculateMovingAverage(values: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > values.length) {
      throw new Error('Invalid window size');
    }

    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const end = i + 1;
      const window = values.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(this.round(avg, 4));
    }

    return result;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Parses Czech date format (DD.MM.YYYY) to Date object
   */
  private parseDate(dateStr: string): Date {
    const parts = dateStr.split('.');
    if (parts.length !== 3) {
      return new Date(dateStr);
    }
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  /**
   * Formats address object to string
   */
  private formatAddress(address: any): string {
    const parts = [
      address.street,
      address.postalCode,
      address.city,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Truncates text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Detects data type from file format
   */
  private detectDataType(format: string): string {
    const formatMap: { [key: string]: string } = {
      'json': 'structured',
      'csv': 'tabular',
      'xml': 'structured',
      'xlsx': 'tabular',
      'pdf': 'document',
      'txt': 'text',
      'html': 'markup',
      'geojson': 'geospatial',
      'shp': 'geospatial',
    };

    return formatMap[format.toLowerCase()] || 'unknown';
  }

  /**
   * Rounds number to specified decimal places
   */
  private round(value: number, decimals: number): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Filters outliers using IQR method
   */
  filterOutliers(values: number[], multiplier: number = 1.5): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - (multiplier * iqr);
    const upperBound = q3 + (multiplier * iqr);

    return values.filter(val => val >= lowerBound && val <= upperBound);
  }

  /**
   * Normalizes values to 0-1 range
   */
  normalizeValues(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return values.map(() => 0);
    }

    return values.map(val => (val - min) / range);
  }

  /**
   * Standardizes values (z-score normalization)
   */
  standardizeValues(values: number[]): number[] {
    const stats = this.calculateStatistics(values);

    if (stats.stdDev === 0) {
      return values.map(() => 0);
    }

    return values.map(val => (val - stats.mean) / stats.stdDev);
  }

  /**
   * Merges multiple datasets by common key
   */
  mergeDatasets<T, U>(
    dataset1: T[],
    dataset2: U[],
    key1: keyof T,
    key2: keyof U
  ): (T & U)[] {
    const merged: (T & U)[] = [];

    for (const item1 of dataset1) {
      const matchingItem = dataset2.find(item2 => item1[key1] === item2[key2]);
      if (matchingItem) {
        merged.push({ ...item1, ...matchingItem });
      }
    }

    return merged;
  }

  /**
   * Removes duplicate items from array based on key
   */
  removeDuplicates<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

  /**
   * Validates data completeness
   */
  validateDataCompleteness<T>(data: T[], requiredFields: (keyof T)[]): {
    isComplete: boolean;
    missingFields: { [key: string]: number };
    completenessScore: number;
  } {
    const missingFields: { [key: string]: number } = {};
    let totalFields = 0;
    let filledFields = 0;

    for (const item of data) {
      for (const field of requiredFields) {
        totalFields++;
        const value = item[field];

        if (value === null || value === undefined || value === '') {
          missingFields[String(field)] = (missingFields[String(field)] || 0) + 1;
        } else {
          filledFields++;
        }
      }
    }

    const completenessScore = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

    return {
      isComplete: completenessScore === 100,
      missingFields,
      completenessScore: this.round(completenessScore, 2),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DataProcessor;
