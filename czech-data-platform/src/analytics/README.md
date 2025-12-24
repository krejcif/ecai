# Czech Data Platform - AI Analytics Engine

> **Agent 2 - AI Analytics Engine**
> Intelligent analytics system for processing Czech open data and providing actionable insights

## 📋 Overview

This analytics engine provides comprehensive AI-powered analysis of Czech economic data, including:
- **Exchange Rate Analytics**: CZK trend analysis, volatility detection, and rate predictions
- **Business Intelligence**: Company data analysis, industry trends, and regional economic indicators
- **Automated Reporting**: Daily economic reports and currency alerts
- **AI Advisory**: Investment timing suggestions and natural language market summaries

## 🏗️ Architecture

The analytics system is organized into three main modules:

```
src/analytics/
├── insightEngine.ts      # Core analytics and data processing
├── reportGenerator.ts    # Report generation and alerts
├── aiAdvisor.ts         # AI-powered recommendations
└── index.ts             # Module exports
```

## 📦 Core Components

### 1. Insight Engine (`insightEngine.ts`)

#### `CzechEconomyAnalyzer`
Analyzes Czech exchange rate data and provides economic insights.

**Key Methods:**
- `addRateData(currency, rate)` - Adds exchange rate data to historical dataset
- `analyzeExchangeRateTrends(currency, days)` - Analyzes trends (bullish/bearish/neutral)
- `detectVolatilityPatterns(currency, days)` - Detects volatility patterns (low/medium/high)
- `predictExchangeRate(currency, timeHorizon)` - Predicts future rates (24h, 7d, 30d)

**Example:**
```typescript
import { CzechEconomyAnalyzer } from './analytics/insightEngine';

const analyzer = new CzechEconomyAnalyzer();

// Add historical data
analyzer.addRateData('EUR', {
  currency: 'EUR',
  rate: 25.05,
  timestamp: new Date()
});

// Analyze 30-day trend
const trend = analyzer.analyzeExchangeRateTrends('EUR', 30);
console.log(`Trend: ${trend.direction}, Strength: ${trend.strength}%`);

// Predict future rate
const prediction = analyzer.predictExchangeRate('EUR', '7d');
console.log(`Predicted rate in 7 days: ${prediction.predictedRate}`);
```

#### `BusinessIntelligence`
Analyzes Czech company data for business insights.

**Key Methods:**
- `addCompanyData(company)` - Adds company to the dataset
- `bulkAddCompanies(companies)` - Adds multiple companies at once
- `analyzeCompanyData()` - Returns comprehensive company statistics
- `identifyIndustryTrends(industry)` - Analyzes specific industry trends
- `computeRegionalDensity(region, population)` - Calculates regional economic indicators

**Example:**
```typescript
import { BusinessIntelligence } from './analytics/insightEngine';

const bi = new BusinessIntelligence();

// Add company data
bi.addCompanyData({
  ico: '12345678',
  name: 'Tech Corp',
  industry: 'IT',
  region: 'Praha',
  employees: 150,
  revenue: 25000000,
  foundedYear: 2015
});

// Analyze industry
const trend = bi.identifyIndustryTrends('IT');
console.log(`IT sector growth: ${trend.growthRate}%`);

// Analyze region
const density = bi.computeRegionalDensity('Praha', 1300000);
console.log(`Prague economic score: ${density.economicScore}/100`);
```

### 2. Report Generator (`reportGenerator.ts`)

#### `DailyEconomicReportGenerator`
Generates comprehensive daily economic reports.

**Key Methods:**
- `generateDailyReport(data)` - Creates a daily economic report
- `formatReportAsText(report)` - Formats report as readable text

**Example:**
```typescript
import { DailyEconomicReportGenerator } from './analytics/reportGenerator';

const generator = new DailyEconomicReportGenerator();

const report = generator.generateDailyReport({
  exchangeRates: ratesMap,
  trends: trendsMap,
  predictions: predictionsArray,
  volatilityPatterns: volatilityMap
});

const formattedReport = generator.formatReportAsText(report);
console.log(formattedReport);
```

#### `CurrencyAlertSystem`
Monitors exchange rates and generates alerts for significant changes.

**Key Methods:**
- `checkRateChange(currency, rate)` - Checks for significant rate changes
- `createVolatilityAlert(currency, pattern, normalVolatility)` - Creates volatility alerts
- `createTrendReversalAlert(...)` - Creates trend reversal alerts
- `getAlerts(options)` - Retrieves alerts with filtering

**Example:**
```typescript
import { CurrencyAlertSystem } from './analytics/reportGenerator';

const alertSystem = new CurrencyAlertSystem({
  rateChangePercent: 2.0,  // Alert on 2% change
  volatilityMultiplier: 2.0,
  trendReversalConfidence: 0.75
});

// Check for alerts
const alerts = alertSystem.checkRateChange('EUR', 25.50);
alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`);
});
```

#### `TrendVisualization`
Formats data for chart visualization.

**Key Methods:**
- `formatExchangeRateChart(rates, options)` - Formats exchange rate data for charts
- `formatIndustryTrendChart(trends)` - Formats industry data for bar charts
- `formatRegionalDensityChart(densities)` - Formats regional data for visualization
- `formatVolatilityChart(patterns)` - Formats volatility data for area charts

**Example:**
```typescript
import { TrendVisualization } from './analytics/reportGenerator';

const viz = new TrendVisualization();

const chartData = viz.formatExchangeRateChart(ratesMap, {
  currencies: ['EUR', 'USD'],
  days: 30,
  showMovingAverage: true
});

// Use chartData with your favorite charting library
```

### 3. AI Advisor (`aiAdvisor.ts`)

#### `CzechMarketAdvisor`
Provides intelligent investment and currency exchange recommendations.

**Key Methods:**
- `updateContext(context)` - Updates market data context
- `suggestInvestmentTiming(currency, amount)` - Provides investment timing suggestions
- `identifyExchangeWindows(currency, amount)` - Identifies optimal exchange windows
- `generateMarketSummary()` - Creates comprehensive market summary
- `generateConversationalUpdate()` - Generates natural language market update

**Example:**
```typescript
import { CzechMarketAdvisor, createSampleAdvisor } from './analytics/aiAdvisor';

// Create advisor with sample data
const advisor = createSampleAdvisor();

// Get investment timing
const timing = advisor.suggestInvestmentTiming('EUR', 100000);
console.log(`Action: ${timing.action}`);
console.log(`Confidence: ${(timing.confidence * 100).toFixed(1)}%`);
console.log(`Risk: ${timing.riskLevel}`);

// Get exchange window
const window = advisor.identifyExchangeWindows('EUR', 50000);
console.log(window.recommendation);

// Get conversational update
const update = advisor.generateConversationalUpdate();
console.log(update);
```

## 🎯 Key Features

### Exchange Rate Analysis
- **Trend Detection**: Identifies bullish, bearish, or neutral trends
- **Volatility Analysis**: Classifies market volatility (low/medium/high)
- **Rate Prediction**: Forecasts exchange rates for 24h, 7d, and 30d horizons
- **Confidence Scoring**: Provides confidence levels for all predictions

### Business Intelligence
- **Company Analytics**: Analyzes company distribution by industry and region
- **Industry Trends**: Identifies growth rates and market sentiment
- **Regional Analysis**: Computes business density and economic scores
- **Caching**: Intelligent caching for improved performance

### Automated Reporting
- **Daily Reports**: Comprehensive daily economic summaries
- **Alert System**: Real-time alerts for significant rate changes
- **Visualization Data**: Chart-ready data for all metrics
- **Multiple Formats**: Text, JSON, and visualization-ready outputs

### AI Advisory
- **Investment Timing**: Buy/sell/hold recommendations with reasoning
- **Exchange Windows**: Optimal currency exchange timing
- **Risk Assessment**: Automatic risk level classification
- **Natural Language**: Conversational market updates and summaries

## 📊 Sample Output Formats

### Trend Analysis Output
```typescript
{
  direction: 'bullish',
  strength: 65,              // 0-100
  confidence: 0.75,          // 0-1
  timeframe: '30d',
  indicators: {
    movingAverage: 25.1,
    volatility: 0.15,
    momentum: 0.2
  }
}
```

### Prediction Output
```typescript
{
  currency: 'EUR',
  currentRate: 25.05,
  predictedRate: 25.35,
  timeHorizon: '7d',
  confidence: 0.78,
  factors: [
    'Bullish trend with 65% strength',
    'Low volatility (σ=0.15)',
    'Positive momentum: +0.2'
  ]
}
```

### Investment Timing Output
```typescript
{
  action: 'buy',
  currency: 'EUR',
  confidence: 0.76,
  reasoning: [
    'EUR shows favorable conditions for investment',
    'Bullish trend with 65% strength',
    'Market volatility is low'
  ],
  optimalTimeframe: '1-2 weeks recommended',
  expectedReturn: 1.2,       // Percentage
  riskLevel: 'low'
}
```

### Alert Output
```typescript
{
  id: 'alert_1234567890_abc123',
  timestamp: Date,
  currency: 'EUR',
  alertType: 'rate_spike',
  severity: 'warning',
  message: 'EUR rate increased by 2.5% to 25.625',
  currentRate: 25.625,
  threshold: 2.0,
  metadata: {
    changePercent: 2.5,
    previousRate: 25.00
  }
}
```

## 🚀 Running the Demo

```bash
# Install dependencies
cd /home/user/ecai/czech-data-platform
npm install

# Run comprehensive analytics demo
npm run demo:analytics
```

The demo showcases:
1. Exchange rate trend analysis
2. Business intelligence analytics
3. Daily economic report generation
4. Currency alert system
5. Trend visualization data formatting
6. AI market advisor recommendations

## 🔧 Configuration

### Alert Thresholds
```typescript
const alertSystem = new CurrencyAlertSystem({
  rateChangePercent: 2.0,        // Alert on 2% change
  volatilityMultiplier: 2.0,      // Alert on 2x normal volatility
  trendReversalConfidence: 0.75   // 75% confidence for reversals
});
```

### User Profile (for AI Advisor)
```typescript
const context: AdvisorContext = {
  userProfile: {
    riskTolerance: 'moderate',      // conservative, moderate, aggressive
    investmentHorizon: 'medium',    // short, medium, long
    preferredCurrencies: ['EUR', 'USD']
  },
  marketData: { /* ... */ }
};
```

## 📈 Performance Characteristics

- **Exchange Rate Analysis**: O(n) where n = number of data points
- **Volatility Detection**: O(n) with statistical calculations
- **Prediction**: O(n) with trend analysis
- **Business Intelligence**: O(n) with intelligent caching
- **Report Generation**: O(m) where m = number of currencies
- **Alert System**: O(1) for rate checks, O(n) for retrievals

## 🔍 Type Safety

All modules are written in TypeScript with full type definitions:
- Strict type checking enabled
- Comprehensive interfaces for all data structures
- JSDoc comments for all public methods
- Type exports for easy integration

## 📝 License

Part of the Czech Data Platform - MIT License

## 👥 Credits

**Agent 2 - AI Analytics Engine**
Built as part of the multi-agent Czech Open Data Platform project

---

For more information, see the main project README at `/home/user/ecai/czech-data-platform/README.md`
