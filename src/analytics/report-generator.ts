/**
 * Report Generation System
 * Generates PDF/JSON reports, market analysis, product performance, and trend reports
 */

import { ProductDocument, ReviewDocument, TrendDocument } from '../database/collections';

export interface Report {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export enum ReportType {
  MARKET_ANALYSIS = 'market_analysis',
  PRODUCT_PERFORMANCE = 'product_performance',
  TREND_ANALYSIS = 'trend_analysis',
  COMPETITIVE_INTELLIGENCE = 'competitive_intelligence',
  REVENUE_ANALYSIS = 'revenue_analysis',
  CUSTOMER_INSIGHTS = 'customer_insights',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  HTML = 'html',
  CSV = 'csv'
}

export interface ReportSection {
  title: string;
  order: number;
  content: string | Record<string, any>;
  charts?: ChartData[];
  tables?: TableData[];
  insights?: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  data: any[];
  labels?: string[];
  options?: Record<string, any>;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
  footer?: string[];
}

export interface MarketAnalysisData {
  products: ProductDocument[];
  trends: TrendDocument[];
  reviews: ReviewDocument[];
  competitors?: string[];
  priceRanges?: Record<string, { min: number; max: number; avg: number }>;
}

export interface ProductPerformanceData {
  product: ProductDocument;
  reviews: ReviewDocument[];
  salesData?: {
    volume: number;
    revenue: number;
    period: string;
  }[];
  competitorProducts?: ProductDocument[];
}

export interface TrendAnalysisData {
  trends: TrendDocument[];
  categories: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ReportGeneratorConfig {
  templatesPath?: string;
  outputPath?: string;
  includeCharts?: boolean;
  includeInsights?: boolean;
  maxSectionsPerReport?: number;
}

export class ReportGenerator {
  private config: Required<ReportGeneratorConfig>;
  private reports: Map<string, Report>;

  constructor(config: ReportGeneratorConfig = {}) {
    this.config = {
      templatesPath: config.templatesPath ?? './templates',
      outputPath: config.outputPath ?? './reports',
      includeCharts: config.includeCharts ?? true,
      includeInsights: config.includeInsights ?? true,
      maxSectionsPerReport: config.maxSectionsPerReport ?? 20
    };
    this.reports = new Map();
  }

  /**
   * Generate market analysis report
   */
  generateMarketAnalysisReport(
    data: MarketAnalysisData,
    period: { start: Date; end: Date },
    format: ReportFormat = ReportFormat.JSON
  ): Report {
    const report: Report = {
      id: this.generateReportId(),
      title: 'Market Analysis Report',
      description: `Comprehensive market analysis for ${period.start.toLocaleDateString()} to ${period.end.toLocaleDateString()}`,
      type: ReportType.MARKET_ANALYSIS,
      format,
      generatedAt: new Date(),
      period,
      sections: []
    };

    // Executive Summary
    report.sections.push(this.createExecutiveSummary(data));

    // Market Overview
    report.sections.push(this.createMarketOverview(data));

    // Price Analysis
    if (data.priceRanges) {
      report.sections.push(this.createPriceAnalysis(data.priceRanges));
    }

    // Competitive Landscape
    if (data.competitors && data.competitors.length > 0) {
      report.sections.push(this.createCompetitiveLandscape(data));
    }

    // Trend Analysis
    if (data.trends && data.trends.length > 0) {
      report.sections.push(this.createTrendSection(data.trends));
    }

    // Customer Sentiment
    if (data.reviews && data.reviews.length > 0) {
      report.sections.push(this.createSentimentSection(data.reviews));
    }

    // Recommendations
    report.sections.push(this.createRecommendations(data));

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate product performance report
   */
  generateProductPerformanceReport(
    data: ProductPerformanceData,
    period: { start: Date; end: Date },
    format: ReportFormat = ReportFormat.JSON
  ): Report {
    const report: Report = {
      id: this.generateReportId(),
      title: `Product Performance: ${data.product.name}`,
      description: `Detailed performance analysis for ${data.product.name}`,
      type: ReportType.PRODUCT_PERFORMANCE,
      format,
      generatedAt: new Date(),
      period,
      sections: []
    };

    // Product Overview
    report.sections.push({
      title: 'Product Overview',
      order: 1,
      content: {
        name: data.product.name,
        category: data.product.category,
        price: data.product.price,
        source: data.product.source,
        description: data.product.description
      }
    });

    // Sales Performance
    if (data.salesData && data.salesData.length > 0) {
      report.sections.push(this.createSalesPerformanceSection(data.salesData));
    }

    // Customer Reviews
    if (data.reviews && data.reviews.length > 0) {
      report.sections.push(this.createReviewsSection(data.reviews));
    }

    // Competitive Comparison
    if (data.competitorProducts && data.competitorProducts.length > 0) {
      report.sections.push(this.createCompetitiveComparison(data.product, data.competitorProducts));
    }

    // Performance Insights
    report.sections.push(this.createPerformanceInsights(data));

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate trend report
   */
  generateTrendReport(
    data: TrendAnalysisData,
    format: ReportFormat = ReportFormat.JSON
  ): Report {
    const report: Report = {
      id: this.generateReportId(),
      title: 'Market Trends Analysis',
      description: `Trend analysis across ${data.categories.length} categories`,
      type: ReportType.TREND_ANALYSIS,
      format,
      generatedAt: new Date(),
      period: data.timeRange,
      sections: []
    };

    // Trends Overview
    report.sections.push({
      title: 'Trends Overview',
      order: 1,
      content: {
        totalTrends: data.trends.length,
        categories: data.categories,
        timeRange: data.timeRange
      },
      insights: [
        `Analyzed ${data.trends.length} trends across ${data.categories.length} categories`,
        `Time period: ${data.timeRange.start.toLocaleDateString()} to ${data.timeRange.end.toLocaleDateString()}`
      ]
    });

    // Top Growing Trends
    const topGrowing = this.getTopGrowingTrends(data.trends, 10);
    report.sections.push({
      title: 'Top Growing Trends',
      order: 2,
      content: topGrowing,
      charts: this.config.includeCharts ? [{
        type: 'bar',
        title: 'Top 10 Growing Trends',
        data: topGrowing.map(t => t.growth),
        labels: topGrowing.map(t => t.keyword)
      }] : undefined,
      tables: [{
        title: 'Trending Keywords',
        headers: ['Keyword', 'Volume', 'Growth %', 'Category'],
        rows: topGrowing.map(t => [
          t.keyword,
          t.volume.toLocaleString(),
          `${t.growth.toFixed(2)}%`,
          t.category || 'N/A'
        ])
      }]
    });

    // Category Analysis
    report.sections.push(this.createCategoryTrendAnalysis(data));

    // Trend Forecasts
    report.sections.push(this.createTrendForecasts(data.trends));

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate custom report
   */
  generateCustomReport(
    title: string,
    description: string,
    sections: ReportSection[],
    period: { start: Date; end: Date },
    format: ReportFormat = ReportFormat.JSON
  ): Report {
    const report: Report = {
      id: this.generateReportId(),
      title,
      description,
      type: ReportType.CUSTOM,
      format,
      generatedAt: new Date(),
      period,
      sections: sections.map((section, index) => ({
        ...section,
        order: section.order ?? index + 1
      }))
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Export report to specific format
   */
  exportReport(reportId: string, format?: ReportFormat): string {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const exportFormat = format || report.format;

    switch (exportFormat) {
      case ReportFormat.JSON:
        return this.exportToJSON(report);
      case ReportFormat.PDF:
        return this.exportToPDF(report);
      case ReportFormat.HTML:
        return this.exportToHTML(report);
      case ReportFormat.CSV:
        return this.exportToCSV(report);
      default:
        throw new Error(`Unsupported format: ${exportFormat}`);
    }
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): Report | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * List all reports
   */
  listReports(type?: ReportType): Report[] {
    const reports = Array.from(this.reports.values());
    return type ? reports.filter(r => r.type === type) : reports;
  }

  /**
   * Delete report
   */
  deleteReport(reportId: string): boolean {
    return this.reports.delete(reportId);
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports.clear();
  }

  // Private helper methods

  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private createExecutiveSummary(data: MarketAnalysisData): ReportSection {
    const insights: string[] = [];

    insights.push(`Analyzed ${data.products.length} products across the market`);

    if (data.reviews && data.reviews.length > 0) {
      const avgRating = data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length;
      insights.push(`Average customer rating: ${avgRating.toFixed(2)}/5.0`);
    }

    if (data.trends && data.trends.length > 0) {
      const growingTrends = data.trends.filter(t => t.growth > 0).length;
      insights.push(`${growingTrends} out of ${data.trends.length} trends showing growth`);
    }

    return {
      title: 'Executive Summary',
      order: 1,
      content: {
        totalProducts: data.products.length,
        totalReviews: data.reviews?.length || 0,
        totalTrends: data.trends?.length || 0,
        competitors: data.competitors?.length || 0
      },
      insights
    };
  }

  private createMarketOverview(data: MarketAnalysisData): ReportSection {
    const categories = new Map<string, number>();
    const sources = new Map<string, number>();

    for (const product of data.products) {
      categories.set(product.category, (categories.get(product.category) || 0) + 1);
      sources.set(product.source, (sources.get(product.source) || 0) + 1);
    }

    return {
      title: 'Market Overview',
      order: 2,
      content: {
        productsByCategory: Object.fromEntries(categories),
        productsBySource: Object.fromEntries(sources)
      },
      charts: this.config.includeCharts ? [{
        type: 'pie',
        title: 'Products by Category',
        data: Array.from(categories.values()),
        labels: Array.from(categories.keys())
      }] : undefined
    };
  }

  private createPriceAnalysis(priceRanges: Record<string, { min: number; max: number; avg: number }>): ReportSection {
    const headers = ['Category', 'Min Price', 'Avg Price', 'Max Price', 'Range'];
    const rows = Object.entries(priceRanges).map(([category, range]) => [
      category,
      `$${range.min.toFixed(2)}`,
      `$${range.avg.toFixed(2)}`,
      `$${range.max.toFixed(2)}`,
      `$${(range.max - range.min).toFixed(2)}`
    ]);

    return {
      title: 'Price Analysis',
      order: 3,
      content: priceRanges,
      tables: [{
        title: 'Price Ranges by Category',
        headers,
        rows
      }]
    };
  }

  private createCompetitiveLandscape(data: MarketAnalysisData): ReportSection {
    return {
      title: 'Competitive Landscape',
      order: 4,
      content: {
        totalCompetitors: data.competitors?.length || 0,
        competitors: data.competitors || []
      },
      insights: this.config.includeInsights ? [
        `Identified ${data.competitors?.length || 0} key competitors in the market`,
        'Market shows moderate competition levels',
        'Opportunities exist for differentiation'
      ] : undefined
    };
  }

  private createTrendSection(trends: TrendDocument[]): ReportSection {
    const topTrends = trends
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 10);

    return {
      title: 'Market Trends',
      order: 5,
      content: {
        totalTrends: trends.length,
        topTrends
      },
      charts: this.config.includeCharts ? [{
        type: 'bar',
        title: 'Top Trending Keywords',
        data: topTrends.map(t => t.volume),
        labels: topTrends.map(t => t.keyword)
      }] : undefined
    };
  }

  private createSentimentSection(reviews: ReviewDocument[]): ReportSection {
    const sentimentCounts = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length
    };

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      title: 'Customer Sentiment',
      order: 6,
      content: {
        totalReviews: reviews.length,
        averageRating: avgRating,
        sentimentDistribution: sentimentCounts
      },
      charts: this.config.includeCharts ? [{
        type: 'pie',
        title: 'Sentiment Distribution',
        data: Object.values(sentimentCounts),
        labels: Object.keys(sentimentCounts)
      }] : undefined,
      insights: [
        `Average rating: ${avgRating.toFixed(2)}/5.0`,
        `${sentimentCounts.positive} positive reviews (${((sentimentCounts.positive / reviews.length) * 100).toFixed(1)}%)`,
        `${sentimentCounts.negative} negative reviews (${((sentimentCounts.negative / reviews.length) * 100).toFixed(1)}%)`
      ]
    };
  }

  private createRecommendations(data: MarketAnalysisData): ReportSection {
    const recommendations: string[] = [];

    // Generate recommendations based on data analysis
    if (data.products.length < 10) {
      recommendations.push('Expand product catalog to increase market presence');
    }

    if (data.trends && data.trends.length > 0) {
      const topTrend = data.trends.sort((a, b) => b.growth - a.growth)[0];
      if (topTrend) {
        recommendations.push(`Focus on trending keyword: "${topTrend.keyword}" (${topTrend.growth.toFixed(2)}% growth)`);
      }
    }

    if (data.reviews && data.reviews.length > 0) {
      const negativeReviews = data.reviews.filter(r => r.sentiment === 'negative').length;
      const negativeRate = (negativeReviews / data.reviews.length) * 100;

      if (negativeRate > 20) {
        recommendations.push('Address customer concerns to reduce negative sentiment');
      }
    }

    recommendations.push('Continue monitoring market trends and competitor activity');
    recommendations.push('Invest in customer feedback analysis for product improvements');

    return {
      title: 'Strategic Recommendations',
      order: 7,
      content: { recommendations },
      insights: recommendations
    };
  }

  private createSalesPerformanceSection(salesData: any[]): ReportSection {
    const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
    const totalVolume = salesData.reduce((sum, d) => sum + d.volume, 0);

    return {
      title: 'Sales Performance',
      order: 2,
      content: {
        totalRevenue,
        totalVolume,
        periods: salesData.length
      },
      charts: this.config.includeCharts ? [{
        type: 'line',
        title: 'Revenue Over Time',
        data: salesData.map(d => d.revenue),
        labels: salesData.map(d => d.period)
      }] : undefined
    };
  }

  private createReviewsSection(reviews: ReviewDocument[]): ReportSection {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const sentiments = {
      positive: reviews.filter(r => r.sentiment === 'positive').length,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length,
      negative: reviews.filter(r => r.sentiment === 'negative').length
    };

    return {
      title: 'Customer Reviews',
      order: 3,
      content: {
        totalReviews: reviews.length,
        averageRating: avgRating,
        sentiments
      },
      insights: [
        `Overall customer satisfaction: ${avgRating.toFixed(2)}/5.0`,
        `${((sentiments.positive / reviews.length) * 100).toFixed(1)}% positive sentiment`
      ]
    };
  }

  private createCompetitiveComparison(product: ProductDocument, competitors: ProductDocument[]): ReportSection {
    const avgCompetitorPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
    const pricePosition = product.price < avgCompetitorPrice ? 'below' : 'above';

    return {
      title: 'Competitive Comparison',
      order: 4,
      content: {
        productPrice: product.price,
        avgCompetitorPrice,
        pricePosition,
        totalCompetitors: competitors.length
      },
      tables: [{
        title: 'Competitor Pricing',
        headers: ['Product', 'Price', 'Category', 'Source'],
        rows: competitors.slice(0, 5).map(c => [
          c.name,
          `$${c.price.toFixed(2)}`,
          c.category,
          c.source
        ])
      }]
    };
  }

  private createPerformanceInsights(data: ProductPerformanceData): ReportSection {
    const insights: string[] = [];

    if (data.reviews && data.reviews.length > 0) {
      const avgRating = data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length;
      insights.push(`Strong customer satisfaction with ${avgRating.toFixed(2)}/5.0 average rating`);
    }

    if (data.competitorProducts && data.competitorProducts.length > 0) {
      const avgCompPrice = data.competitorProducts.reduce((sum, c) => sum + c.price, 0) / data.competitorProducts.length;
      if (data.product.price < avgCompPrice) {
        insights.push(`Competitive pricing advantage: ${(((avgCompPrice - data.product.price) / avgCompPrice) * 100).toFixed(1)}% below market average`);
      }
    }

    insights.push('Continue monitoring performance metrics and customer feedback');

    return {
      title: 'Performance Insights',
      order: 5,
      content: { insights },
      insights
    };
  }

  private getTopGrowingTrends(trends: TrendDocument[], limit: number): TrendDocument[] {
    return trends
      .sort((a, b) => b.growth - a.growth)
      .slice(0, limit);
  }

  private createCategoryTrendAnalysis(data: TrendAnalysisData): ReportSection {
    const categoryTrends = new Map<string, TrendDocument[]>();

    for (const trend of data.trends) {
      const category = trend.category || 'Uncategorized';
      const trends = categoryTrends.get(category) || [];
      trends.push(trend);
      categoryTrends.set(category, trends);
    }

    const categoryStats = Object.fromEntries(
      Array.from(categoryTrends.entries()).map(([category, trends]) => {
        const avgGrowth = trends.reduce((sum, t) => sum + t.growth, 0) / trends.length;
        const totalVolume = trends.reduce((sum, t) => sum + t.volume, 0);
        return [category, { trendCount: trends.length, avgGrowth, totalVolume }];
      })
    );

    return {
      title: 'Category Trend Analysis',
      order: 3,
      content: categoryStats
    };
  }

  private createTrendForecasts(trends: TrendDocument[]): ReportSection {
    const forecasts = trends
      .filter(t => t.growth > 10) // High growth trends
      .slice(0, 5)
      .map(t => ({
        keyword: t.keyword,
        currentVolume: t.volume,
        growth: t.growth,
        projectedVolume: Math.round(t.volume * (1 + t.growth / 100))
      }));

    return {
      title: 'Trend Forecasts',
      order: 4,
      content: { forecasts },
      insights: [
        'Based on current growth rates, the following trends show strong potential',
        'Forecasts assume continued growth at current rates'
      ]
    };
  }

  private exportToJSON(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  private exportToPDF(report: Report): string {
    // PDF generation would require a library like pdfkit or puppeteer
    // This is a placeholder implementation
    return JSON.stringify({
      format: 'pdf',
      message: 'PDF generation requires additional dependencies',
      reportId: report.id,
      title: report.title,
      metadata: {
        generatedAt: report.generatedAt,
        sections: report.sections.length
      }
    }, null, 2);
  }

  private exportToHTML(report: Report): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; margin-top: 30px; }
    .section { margin-bottom: 30px; }
    .insight { background: #ecf0f1; padding: 10px; margin: 5px 0; border-left: 4px solid #3498db; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #34495e; color: white; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p><strong>Description:</strong> ${report.description}</p>
  <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
  <p><strong>Period:</strong> ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</p>
`;

    for (const section of report.sections.sort((a, b) => a.order - b.order)) {
      html += `  <div class="section">
    <h2>${section.title}</h2>
`;

      if (section.insights) {
        html += `    <div class="insights">
`;
        for (const insight of section.insights) {
          html += `      <div class="insight">${insight}</div>
`;
        }
        html += `    </div>
`;
      }

      if (section.tables) {
        for (const table of section.tables) {
          html += `    <table>
      <caption><strong>${table.title}</strong></caption>
      <thead>
        <tr>
`;
          for (const header of table.headers) {
            html += `          <th>${header}</th>
`;
          }
          html += `        </tr>
      </thead>
      <tbody>
`;
          for (const row of table.rows) {
            html += `        <tr>
`;
            for (const cell of row) {
              html += `          <td>${cell}</td>
`;
            }
            html += `        </tr>
`;
          }
          html += `      </tbody>
    </table>
`;
        }
      }

      html += `  </div>
`;
    }

    html += `</body>
</html>`;

    return html;
  }

  private exportToCSV(report: Report): string {
    // CSV export for tabular data in report
    let csv = `Report,${report.title}\n`;
    csv += `Generated,${report.generatedAt.toISOString()}\n`;
    csv += `\n`;

    for (const section of report.sections.sort((a, b) => a.order - b.order)) {
      csv += `\nSection,${section.title}\n`;

      if (section.tables) {
        for (const table of section.tables) {
          csv += `\n${table.title}\n`;
          csv += table.headers.join(',') + '\n';
          for (const row of table.rows) {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
          }
        }
      }
    }

    return csv;
  }
}
