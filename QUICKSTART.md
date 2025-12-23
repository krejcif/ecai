# EcommerceIQ - Quick Start Guide

Get up and running with the AI-powered ecommerce intelligence platform in minutes!

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Internet connection (for seeding real data)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run setup** (first-time only):
   ```bash
   npm run setup
   ```

   This will:
   - Check dependencies
   - Create necessary directories
   - Initialize vector database
   - Create `.env` file from `.env.example`

## Quick Demo

The fastest way to see the platform in action:

```bash
npm run demo
```

This interactive demo will:
- Generate 50 diverse sample products
- Create 150 product reviews
- Generate 20 supplier profiles
- Demonstrate semantic search
- Show analytics and insights

**Duration**: ~2-3 minutes

## Next Steps

### 1. Try Searching

After running the demo, search the sample data:

```bash
# Search for products
npm run cli search "premium electronics"

# Search with filters
npm run cli search "organic food" --category "Food & Beverage" --min-price 10 --max-price 50
```

### 2. Run Analysis

Analyze your product catalog:

```bash
# Trend analysis
npm run cli analyze trends

# Pricing analysis
npm run cli analyze pricing --category Electronics

# Sentiment analysis
npm run cli analyze sentiment
```

### 3. Load Real Data

Fetch real products from Open Food Facts:

```bash
npm run seed
```

This will fetch ~100 real products across various food categories.

### 4. Start the API Server

Launch the REST API:

```bash
npm run cli serve
```

Then access:
- API: http://localhost:3000
- Health check: http://localhost:3000/health
- Stats: http://localhost:3000/api/stats

## Available Commands

### CLI Commands

```bash
# Setup & Demo
npm run cli setup          # First-time platform setup
npm run cli demo           # Run interactive demo
npm run seed              # Fetch real data from Open Food Facts

# Data Management
npm run cli init           # Initialize database
npm run cli ingest --all   # Ingest from all data sources

# Search & Analysis
npm run cli search <query> # Semantic product search
npm run cli analyze <type> # Run analysis (trends, sentiment, pricing)

# Server
npm run cli serve          # Start API server
npm run dashboard          # Start web dashboard
```

### NPM Scripts

```bash
npm run setup              # Run setup script
npm run demo               # Run demo script
npm run seed               # Run seed script
npm run cli <command>      # Run CLI command
npm run build              # Build TypeScript
npm run type-check         # Type checking only
```

## Sample Data

The platform includes pre-made sample data:

- **`data/sample-products.json`**: 20 curated products across multiple categories
- **`data/sample-reviews.json`**: 50 realistic product reviews

Load sample data programmatically:

```typescript
import products from './data/sample-products.json';
import reviews from './data/sample-reviews.json';
```

## API Examples

Once the server is running, try these API calls:

### Search Products

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "wireless headphones", "limit": 5}'
```

### Get Platform Stats

```bash
curl http://localhost:3000/api/stats
```

### Run Analysis

```bash
curl -X POST http://localhost:3000/api/analyze/pricing \
  -H "Content-Type: application/json" \
  -d '{"category": "Electronics"}'
```

## Configuration

Customize settings in `.env`:

```bash
# Database
VECTOR_DATA_PATH=./data
VECTOR_DIMENSION=384

# API Server
PORT=3000
HOST=0.0.0.0

# Search
DEFAULT_SEARCH_LIMIT=10
MAX_SEARCH_RESULTS=100

# Features
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_PRICE_TRACKING=true
ENABLE_TREND_DETECTION=true
```

## Project Structure

```
ecai/
├── data/                    # Data files and vector database
│   ├── sample-products.json # Pre-made sample products
│   ├── sample-reviews.json  # Pre-made sample reviews
│   ├── demo-*.json         # Generated demo data
│   └── seeded-*.json       # Real data from APIs
├── scripts/                # Utility scripts
│   ├── setup.ts           # Setup script
│   ├── demo.ts            # Demo script
│   └── seed.ts            # Seed script
├── src/                    # Source code
│   ├── cli.ts             # CLI implementation
│   ├── index.ts           # Main platform class
│   ├── database/          # Vector store & embeddings
│   ├── connectors/        # Data source connectors
│   ├── search/            # Search engine
│   ├── intelligence/      # AI analytics
│   └── api/               # REST API
└── .env.example           # Configuration template
```

## Common Workflows

### Development Workflow

```bash
# 1. Setup (first time only)
npm run setup

# 2. Run demo to verify setup
npm run demo

# 3. Start development
npm run dev  # Watches for changes

# 4. Test changes
npm run cli search "test query"
```

### Testing with Real Data

```bash
# 1. Fetch real products
npm run seed

# 2. Search the data
npm run cli search "organic coffee"

# 3. Run analysis
npm run cli analyze pricing
```

### Production Deployment

```bash
# 1. Build
npm run build

# 2. Set production env
export NODE_ENV=production

# 3. Start server
npm start serve
```

## Features Demonstrated

The demo and sample data showcase:

✅ **Semantic Search**: Vector-based similarity search
✅ **Product Catalog**: Diverse products across 8+ categories
✅ **Reviews & Sentiment**: Sentiment analysis on product reviews
✅ **Supplier Risk**: Risk scoring for supplier evaluation
✅ **Trend Detection**: Identify trending products and categories
✅ **Price Analysis**: Price distribution and statistics
✅ **Real-time Analytics**: Live insights and metrics
✅ **Multi-source Data**: Integration with Open Food Facts

## Troubleshooting

### "ruvector not found"

```bash
npm install -g ruvector
```

### "Cannot connect to database"

Ensure the vector database is initialized:
```bash
npm run setup
```

### "No products found"

Run the demo or seed script:
```bash
npm run demo
# or
npm run seed
```

### Port already in use

Change the port in `.env`:
```bash
PORT=3001
```

## Next Steps

1. **Explore the Code**: Check out `src/` for implementation details
2. **Read the Docs**: See `scripts/README.md` for script documentation
3. **Customize**: Modify `.env` to configure the platform
4. **Integrate**: Use the REST API in your applications
5. **Extend**: Add new data sources in `src/connectors/`

## Support & Resources

- **Documentation**: Check README.md for detailed information
- **Scripts**: See `scripts/README.md` for script documentation
- **API Reference**: Start the server and visit `/api` endpoint
- **Configuration**: Review `.env.example` for all options

## Advanced Features

Once comfortable with basics, explore:

- Custom data connectors
- Advanced search filters
- Batch processing
- Custom analytics
- API integrations
- Dashboard customization

---

**Ready to build?** Start with `npm run demo` and explore! 🚀
