/**
 * Data Connectors for ECAI
 * Export all open data connectors for ecommerce analytics
 */

// Base connector
import { BaseConnector, ConnectorMetadata, FetchOptions, RateLimitConfig } from './base-connector.js';
export { BaseConnector };
export type { ConnectorMetadata, FetchOptions, RateLimitConfig };

// OpenFoodFacts connector
import { OpenFoodFactsConnector, NutritionData, OpenFoodFactsProduct, OpenFoodFactsResponse, SearchParams } from './open-food-facts.js';
export { OpenFoodFactsConnector };
export type { NutritionData, OpenFoodFactsProduct, OpenFoodFactsResponse, SearchParams };

// Open Prices connector
import { OpenPricesConnector, Price, PriceTrend, PriceStats, OpenPricesResponse, PriceSearchParams } from './open-prices.js';
export { OpenPricesConnector };
export type { Price, PriceTrend, PriceStats, OpenPricesResponse, PriceSearchParams };

// Product Open Data connector
import { ProductOpenDataConnector, BarcodeInfo, ProductMetadata, ProductSearchParams, ProductOpenDataResponse } from './product-open-data.js';
export { ProductOpenDataConnector };
export type { BarcodeInfo, ProductMetadata, ProductSearchParams, ProductOpenDataResponse };

// World Bank connector
import { WorldBankConnector, IndicatorValue, CountryInfo, TradeData, SupplyChainRisk, WorldBankResponse, IndicatorSearchParams } from './world-bank.js';
export { WorldBankConnector };
export type { IndicatorValue, CountryInfo, TradeData, SupplyChainRisk, WorldBankResponse, IndicatorSearchParams };

/**
 * Factory function to create all connectors
 */
export function createConnectors() {
  return {
    openFoodFacts: new OpenFoodFactsConnector(),
    openPrices: new OpenPricesConnector(),
    productOpenData: new ProductOpenDataConnector(),
    worldBank: new WorldBankConnector(),
  };
}

/**
 * Get metadata for all available connectors
 */
export function getAllConnectorMetadata(): ConnectorMetadata[] {
  const connectors = createConnectors();
  return [
    connectors.openFoodFacts.getMetadata(),
    connectors.openPrices.getMetadata(),
    connectors.productOpenData.getMetadata(),
    connectors.worldBank.getMetadata(),
  ];
}
