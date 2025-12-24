// ============================================================================
// CZECH DATA PLATFORM - MAIN ENTRY POINT
// ============================================================================

export {
  CzechDataFetcher,
  ExchangeRate,
  BusinessInfo,
  PragueDataset,
  CZSOIndicator,
} from './data/czechDataFetcher';

export {
  DataProcessor,
  NormalizedData,
  StatisticalSummary,
  AggregationResult,
  TimeSeriesPoint,
} from './data/dataProcessor';

// Re-export default instances for convenience
import CzechDataFetcher from './data/czechDataFetcher';
import DataProcessor from './data/dataProcessor';

export default {
  CzechDataFetcher,
  DataProcessor,
};
