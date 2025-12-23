/**
 * Geographic Risk Analyzer
 * Assesses country-level risks including political stability, natural disasters, and currency volatility
 */

export interface CountryRiskData {
  countryCode: string;
  countryName: string;
  region: string;
  politicalStabilityIndex: number;  // -2.5 to 2.5 (World Bank scale)
  governmentEffectiveness: number;   // -2.5 to 2.5
  regulatoryQuality: number;         // -2.5 to 2.5
  ruleOfLaw: number;                 // -2.5 to 2.5
  corruptionControl: number;         // -2.5 to 2.5
}

export interface NaturalDisasterRisk {
  countryCode: string;
  earthquakeRisk: number;      // 0-100
  floodRisk: number;           // 0-100
  hurricaneRisk: number;       // 0-100
  tsunamiRisk: number;         // 0-100
  droughtRisk: number;         // 0-100
  overallRisk: number;         // 0-100
  historicalIncidents: number; // Count in last 10 years
}

export interface CurrencyRiskData {
  currencyCode: string;
  volatility30d: number;       // Standard deviation of daily returns
  volatility90d: number;
  volatility1y: number;
  inflation: number;           // Annual inflation rate
  exchangeRateStability: number; // 0-100 (higher = more stable)
  lastUpdated: string;
}

export interface GeoPoliticalEvent {
  eventType: 'conflict' | 'sanction' | 'trade_dispute' | 'political_change' | 'natural_disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedCountries: string[];
  description: string;
  startDate: string;
  endDate?: string;
  impactScore: number;         // 0-100
}

export interface GeoRiskAssessment {
  countryCode: string;
  countryName: string;
  overallGeoRisk: number;      // 0-100
  components: {
    politicalRisk: number;
    naturalDisasterRisk: number;
    currencyRisk: number;
    infrastructureRisk: number;
    conflictRisk: number;
  };
  activeEvents: GeoPoliticalEvent[];
  riskTrend: 'improving' | 'stable' | 'deteriorating';
  assessedAt: string;
}

export class GeoRiskAnalyzer {
  private countryDataCache: Map<string, CountryRiskData> = new Map();
  private disasterDataCache: Map<string, NaturalDisasterRisk> = new Map();
  private currencyDataCache: Map<string, CurrencyRiskData> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  /**
   * Initialize with sample data from World Bank and other sources
   * In production, this would fetch from actual APIs
   */
  private initializeDefaultData(): void {
    // Sample data for common countries
    const sampleCountries: CountryRiskData[] = [
      {
        countryCode: 'US',
        countryName: 'United States',
        region: 'North America',
        politicalStabilityIndex: 0.5,
        governmentEffectiveness: 1.5,
        regulatoryQuality: 1.6,
        ruleOfLaw: 1.6,
        corruptionControl: 1.4
      },
      {
        countryCode: 'CN',
        countryName: 'China',
        region: 'East Asia',
        politicalStabilityIndex: 0.1,
        governmentEffectiveness: 0.5,
        regulatoryQuality: -0.3,
        ruleOfLaw: -0.4,
        corruptionControl: -0.5
      },
      {
        countryCode: 'DE',
        countryName: 'Germany',
        region: 'Europe',
        politicalStabilityIndex: 0.8,
        governmentEffectiveness: 1.6,
        regulatoryQuality: 1.5,
        ruleOfLaw: 1.6,
        corruptionControl: 1.8
      },
      {
        countryCode: 'IN',
        countryName: 'India',
        region: 'South Asia',
        politicalStabilityIndex: -0.8,
        governmentEffectiveness: 0.1,
        regulatoryQuality: -0.2,
        ruleOfLaw: 0.1,
        corruptionControl: -0.3
      },
      {
        countryCode: 'VN',
        countryName: 'Vietnam',
        region: 'Southeast Asia',
        politicalStabilityIndex: 0.3,
        governmentEffectiveness: 0.2,
        regulatoryQuality: -0.4,
        ruleOfLaw: -0.5,
        corruptionControl: -0.5
      }
    ];

    sampleCountries.forEach(country => {
      this.countryDataCache.set(country.countryCode, country);
    });
  }

  /**
   * Assess comprehensive geographic risk for a country
   */
  async assessCountryRisk(countryCode: string): Promise<GeoRiskAssessment> {
    const countryData = await this.getCountryData(countryCode);
    const disasterData = await this.getNaturalDisasterRisk(countryCode);
    const currencyData = await this.getCurrencyRisk(countryData.countryName);
    const activeEvents = await this.getActiveEvents(countryCode);

    const components = {
      politicalRisk: this.calculatePoliticalRisk(countryData),
      naturalDisasterRisk: disasterData.overallRisk,
      currencyRisk: this.calculateCurrencyRiskScore(currencyData),
      infrastructureRisk: this.estimateInfrastructureRisk(countryCode),
      conflictRisk: this.calculateConflictRisk(activeEvents)
    };

    const overallGeoRisk = this.aggregateGeoRisk(components);
    const riskTrend = this.assessRiskTrend(countryCode, activeEvents);

    return {
      countryCode,
      countryName: countryData.countryName,
      overallGeoRisk,
      components,
      activeEvents,
      riskTrend,
      assessedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate political risk from World Bank Governance Indicators
   * Converts -2.5 to 2.5 scale to 0-100 risk scale (higher = riskier)
   */
  calculatePoliticalRisk(countryData: CountryRiskData): number {
    // Average the governance indicators
    const avgGovernance = (
      countryData.politicalStabilityIndex +
      countryData.governmentEffectiveness +
      countryData.regulatoryQuality +
      countryData.ruleOfLaw +
      countryData.corruptionControl
    ) / 5;

    // Convert from -2.5 to 2.5 scale to 0-100 risk scale
    // -2.5 (worst) = 100 risk, 2.5 (best) = 0 risk
    const riskScore = ((2.5 - avgGovernance) / 5) * 100;

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Get natural disaster risk data for a country
   */
  async getNaturalDisasterRisk(countryCode: string): Promise<NaturalDisasterRisk> {
    // Check cache
    if (this.disasterDataCache.has(countryCode)) {
      return this.disasterDataCache.get(countryCode)!;
    }

    // Sample data - in production, fetch from EM-DAT or similar database
    const disasterRisk: NaturalDisasterRisk = {
      countryCode,
      earthquakeRisk: this.getDisasterRiskByType(countryCode, 'earthquake'),
      floodRisk: this.getDisasterRiskByType(countryCode, 'flood'),
      hurricaneRisk: this.getDisasterRiskByType(countryCode, 'hurricane'),
      tsunamiRisk: this.getDisasterRiskByType(countryCode, 'tsunami'),
      droughtRisk: this.getDisasterRiskByType(countryCode, 'drought'),
      overallRisk: 0,
      historicalIncidents: this.getHistoricalIncidentCount(countryCode)
    };

    // Calculate overall risk (weighted average)
    disasterRisk.overallRisk = (
      disasterRisk.earthquakeRisk * 0.25 +
      disasterRisk.floodRisk * 0.25 +
      disasterRisk.hurricaneRisk * 0.20 +
      disasterRisk.tsunamiRisk * 0.15 +
      disasterRisk.droughtRisk * 0.15
    );

    this.disasterDataCache.set(countryCode, disasterRisk);
    return disasterRisk;
  }

  /**
   * Get disaster risk by type for specific country
   */
  private getDisasterRiskByType(countryCode: string, type: string): number {
    // Simplified risk mapping - in production, use actual geological data
    const riskMap: Record<string, Record<string, number>> = {
      'US': { earthquake: 40, flood: 30, hurricane: 50, tsunami: 20, drought: 30 },
      'CN': { earthquake: 60, flood: 70, hurricane: 40, tsunami: 30, drought: 40 },
      'JP': { earthquake: 80, flood: 60, hurricane: 70, tsunami: 90, drought: 20 },
      'DE': { earthquake: 10, flood: 40, hurricane: 10, tsunami: 5, drought: 20 },
      'IN': { earthquake: 50, flood: 80, hurricane: 60, tsunami: 40, drought: 50 },
      'VN': { earthquake: 40, flood: 70, hurricane: 80, tsunami: 50, drought: 30 }
    };

    return riskMap[countryCode]?.[type] ?? 30; // Default medium risk
  }

  /**
   * Get historical incident count
   */
  private getHistoricalIncidentCount(countryCode: string): number {
    // Sample data - in production, query EM-DAT database
    const incidentMap: Record<string, number> = {
      'US': 156,
      'CN': 234,
      'JP': 189,
      'DE': 45,
      'IN': 312,
      'VN': 178
    };

    return incidentMap[countryCode] ?? 50;
  }

  /**
   * Get currency risk data
   */
  async getCurrencyRisk(currencyCode: string): Promise<CurrencyRiskData> {
    // Check cache
    if (this.currencyDataCache.has(currencyCode)) {
      return this.currencyDataCache.get(currencyCode)!;
    }

    // Sample data - in production, fetch from forex APIs
    const currencyData: CurrencyRiskData = {
      currencyCode,
      volatility30d: Math.random() * 5,      // 0-5% daily volatility
      volatility90d: Math.random() * 7,
      volatility1y: Math.random() * 10,
      inflation: this.getInflationRate(currencyCode),
      exchangeRateStability: this.calculateExchangeRateStability(currencyCode),
      lastUpdated: new Date().toISOString()
    };

    this.currencyDataCache.set(currencyCode, currencyData);
    return currencyData;
  }

  /**
   * Calculate currency risk score
   */
  private calculateCurrencyRiskScore(currencyData: CurrencyRiskData): number {
    let riskScore = 0;

    // Volatility component (0-40 points)
    const avgVolatility = (currencyData.volatility30d + currencyData.volatility90d + currencyData.volatility1y) / 3;
    riskScore += Math.min(40, avgVolatility * 4);

    // Inflation component (0-30 points)
    if (currencyData.inflation > 10) {
      riskScore += 30;
    } else if (currencyData.inflation > 5) {
      riskScore += 20;
    } else if (currencyData.inflation > 3) {
      riskScore += 10;
    }

    // Exchange rate stability (0-30 points, inverted)
    riskScore += (100 - currencyData.exchangeRateStability) * 0.3;

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Get inflation rate for currency
   */
  private getInflationRate(currencyCode: string): number {
    const inflationMap: Record<string, number> = {
      'USD': 3.2,
      'EUR': 2.8,
      'CNY': 2.1,
      'JPY': 1.5,
      'INR': 5.4,
      'VND': 3.8
    };

    return inflationMap[currencyCode] ?? 3.0;
  }

  /**
   * Calculate exchange rate stability
   */
  private calculateExchangeRateStability(currencyCode: string): number {
    const stabilityMap: Record<string, number> = {
      'USD': 95,
      'EUR': 90,
      'CNY': 75,
      'JPY': 85,
      'INR': 65,
      'VND': 60
    };

    return stabilityMap[currencyCode] ?? 70;
  }

  /**
   * Estimate infrastructure risk
   */
  private estimateInfrastructureRisk(countryCode: string): number {
    // Based on World Bank Logistics Performance Index
    const infraScoreMap: Record<string, number> = {
      'US': 15,
      'DE': 10,
      'CN': 25,
      'JP': 12,
      'IN': 45,
      'VN': 40
    };

    return infraScoreMap[countryCode] ?? 50;
  }

  /**
   * Get active geopolitical events
   */
  async getActiveEvents(countryCode: string): Promise<GeoPoliticalEvent[]> {
    // In production, this would query a geopolitical events database
    const sampleEvents: GeoPoliticalEvent[] = [];

    // Add relevant events based on country
    if (countryCode === 'CN') {
      sampleEvents.push({
        eventType: 'trade_dispute',
        severity: 'medium',
        affectedCountries: ['CN', 'US'],
        description: 'Ongoing trade tensions and tariffs',
        startDate: '2024-01-01',
        impactScore: 35
      });
    }

    return sampleEvents;
  }

  /**
   * Calculate conflict risk from active events
   */
  private calculateConflictRisk(events: GeoPoliticalEvent[]): number {
    if (events.length === 0) return 0;

    const severityMap = {
      'low': 10,
      'medium': 30,
      'high': 60,
      'critical': 90
    };

    const maxSeverity = Math.max(
      ...events.map(e => severityMap[e.severity])
    );

    return maxSeverity;
  }

  /**
   * Aggregate component risks into overall geo risk
   */
  private aggregateGeoRisk(components: {
    politicalRisk: number;
    naturalDisasterRisk: number;
    currencyRisk: number;
    infrastructureRisk: number;
    conflictRisk: number;
  }): number {
    const weights = {
      political: 0.30,
      disaster: 0.20,
      currency: 0.20,
      infrastructure: 0.15,
      conflict: 0.15
    };

    return (
      components.politicalRisk * weights.political +
      components.naturalDisasterRisk * weights.disaster +
      components.currencyRisk * weights.currency +
      components.infrastructureRisk * weights.infrastructure +
      components.conflictRisk * weights.conflict
    );
  }

  /**
   * Assess risk trend
   */
  private assessRiskTrend(
    countryCode: string,
    events: GeoPoliticalEvent[]
  ): 'improving' | 'stable' | 'deteriorating' {
    // Simple heuristic based on recent critical events
    const recentCriticalEvents = events.filter(
      e => e.severity === 'critical' || e.severity === 'high'
    );

    if (recentCriticalEvents.length > 2) {
      return 'deteriorating';
    } else if (recentCriticalEvents.length === 0) {
      return 'improving';
    }

    return 'stable';
  }

  /**
   * Get country data from cache or load default
   */
  private async getCountryData(countryCode: string): Promise<CountryRiskData> {
    if (this.countryDataCache.has(countryCode)) {
      return this.countryDataCache.get(countryCode)!;
    }

    // Return default data for unknown countries
    return {
      countryCode,
      countryName: countryCode,
      region: 'Unknown',
      politicalStabilityIndex: 0,
      governmentEffectiveness: 0,
      regulatoryQuality: 0,
      ruleOfLaw: 0,
      corruptionControl: 0
    };
  }

  /**
   * Compare geographic risk between two countries
   */
  compareCountries(
    assessment1: GeoRiskAssessment,
    assessment2: GeoRiskAssessment
  ): {
    lowerRiskCountry: string;
    riskDifference: number;
    componentComparison: Record<string, number>;
  } {
    const riskDiff = assessment2.overallGeoRisk - assessment1.overallGeoRisk;

    return {
      lowerRiskCountry: riskDiff > 0 ? assessment1.countryCode : assessment2.countryCode,
      riskDifference: Math.abs(riskDiff),
      componentComparison: {
        political: assessment2.components.politicalRisk - assessment1.components.politicalRisk,
        disaster: assessment2.components.naturalDisasterRisk - assessment1.components.naturalDisasterRisk,
        currency: assessment2.components.currencyRisk - assessment1.components.currencyRisk,
        infrastructure: assessment2.components.infrastructureRisk - assessment1.components.infrastructureRisk,
        conflict: assessment2.components.conflictRisk - assessment1.components.conflictRisk
      }
    };
  }
}
