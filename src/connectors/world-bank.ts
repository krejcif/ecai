/**
 * World Bank Data Connector
 * Fetches economic indicators, trade data, and country risk scores
 * API Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */

import { BaseConnector, ConnectorMetadata, FetchOptions } from './base-connector';

export interface IndicatorValue {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface CountryInfo {
  id: string;
  iso2Code: string;
  name: string;
  region: {
    id: string;
    iso2code: string;
    value: string;
  };
  adminregion: {
    id: string;
    iso2code: string;
    value: string;
  };
  incomeLevel: {
    id: string;
    iso2code: string;
    value: string;
  };
  lendingType: {
    id: string;
    iso2code: string;
    value: string;
  };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

export interface TradeData {
  country: string;
  countryCode: string;
  year: string;
  indicator: string;
  value: number | null;
}

export interface SupplyChainRisk {
  country: string;
  countryCode: string;
  riskScore: number; // 0-100, higher is riskier
  factors: {
    politicalStability?: number;
    governmentEffectiveness?: number;
    riskOfConflict?: number;
    economicStability?: number;
    infrastructureQuality?: number;
  };
  indicators: IndicatorValue[];
  lastUpdated: string;
}

export interface WorldBankResponse {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  data: IndicatorValue[];
}

export interface IndicatorSearchParams {
  countryCode?: string; // ISO2 or ISO3 code, or "all"
  indicatorId: string; // e.g., "NY.GDP.MKTP.CD" for GDP
  dateFrom?: string; // Year, e.g., "2020"
  dateTo?: string; // Year, e.g., "2023"
  format?: 'json' | 'xml';
  page?: number;
  per_page?: number;
}

export class WorldBankConnector extends BaseConnector<WorldBankResponse> {
  private readonly baseUrl = 'https://api.worldbank.org/v2';

  // Common indicators for ecommerce/supply chain analysis
  public readonly INDICATORS = {
    GDP: 'NY.GDP.MKTP.CD', // GDP (current US$)
    GDP_GROWTH: 'NY.GDP.MKTP.KD.ZG', // GDP growth (annual %)
    INFLATION: 'FP.CPI.TOTL.ZG', // Inflation, consumer prices (annual %)
    UNEMPLOYMENT: 'SL.UEM.TOTL.ZS', // Unemployment, total (% of total labor force)
    EXPORTS: 'NE.EXP.GNFS.CD', // Exports of goods and services (current US$)
    IMPORTS: 'NE.IMP.GNFS.CD', // Imports of goods and services (current US$)
    TRADE_PERCENT_GDP: 'NE.TRD.GNFS.ZS', // Trade (% of GDP)
    INTERNET_USERS: 'IT.NET.USER.ZS', // Individuals using the Internet (% of population)
    MOBILE_SUBSCRIPTIONS: 'IT.CEL.SETS.P2', // Mobile cellular subscriptions (per 100 people)
    LOGISTICS_PERFORMANCE: 'LP.LPI.OVRL.XQ', // Logistics performance index: Overall (1=low to 5=high)
    EASE_DOING_BUSINESS: 'IC.BUS.EASE.XQ', // Ease of doing business score (0 = lowest to 100 = best)
    POLITICAL_STABILITY: 'PV.EST', // Political Stability and Absence of Violence/Terrorism: Estimate
    GOVERNMENT_EFFECTIVENESS: 'GE.EST', // Government Effectiveness: Estimate
    REGULATORY_QUALITY: 'RQ.EST', // Regulatory Quality: Estimate
    RULE_OF_LAW: 'RL.EST', // Rule of Law: Estimate
    CONTROL_CORRUPTION: 'CC.EST', // Control of Corruption: Estimate
  };

  constructor() {
    super({
      requestsPerSecond: 5,
      requestsPerMinute: 120,
    });
  }

  /**
   * Fetch indicator data from World Bank
   */
  async fetch(
    params: IndicatorSearchParams,
    options?: FetchOptions
  ): Promise<WorldBankResponse> {
    const {
      countryCode = 'all',
      indicatorId,
      dateFrom,
      dateTo,
      format = 'json',
      page = 1,
      per_page = 50,
    } = params;

    const dateRange = dateFrom && dateTo ? `${dateFrom}:${dateTo}` : '';

    // Build URL: /v2/country/{country}/indicator/{indicator}
    let url = `${this.baseUrl}/country/${countryCode}/indicator/${indicatorId}`;

    const queryParams: Record<string, any> = {
      format,
      page,
      per_page,
    };

    if (dateRange) {
      queryParams.date = dateRange;
    }

    url = this.buildUrl(url, queryParams);

    const rawData = await this.fetchWithRetry(url, options);
    return this.transform(rawData);
  }

  /**
   * Get economic indicators for supply chain risk assessment
   */
  async getSupplyChainRisk(
    countryCode: string,
    options?: FetchOptions
  ): Promise<SupplyChainRisk> {
    const currentYear = new Date().getFullYear();
    const indicators: IndicatorValue[] = [];

    // Fetch key indicators for risk assessment
    const riskIndicators = [
      this.INDICATORS.POLITICAL_STABILITY,
      this.INDICATORS.GOVERNMENT_EFFECTIVENESS,
      this.INDICATORS.GDP_GROWTH,
      this.INDICATORS.INFLATION,
      this.INDICATORS.LOGISTICS_PERFORMANCE,
      this.INDICATORS.EASE_DOING_BUSINESS,
    ];

    // Fetch all indicators
    for (const indicator of riskIndicators) {
      try {
        const response = await this.fetch(
          {
            countryCode,
            indicatorId: indicator,
            dateFrom: String(currentYear - 2),
            dateTo: String(currentYear),
            per_page: 10,
          },
          options
        );

        if (response.data && response.data.length > 0) {
          // Get most recent non-null value
          const latest = response.data.find(d => d.value !== null);
          if (latest) {
            indicators.push(latest);
          }
        }
      } catch (error) {
        console.error(`Error fetching indicator ${indicator}:`, error);
      }
    }

    // Calculate risk score based on indicators
    const factors = this.calculateRiskFactors(indicators);
    const riskScore = this.calculateOverallRisk(factors);

    return {
      country: indicators[0]?.country?.value || countryCode,
      countryCode: countryCode.toUpperCase(),
      riskScore,
      factors,
      indicators,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get trade data for market analysis
   */
  async getTradeData(
    countryCode: string,
    dateFrom?: string,
    dateTo?: string,
    options?: FetchOptions
  ): Promise<TradeData[]> {
    const currentYear = new Date().getFullYear();
    const from = dateFrom || String(currentYear - 5);
    const to = dateTo || String(currentYear);

    const tradeData: TradeData[] = [];

    // Fetch exports, imports, and trade % of GDP
    const tradeIndicators = [
      { id: this.INDICATORS.EXPORTS, name: 'Exports' },
      { id: this.INDICATORS.IMPORTS, name: 'Imports' },
      { id: this.INDICATORS.TRADE_PERCENT_GDP, name: 'Trade % GDP' },
    ];

    for (const { id, name } of tradeIndicators) {
      try {
        const response = await this.fetch(
          {
            countryCode,
            indicatorId: id,
            dateFrom: from,
            dateTo: to,
            per_page: 100,
          },
          options
        );

        response.data.forEach(item => {
          tradeData.push({
            country: item.country.value,
            countryCode: item.countryiso3code,
            year: item.date,
            indicator: name,
            value: item.value,
          });
        });
      } catch (error) {
        console.error(`Error fetching trade indicator ${id}:`, error);
      }
    }

    return tradeData.sort((a, b) => b.year.localeCompare(a.year));
  }

  /**
   * Get country information
   */
  async getCountryInfo(
    countryCode: string,
    options?: FetchOptions
  ): Promise<CountryInfo | null> {
    const url = this.buildUrl(`${this.baseUrl}/country/${countryCode}`, {
      format: 'json',
    });

    try {
      const rawData = await this.fetchWithRetry(url, options);

      if (Array.isArray(rawData) && rawData.length > 1 && rawData[1].length > 0) {
        return rawData[1][0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching country info:', error);
      return null;
    }
  }

  /**
   * Get multiple indicators at once
   */
  async getMultipleIndicators(
    countryCode: string,
    indicatorIds: string[],
    dateFrom?: string,
    dateTo?: string,
    options?: FetchOptions
  ): Promise<Record<string, IndicatorValue[]>> {
    const result: Record<string, IndicatorValue[]> = {};

    for (const indicatorId of indicatorIds) {
      try {
        const response = await this.fetch(
          {
            countryCode,
            indicatorId,
            dateFrom,
            dateTo,
            per_page: 100,
          },
          options
        );

        result[indicatorId] = response.data;
      } catch (error) {
        console.error(`Error fetching indicator ${indicatorId}:`, error);
        result[indicatorId] = [];
      }
    }

    return result;
  }

  /**
   * Calculate risk factors from indicators
   */
  private calculateRiskFactors(
    indicators: IndicatorValue[]
  ): SupplyChainRisk['factors'] {
    const factors: SupplyChainRisk['factors'] = {};

    indicators.forEach(indicator => {
      const id = indicator.indicator.id;
      const value = indicator.value;

      if (value === null) return;

      // Normalize values to 0-100 scale (higher = better/lower risk)
      switch (id) {
        case this.INDICATORS.POLITICAL_STABILITY:
        case this.INDICATORS.GOVERNMENT_EFFECTIVENESS:
          // These are -2.5 to 2.5, normalize to 0-100
          factors[
            id === this.INDICATORS.POLITICAL_STABILITY
              ? 'politicalStability'
              : 'governmentEffectiveness'
          ] = ((value + 2.5) / 5) * 100;
          break;

        case this.INDICATORS.LOGISTICS_PERFORMANCE:
          // LPI is 1-5, normalize to 0-100
          factors.infrastructureQuality = ((value - 1) / 4) * 100;
          break;

        case this.INDICATORS.GDP_GROWTH:
          // GDP growth: positive is good, normalize around 0-10%
          factors.economicStability = Math.min(Math.max((value / 10) * 100, 0), 100);
          break;

        case this.INDICATORS.INFLATION:
          // Low inflation is good, high is bad. Ideal around 2-3%
          const inflationScore = Math.max(0, 100 - Math.abs(value - 2.5) * 10);
          factors.economicStability =
            (factors.economicStability || 0 + inflationScore) / 2;
          break;
      }
    });

    return factors;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(factors: SupplyChainRisk['factors']): number {
    const values = Object.values(factors).filter(v => v !== undefined) as number[];

    if (values.length === 0) return 50; // Default medium risk

    // Average the factor scores and invert (higher score = lower risk)
    const avgScore = values.reduce((a, b) => a + b, 0) / values.length;

    // Invert so higher number = higher risk
    return Math.round(100 - avgScore);
  }

  /**
   * Transform raw API response to standardized format
   */
  transform(rawData: any): WorldBankResponse {
    // World Bank API returns [metadata, data]
    if (Array.isArray(rawData) && rawData.length === 2) {
      const [metadata, data] = rawData;

      return {
        page: metadata.page || 1,
        pages: metadata.pages || 1,
        per_page: metadata.per_page || 50,
        total: metadata.total || 0,
        data: data || [],
      };
    }

    // Fallback for unexpected format
    return {
      page: 1,
      pages: 1,
      per_page: 50,
      total: 0,
      data: [],
    };
  }

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: 'WorldBank',
      source: 'https://data.worldbank.org',
      version: '2.0',
      description:
        'World Bank Open Data provides access to economic indicators, trade data, and country risk metrics',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 120,
      },
    };
  }
}
