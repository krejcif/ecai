/**
 * Analytics Demo - Comprehensive demonstration of AI-powered analytics
 * Shows how to use the Insight Engine, Report Generator, and AI Advisor
 */

import {
  CzechEconomyAnalyzer,
  BusinessIntelligence,
  ExchangeRate,
  CompanyData
} from '../analytics/insightEngine';

import {
  DailyEconomicReportGenerator,
  CurrencyAlertSystem,
  TrendVisualization
} from '../analytics/reportGenerator';

import {
  CzechMarketAdvisor,
  createSampleAdvisor
} from '../analytics/aiAdvisor';

// ===== DEMO: EXCHANGE RATE ANALYSIS =====

function demonstrateExchangeRateAnalysis() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 1: EXCHANGE RATE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const analyzer = new CzechEconomyAnalyzer();

  // Generate sample EUR exchange rate data (last 60 days)
  console.log('📊 Generating sample EUR/CZK exchange rate data...\n');

  const now = new Date();
  for (let i = 60; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate realistic exchange rate with trend and volatility
    const baseRate = 25.0;
    const trend = -i * 0.002; // Slight downward trend
    const seasonality = Math.sin(i / 10) * 0.2;
    const randomness = (Math.random() - 0.5) * 0.15;
    const rate = baseRate + trend + seasonality + randomness;

    analyzer.addRateData('EUR', {
      currency: 'EUR',
      rate,
      timestamp: date
    });
  }

  // Analyze trends
  console.log('🔍 Analyzing 30-day trend...\n');
  const trend = analyzer.analyzeExchangeRateTrends('EUR', 30);

  console.log(`Trend Direction: ${trend.direction.toUpperCase()}`);
  console.log(`Trend Strength: ${trend.strength.toFixed(2)}%`);
  console.log(`Confidence: ${(trend.confidence * 100).toFixed(1)}%`);
  console.log(`Timeframe: ${trend.timeframe}`);
  console.log('\nIndicators:');
  console.log(`  - Moving Average: ${trend.indicators.movingAverage?.toFixed(4)}`);
  console.log(`  - Volatility: ${trend.indicators.volatility?.toFixed(4)}`);
  console.log(`  - Momentum: ${trend.indicators.momentum?.toFixed(4)}`);

  // Detect volatility patterns
  console.log('\n⚡ Detecting volatility patterns...\n');
  const volatility = analyzer.detectVolatilityPatterns('EUR', 30);

  console.log(`Volatility Type: ${volatility.type.toUpperCase()}`);
  console.log(`Standard Deviation: ${volatility.stdDeviation.toFixed(4)}`);
  console.log(`Rate Range: ${volatility.range.min.toFixed(4)} - ${volatility.range.max.toFixed(4)}`);
  console.log(`Average Daily Change: ${volatility.avgChange.toFixed(4)}`);

  // Predict future rates
  console.log('\n🔮 Predicting exchange rates...\n');

  const predictions = {
    '24h': analyzer.predictExchangeRate('EUR', '24h'),
    '7d': analyzer.predictExchangeRate('EUR', '7d'),
    '30d': analyzer.predictExchangeRate('EUR', '30d')
  };

  for (const [horizon, prediction] of Object.entries(predictions)) {
    const change = ((prediction.predictedRate - prediction.currentRate) / prediction.currentRate * 100);
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';

    console.log(`${horizon.padEnd(5)} prediction:`);
    console.log(`  Current: ${prediction.currentRate.toFixed(4)}`);
    console.log(`  Predicted: ${prediction.predictedRate.toFixed(4)} ${arrow} ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
    console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`  Factors: ${prediction.factors.join(', ')}`);
    console.log('');
  }
}

// ===== DEMO: BUSINESS INTELLIGENCE =====

function demonstrateBusinessIntelligence() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 2: BUSINESS INTELLIGENCE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const bi = new BusinessIntelligence();

  // Generate sample company data
  console.log('🏢 Loading sample Czech company data...\n');

  const industries = ['IT', 'Manufacturing', 'Finance', 'Retail', 'Healthcare'];
  const regions = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec'];

  const sampleCompanies: CompanyData[] = [];
  for (let i = 0; i < 500; i++) {
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];

    sampleCompanies.push({
      ico: `${10000000 + i}`,
      name: `Company ${i + 1}`,
      industry,
      region,
      employees: Math.floor(Math.random() * 500) + 10,
      revenue: Math.floor(Math.random() * 10000000) + 100000,
      foundedYear: 2010 + Math.floor(Math.random() * 15)
    });
  }

  bi.bulkAddCompanies(sampleCompanies);

  // Analyze company data
  console.log('📈 Analyzing company distribution...\n');
  const analysis = bi.analyzeCompanyData();

  console.log(`Total Companies: ${analysis.totalCompanies}`);
  console.log(`Average Employees: ${analysis.avgEmployees.toFixed(0)}`);
  console.log(`Average Revenue: ${(analysis.avgRevenue / 1000000).toFixed(2)}M CZK`);

  console.log('\nCompanies by Industry:');
  Object.entries(analysis.byIndustry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([industry, count]) => {
      const bar = '█'.repeat(Math.floor(count / 5));
      console.log(`  ${industry.padEnd(15)}: ${count.toString().padStart(3)} ${bar}`);
    });

  console.log('\nCompanies by Region:');
  Object.entries(analysis.byRegion)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      const bar = '█'.repeat(Math.floor(count / 5));
      console.log(`  ${region.padEnd(15)}: ${count.toString().padStart(3)} ${bar}`);
    });

  // Analyze industry trends
  console.log('\n\n📊 Industry Trend Analysis...\n');

  for (const industry of industries.slice(0, 3)) {
    const trend = bi.identifyIndustryTrends(industry);

    console.log(`${industry}:`);
    console.log(`  Companies: ${trend.companyCount}`);
    console.log(`  Growth Rate: ${trend.growthRate > 0 ? '+' : ''}${trend.growthRate.toFixed(1)}%`);
    console.log(`  Avg Revenue: ${(trend.avgRevenue / 1000000).toFixed(2)}M CZK`);
    console.log(`  Sentiment: ${trend.sentiment}`);
    console.log(`  Top Regions: ${trend.topRegions.join(', ')}`);
    console.log('');
  }

  // Analyze regional density
  console.log('\n🗺️  Regional Economic Analysis...\n');

  const regionalPopulations = {
    'Praha': 1300000,
    'Brno': 380000,
    'Ostrava': 290000,
    'Plzeň': 170000,
    'Liberec': 103000
  };

  for (const region of regions) {
    const density = bi.computeRegionalDensity(region, regionalPopulations[region as keyof typeof regionalPopulations]);

    console.log(`${region}:`);
    console.log(`  Companies: ${density.companyCount}`);
    console.log(`  Density: ${density.density.toFixed(2)} per 1,000 residents`);
    console.log(`  Economic Score: ${density.economicScore.toFixed(1)}/100`);
    console.log(`  Dominant Industries: ${density.dominantIndustries.join(', ')}`);
    console.log('');
  }
}

// ===== DEMO: DAILY ECONOMIC REPORT =====

function demonstrateDailyReport() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 3: DAILY ECONOMIC REPORT GENERATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  const reportGenerator = new DailyEconomicReportGenerator();
  const analyzer = new CzechEconomyAnalyzer();

  // Generate sample data for EUR and USD
  console.log('📊 Generating sample data for daily report...\n');

  const currencies = ['EUR', 'USD'];
  const exchangeRates = new Map();
  const trends = new Map();
  const predictions: any[] = [];
  const volatilityPatterns = new Map();

  for (const currency of currencies) {
    const rates: ExchangeRate[] = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const baseRate = currency === 'EUR' ? 25.0 : 23.0;
      const rate = baseRate + Math.sin(i / 5) * 0.3 + (Math.random() - 0.5) * 0.2;

      rates.push({
        currency,
        rate,
        timestamp: date
      });

      analyzer.addRateData(currency, { currency, rate, timestamp: date });
    }

    exchangeRates.set(currency, rates);
    trends.set(currency, analyzer.analyzeExchangeRateTrends(currency, 30));
    predictions.push(analyzer.predictExchangeRate(currency, '7d'));
    volatilityPatterns.set(currency, analyzer.detectVolatilityPatterns(currency, 30));
  }

  // Generate report
  const report = reportGenerator.generateDailyReport({
    exchangeRates,
    trends,
    predictions,
    volatilityPatterns
  });

  // Display formatted report
  const formattedReport = reportGenerator.formatReportAsText(report);
  console.log(formattedReport);
}

// ===== DEMO: CURRENCY ALERT SYSTEM =====

function demonstrateCurrencyAlerts() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 4: CURRENCY ALERT SYSTEM');
  console.log('═══════════════════════════════════════════════════════════\n');

  const alertSystem = new CurrencyAlertSystem({
    rateChangePercent: 1.5, // Alert on 1.5% change
    volatilityMultiplier: 1.8,
    trendReversalConfidence: 0.7
  });

  console.log('⚠️  Monitoring EUR/CZK exchange rates...\n');

  // Simulate rate changes
  const baseRate = 25.0;
  const rates = [
    { rate: baseRate, label: 'Initial rate' },
    { rate: baseRate * 1.005, label: 'Small increase (+0.5%)' },
    { rate: baseRate * 1.025, label: 'Significant spike (+2.5%)' },
    { rate: baseRate * 1.018, label: 'Partial correction' },
    { rate: baseRate * 0.985, label: 'Sharp drop (-3.2%)' }
  ];

  for (const { rate, label } of rates) {
    console.log(`${label}: ${rate.toFixed(4)}`);

    const alerts = alertSystem.checkRateChange('EUR', rate);

    if (alerts.length > 0) {
      alerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' :
                    alert.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} ${alert.severity.toUpperCase()}: ${alert.message}`);
      });
    } else {
      console.log('  ✓ No alerts triggered');
    }
    console.log('');
  }

  // Show all alerts
  console.log('\n📋 All Alerts Summary:\n');
  const allAlerts = alertSystem.getAlerts();

  allAlerts.forEach((alert, index) => {
    console.log(`${index + 1}. [${alert.severity.toUpperCase()}] ${alert.alertType}`);
    console.log(`   ${alert.message}`);
    console.log(`   Time: ${alert.timestamp.toLocaleString('cs-CZ')}`);
    console.log('');
  });
}

// ===== DEMO: TREND VISUALIZATION =====

function demonstrateTrendVisualization() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 5: TREND VISUALIZATION DATA');
  console.log('═══════════════════════════════════════════════════════════\n');

  const visualization = new TrendVisualization();

  // Generate sample exchange rate data
  const exchangeRates = new Map();
  const now = new Date();

  for (const currency of ['EUR', 'USD']) {
    const rates: ExchangeRate[] = [];
    const baseRate = currency === 'EUR' ? 25.0 : 23.0;

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      rates.push({
        currency,
        rate: baseRate + Math.sin(i / 5) * 0.5,
        timestamp: date
      });
    }

    exchangeRates.set(currency, rates);
  }

  // Generate chart data
  const chartData = visualization.formatExchangeRateChart(exchangeRates, {
    currencies: ['EUR', 'USD'],
    days: 30,
    showMovingAverage: true
  });

  console.log('📈 Exchange Rate Chart Configuration:\n');
  console.log(`Chart Type: ${chartData.chartType}`);
  console.log(`Title: ${chartData.title}`);
  console.log(`X-Axis: ${chartData.xAxis.label} (${chartData.xAxis.type})`);
  console.log(`Y-Axis: ${chartData.yAxis.label} (${chartData.yAxis.type})`);
  console.log(`\nDatasets (${chartData.datasets.length}):`);

  chartData.datasets.forEach((dataset, index) => {
    console.log(`  ${index + 1}. ${dataset.name}`);
    console.log(`     Color: ${dataset.color}`);
    console.log(`     Type: ${dataset.type}`);
    console.log(`     Data Points: ${dataset.data.length}`);
  });

  console.log('\n📊 Sample Data Points (first 5 from EUR):');
  const eurDataset = chartData.datasets.find(d => d.name.includes('EUR'));
  if (eurDataset) {
    eurDataset.data.slice(0, 5).forEach((point, index) => {
      console.log(`  ${index + 1}. ${point.label}: ${point.value.toFixed(4)}`);
    });
  }
}

// ===== DEMO: AI MARKET ADVISOR =====

function demonstrateAIAdvisor() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMO 6: AI MARKET ADVISOR');
  console.log('═══════════════════════════════════════════════════════════\n');

  const advisor = createSampleAdvisor();

  // Get investment timing suggestions
  console.log('💡 Investment Timing Analysis:\n');

  for (const currency of ['EUR', 'USD']) {
    console.log(`\n${currency}:`);
    const timing = advisor.suggestInvestmentTiming(currency, 100000);

    console.log(`  Action: ${timing.action.toUpperCase()}`);
    console.log(`  Confidence: ${(timing.confidence * 100).toFixed(1)}%`);
    console.log(`  Risk Level: ${timing.riskLevel}`);
    console.log(`  Timeframe: ${timing.optimalTimeframe}`);
    if (timing.expectedReturn) {
      console.log(`  Expected Return: ${timing.expectedReturn.toFixed(2)}%`);
    }
    console.log(`  Reasoning:`);
    timing.reasoning.forEach((reason, index) => {
      console.log(`    ${index + 1}. ${reason}`);
    });
  }

  // Get currency exchange windows
  console.log('\n\n💱 Currency Exchange Windows:\n');

  for (const currency of ['EUR', 'USD']) {
    console.log(`\n${currency}:`);
    const window = advisor.identifyExchangeWindows(currency, 50000);

    console.log(`  Action: ${window.action.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`  Urgency: ${window.urgency.toUpperCase()}`);
    console.log(`  Current Rate: ${window.currentRate.toFixed(4)}`);
    if (window.targetRate) {
      console.log(`  Target Rate: ${window.targetRate.toFixed(4)}`);
    }
    if (window.estimatedSavings) {
      console.log(`  Estimated Savings: ${window.estimatedSavings.toFixed(2)}%`);
    }
    console.log(`  Valid Until: ${window.validUntil.toLocaleDateString('cs-CZ')}`);
    console.log(`\n  Recommendation:`);
    console.log(`  ${window.recommendation}`);
  }

  // Generate market summary
  console.log('\n\n📰 Market Summary:\n');
  const summary = advisor.generateMarketSummary();

  console.log(`Overall Sentiment: ${summary.overallSentiment.toUpperCase()}`);
  console.log(`\nKey Insights:`);
  summary.keyInsights.forEach((insight, index) => {
    console.log(`  ${index + 1}. ${insight}`);
  });

  console.log(`\nNarrative Summary:`);
  console.log(`  ${summary.narrativeSummary}`);

  if (summary.topOpportunities.length > 0) {
    console.log(`\nTop Opportunities:`);
    summary.topOpportunities.forEach((opp, index) => {
      console.log(`  ${index + 1}. [${opp.type.toUpperCase()}] ${opp.description}`);
    });
  }

  if (summary.risks.length > 0) {
    console.log(`\nRisks:`);
    summary.risks.forEach((risk, index) => {
      const icon = risk.severity === 'high' ? '⚠️' : risk.severity === 'medium' ? '⚡' : 'ℹ️';
      console.log(`  ${icon} [${risk.severity.toUpperCase()}] ${risk.description}`);
    });
  }

  // Generate conversational update
  console.log('\n\n💬 Conversational Market Update:\n');
  const update = advisor.generateConversationalUpdate();
  console.log(update);
}

// ===== MAIN DEMO RUNNER =====

function runAllDemos() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     CZECH DATA PLATFORM - AI ANALYTICS ENGINE DEMO         ║');
  console.log('║                                                            ║');
  console.log('║     Comprehensive demonstration of intelligent analytics   ║');
  console.log('║     for Czech economic data and business intelligence      ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    demonstrateExchangeRateAnalysis();
    demonstrateBusinessIntelligence();
    demonstrateDailyReport();
    demonstrateCurrencyAlerts();
    demonstrateTrendVisualization();
    demonstrateAIAdvisor();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ ALL DEMOS COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Error running demos:', error);
    process.exit(1);
  }
}

// Run all demos
if (require.main === module) {
  runAllDemos();
}

export {
  demonstrateExchangeRateAnalysis,
  demonstrateBusinessIntelligence,
  demonstrateDailyReport,
  demonstrateCurrencyAlerts,
  demonstrateTrendVisualization,
  demonstrateAIAdvisor
};
