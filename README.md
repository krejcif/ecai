# EcommerceIQ

> AI-Powered Ecommerce Intelligence Platform

EcommerceIQ is a comprehensive platform for ecommerce intelligence, providing advanced product search, market analysis, sentiment tracking, and competitive insights using AI and open data sources.

## Features

### Core Capabilities

- **Semantic Product Search**: Advanced search capabilities with natural language queries, filtering by category, price range, brand, and ratings
- **Trend Analysis**: Identify trending products, track price movements, and analyze market dynamics across categories
- **Sentiment Analysis**: Aggregate and analyze product reviews to understand customer sentiment and satisfaction
- **Pricing Intelligence**: Comprehensive pricing analysis including distribution, averages, medians, and competitive positioning
- **Competitive Analysis**: Monitor market competition and track competitor product strategies
- **RESTful API**: Production-ready API server with comprehensive endpoints for integration
- **CLI Tools**: Powerful command-line interface for data ingestion, analysis, and management

### Technical Features

- **TypeScript-First**: Full TypeScript implementation with strict type safety
- **Schema Validation**: Runtime validation using Zod for data integrity
- **Modern Architecture**: Clean, modular design following SOLID principles
- **Extensible**: Plugin-based architecture for custom data sources and analyzers
- **Production-Ready**: Helmet security, CORS support, error handling, and logging

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Quick Install

```bash
# Clone the repository
git clone <repository-url>
cd ecai

# Install dependencies
npm install

# Build the project
npm run build

# Initialize the platform
npm run cli init
```

## Quick Start

### 1. Initialize the Database

```bash
npm run cli init
```

### 2. Ingest Data from Open Sources

```bash
npm run cli ingest --all
```

### 3. Search for Products

```bash
npm run cli search "wireless headphones" --category Electronics --min-rating 4
```

### 4. Run Analysis

```bash
# Analyze pricing trends
npm run cli analyze pricing --category Electronics

# Analyze market trends
npm run cli analyze trends

# Analyze sentiment
npm run cli analyze sentiment
```

### 5. Start the API Server

```bash
npm run cli serve --port 3000
```

The API will be available at `http://localhost:3000`

## CLI Reference

### Commands

#### `init`
Initialize the database and core services

```bash
npm run cli init [--reset]
```

Options:
- `--reset`: Reset the database before initialization

#### `ingest`
Ingest data from open data sources

```bash
npm run cli ingest [--all] [-s <source>]
```

Options:
- `--all`: Ingest from all available sources
- `-s, --source <name>`: Ingest from specific source

#### `search`
Search for products using semantic search

```bash
npm run cli search <query> [options]
```

Options:
- `-c, --category <category>`: Filter by category
- `--min-price <price>`: Minimum price filter
- `--max-price <price>`: Maximum price filter
- `-b, --brand <brands...>`: Filter by brand(s)
- `-r, --min-rating <rating>`: Minimum rating filter
- `-l, --limit <number>`: Maximum number of results (default: 10)
- `--json`: Output results as JSON

#### `analyze`
Run analysis on product data

```bash
npm run cli analyze <type> [options]
```

Types:
- `trends`: Analyze product trends and market dynamics
- `sentiment`: Analyze customer sentiment from reviews
- `pricing`: Analyze pricing patterns and distributions
- `competitive`: Analyze competitive landscape

Options:
- `-c, --category <category>`: Filter by category
- `--json`: Output results as JSON

#### `serve`
Start the API server

```bash
npm run cli serve [options]
```

Options:
- `-p, --port <port>`: Port to listen on (default: 3000)
- `-h, --host <host>`: Host to bind to (default: 0.0.0.0)

#### `dashboard`
Open the web dashboard (coming soon)

```bash
npm run cli dashboard [--port <port>]
```

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /health
```

Returns server health status.

#### Get Platform Statistics
```http
GET /api/stats
```

Returns platform statistics including product count, categories, and data sources.

#### Search Products
```http
POST /api/search
Content-Type: application/json

{
  "query": "wireless headphones",
  "category": "Electronics",
  "minPrice": 50,
  "maxPrice": 200,
  "minRating": 4,
  "limit": 10
}
```

Returns search results matching the query and filters.

#### Run Analysis
```http
POST /api/analyze/:type
Content-Type: application/json

{
  "category": "Electronics"
}
```

Types: `trends`, `sentiment`, `pricing`, `competitive`

Returns analysis results for the specified type.

#### Get All Products
```http
GET /api/products
```

Returns all products in the database.

#### Get Single Product
```http
GET /api/products/:id
```

Returns a single product by ID.

## Open Data Sources

EcommerceIQ leverages multiple open data sources to provide comprehensive market intelligence:

### Current Sources

- **Public Product Datasets**: Open product catalogs from various industries
- **Community-Maintained Catalogs**: Crowd-sourced product databases
- **Open Commerce APIs**: Public APIs from ecommerce platforms

### Planned Sources

- **Open Government Data**: Product safety and recall databases
- **Academic Research Datasets**: Market research and consumer behavior data
- **Web Scraping**: Ethical scraping of publicly available product information

### Adding Custom Data Sources

```typescript
import { DataSource } from 'ecommerce-iq';

const customSource: DataSource = {
  name: 'My Custom Source',
  url: 'https://api.example.com/products',
  format: 'json',
  parser: (data) => {
    // Transform data to Product schema
    return data.map(item => ({
      name: item.title,
      price: item.price,
      category: item.category,
      // ...
    }));
  }
};

await platform.ingestion.ingestFromSource(customSource);
```

## Programmatic Usage

```typescript
import EcommerceIQ from 'ecommerce-iq';

// Initialize platform
const platform = new EcommerceIQ();
await platform.initialize();

// Search products
const results = await platform.search({
  query: 'laptop',
  category: 'Electronics',
  minPrice: 500,
  maxPrice: 2000,
  limit: 20
});

// Run analysis
const trendAnalysis = await platform.analyze('trends', {
  category: 'Electronics'
});

// Get statistics
const stats = await platform.getStats();
console.log(`Total products: ${stats.totalProducts}`);
```

## Development

### Scripts

```bash
# Development mode with auto-reload
npm run dev

# Build the project
npm run build

# Type checking
npm run type-check

# Clean build artifacts
npm run clean

# Run CLI directly
npm run cli -- <command>
```

### Project Structure

```
ecai/
├── src/
│   ├── index.ts          # Main platform implementation
│   └── cli.ts            # CLI interface
├── dist/                 # Compiled output (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # Documentation
```

## Architecture

### Core Components

1. **EcommerceDatabase**: Data storage and retrieval layer
2. **DataIngestionService**: Handles data import from various sources
3. **AnalysisEngine**: Performs market analysis and insights generation
4. **EcommerceIQ**: Main platform orchestrator

### Data Flow

```
Data Sources → Ingestion Service → Database → Analysis Engine → API/CLI
```

### Type Safety

All data structures use Zod schemas for runtime validation:
- ProductSchema
- SearchQuerySchema
- AnalysisRequestSchema

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DB_TYPE=memory          # memory | sqlite | postgres
DB_PATH=./data.db       # For SQLite
DB_CONNECTION_STRING=   # For Postgres

# API Server
PORT=3000
HOST=0.0.0.0

# Data Sources
ENABLE_AUTO_INGESTION=false
INGESTION_SCHEDULE=0 */6 * * *  # Every 6 hours
```

## Roadmap

### Version 1.x
- [ ] SQLite and PostgreSQL database support
- [ ] Real-time data ingestion from major sources
- [ ] Advanced semantic search using embeddings
- [ ] Web dashboard UI
- [ ] Export capabilities (CSV, Excel, PDF)

### Version 2.x
- [ ] Machine learning models for prediction
- [ ] Real-time market alerts and notifications
- [ ] Multi-tenant support
- [ ] GraphQL API
- [ ] Mobile app

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@ecommerceiq.com

---

**EcommerceIQ** - Empowering ecommerce decisions with AI-driven intelligence.
