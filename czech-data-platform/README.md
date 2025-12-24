# Czech Data Platform

A comprehensive TypeScript-based data fetching and processing system for Czech government open data sources.

## Overview

This platform provides easy access to real Czech open data APIs with built-in caching, error handling, data normalization, and statistical analysis capabilities.

## Data Sources

### 1. Czech National Bank (CNB) Exchange Rates
- **URL**: https://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt
- **Data**: Daily exchange rates for 30+ currencies
- **Format**: Text (custom CNB format)
- **Update Frequency**: Daily

### 2. Czech ARES Business Registry
- **URL**: https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/
- **Data**: Company information, addresses, legal forms
- **Format**: JSON
- **Features**: Search by IČO (business ID) or company name

### 3. Prague Open Data
- **URL**: https://opendata.praha.eu
- **Data**: City datasets (transport, environment, infrastructure)
- **Format**: CKAN API (JSON)
- **Datasets**: 500+ public datasets

### 4. Czech Statistical Office (CZSO)
- **URL**: https://vdb.czso.cz/pll/eweb/package_show
- **Data**: Economic indicators, demographics, statistics
- **Format**: Proprietary API
- **Note**: Requires specific authentication and query parameters

## Installation

```bash
cd /home/user/ecai/czech-data-platform
npm install
```

## Usage

### Basic Example

```typescript
import { CzechDataFetcher, DataProcessor } from './src';

async function example() {
  const fetcher = new CzechDataFetcher();
  const processor = new DataProcessor();

  // Fetch exchange rates
  const rates = await fetcher.fetchCNBExchangeRates();
  console.log(`Fetched ${rates.length} exchange rates`);

  // Get specific currency
  const eurRate = await fetcher.getExchangeRate('EUR');
  console.log(`1 EUR = ${eurRate.rate} CZK`);

  // Convert currencies
  const czk = await fetcher.convertToCZK(100, 'USD');
  console.log(`100 USD = ${czk.toFixed(2)} CZK`);

  // Analyze data
  const stats = processor.analyzeExchangeRates(rates);
  console.log('Statistics:', stats.overall);
}
```

### Running the Demo

```bash
npm run demo
```

This will demonstrate all features:
- Fetching CNB exchange rates
- Fetching business information from ARES
- Fetching Prague Open Data datasets
- Statistical analysis
- Data aggregation
- Data quality validation

## API Reference

### CzechDataFetcher

#### Methods

##### `fetchCNBExchangeRates(): Promise<ExchangeRate[]>`
Fetches current exchange rates from CNB.

**Returns**: Array of exchange rate objects
```typescript
{
  country: string;
  currency: string;
  amount: number;
  code: string;
  rate: number;
  date: string;
}
```

##### `fetchBusinessInfo(ico: string): Promise<BusinessInfo | null>`
Fetches business information from ARES registry.

**Parameters**:
- `ico`: Czech business identification number (IČO)

**Returns**: Business information object or null if not found

##### `searchBusinesses(query: string, limit?: number): Promise<BusinessInfo[]>`
Search for businesses by name.

**Parameters**:
- `query`: Search query
- `limit`: Maximum number of results (default: 10)

##### `fetchPragueDatasets(limit?: number): Promise<PragueDataset[]>`
Fetches datasets from Prague Open Data portal.

**Parameters**:
- `limit`: Maximum number of datasets (default: 20)

##### `fetchPragueTransportData(): Promise<any>`
Fetches transport-related datasets from Prague.

##### `getExchangeRate(currencyCode: string): Promise<ExchangeRate | null>`
Gets exchange rate for specific currency.

##### `convertToCZK(amount: number, currencyCode: string): Promise<number>`
Converts foreign currency to CZK.

##### `convertFromCZK(amount: number, currencyCode: string): Promise<number>`
Converts CZK to foreign currency.

##### `clearCache(): void`
Clears all cached data.

### DataProcessor

#### Methods

##### `normalizeExchangeRates(rates: ExchangeRate[]): NormalizedData`
Normalizes exchange rate data to standard format.

##### `normalizeBusinessInfo(businesses: BusinessInfo[]): NormalizedData`
Normalizes business information data.

##### `normalizePragueDatasets(datasets: PragueDataset[]): NormalizedData`
Normalizes Prague Open Data datasets.

##### `calculateStatistics(values: number[]): StatisticalSummary`
Calculates comprehensive statistics for numeric array.

**Returns**:
```typescript
{
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  count: number;
}
```

##### `analyzeExchangeRates(rates: ExchangeRate[]): object`
Analyzes exchange rate statistics overall and by currency.

##### `calculatePercentile(values: number[], percentile: number): number`
Calculates percentile value.

##### `calculateCorrelation(x: number[], y: number[]): number`
Calculates correlation coefficient between two datasets.

##### `aggregate<T>(data, groupByKey, aggregations): AggregationResult[]`
Aggregates data with custom aggregation functions.

##### `groupBy<T>(array: T[], key: keyof T): object`
Groups array of objects by specific key.

##### `calculateMovingAverage(values: number[], windowSize: number): number[]`
Calculates moving average for time series.

##### `filterOutliers(values: number[], multiplier?: number): number[]`
Filters outliers using IQR method.

##### `normalizeValues(values: number[]): number[]`
Normalizes values to 0-1 range.

##### `standardizeValues(values: number[]): number[]`
Standardizes values (z-score normalization).

##### `validateDataCompleteness<T>(data, requiredFields): object`
Validates data completeness and returns report.

## Features

### Caching
- Automatic caching with configurable expiration times
- CNB rates: 1 hour cache
- Business info: 24 hour cache
- Prague datasets: 6 hour cache

### Error Handling
- Comprehensive error handling with detailed logging
- Graceful fallback for missing data
- HTTP error status handling

### Data Processing
- Statistical analysis (mean, median, mode, std dev, etc.)
- Data normalization and standardization
- Outlier detection and removal
- Moving averages
- Correlation analysis
- Data aggregation and grouping

### Data Quality
- Completeness validation
- Duplicate removal
- Data merging capabilities

## Project Structure

```
/home/user/ecai/czech-data-platform/
├── src/
│   ├── data/
│   │   ├── czechDataFetcher.ts    # Main data fetching logic
│   │   └── dataProcessor.ts       # Data processing utilities
│   ├── examples/
│   │   └── demo.ts                # Demonstration script
│   └── index.ts                   # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Sample Data Structures

### Exchange Rate
```json
{
  "country": "EMU",
  "currency": "euro",
  "amount": 1,
  "code": "EUR",
  "rate": 25.135,
  "date": "24.12.2025"
}
```

### Business Info
```json
{
  "ico": "70994226",
  "name": "České dráhy, a.s.",
  "legalForm": "Akciová společnost",
  "address": {
    "street": "Nábřeží Ludvíka Svobody 1222",
    "city": "Praha",
    "postalCode": "110 15",
    "country": "Česká republika"
  },
  "status": "Aktivní",
  "registrationDate": "2003-07-01"
}
```

### Prague Dataset
```json
{
  "id": "dataset-123",
  "title": "Jízdní řády MHD",
  "description": "Public transport schedules",
  "organization": "Hlavní město Praha",
  "resources": [
    {
      "id": "resource-456",
      "url": "https://...",
      "format": "GTFS",
      "name": "GTFS feed"
    }
  ]
}
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run demo` - Run the demonstration script
- `npm run dev` - Run demo with ts-node
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## License

ISC

## Contributing

This is part of the ECAI Czech Data Platform project.
