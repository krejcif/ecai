# EcommerceIQ Scripts

This directory contains utility scripts for setting up, testing, and managing the EcommerceIQ platform.

## Available Scripts

### setup.ts

**Purpose**: First-time platform setup and initialization

**What it does**:
- Checks for required dependencies (Node.js 18+, ruvector)
- Creates necessary directories (`data/`, `logs/`, etc.)
- Initializes vector database collections (products, reviews, suppliers, trends)
- Creates `.env` file from `.env.example` if it doesn't exist
- Prints helpful setup instructions

**Usage**:
```bash
npm run setup
# or
tsx scripts/setup.ts
# or via CLI
npm run cli setup
```

**When to use**: Run this once when first setting up the platform or after a clean installation.

---

### demo.ts

**Purpose**: Interactive demonstration of all platform features

**What it does**:
- Generates 50 diverse sample products across 8 categories
- Creates 150 product reviews with sentiment analysis
- Generates 20 supplier profiles with risk scores
- Creates embeddings for all data
- Inserts data into vector database
- Runs sample semantic searches
- Displays analytics and insights
- Saves demo data to `data/demo-*.json` files

**Usage**:
```bash
npm run demo
# or
tsx scripts/demo.ts
# or via CLI
npm run cli demo
```

**When to use**:
- First-time users wanting to see platform capabilities
- Testing the system with synthetic data
- Demonstrations and presentations
- Development and testing

**Features showcased**:
- ✅ Product catalog management
- ✅ Vector embeddings generation
- ✅ Semantic search
- ✅ Sentiment analysis
- ✅ Supplier risk scoring
- ✅ Analytics and reporting

---

### seed.ts

**Purpose**: Fetch and load real product data from external sources

**What it does**:
- Fetches real products from Open Food Facts API
- Normalizes data to EcommerceIQ format
- Creates embeddings for all products
- Stores data in vector database
- Verifies data integrity
- Generates detailed summary report
- Saves raw data to `data/seeded-products.json`

**Usage**:
```bash
npm run seed
# or
tsx scripts/seed.ts
```

**Categories fetched** (configurable in script):
- Beverages
- Snacks
- Dairy
- Breakfast
- Plant-based foods
- Cereals
- Chocolates
- Coffee

**When to use**:
- After running setup and demo
- When you need real product data for testing
- Building a production dataset
- Market research and analysis

**Note**: Requires internet connection and respects Open Food Facts API rate limits.

---

## Quick Start Workflow

For new users, we recommend this workflow:

```bash
# 1. First-time setup
npm run setup

# 2. Run the demo to see features
npm run demo

# 3. Try searching the demo data
npm run cli search "premium electronics"

# 4. Load real data (optional)
npm run seed

# 5. Start the API server
npm run cli serve
```

## Data Files

Scripts will create the following data files in the `data/` directory:

- `demo-products.json` - Sample products from demo script
- `demo-reviews.json` - Sample reviews from demo script
- `demo-suppliers.json` - Sample suppliers from demo script
- `seeded-products.json` - Real products from seed script
- `sample-products.json` - Pre-made sample product catalog
- `sample-reviews.json` - Pre-made sample reviews

## Configuration

Scripts respect environment variables from `.env`:

```bash
VECTOR_DATA_PATH=./data          # Where to store vector data
VECTOR_DIMENSION=384             # Embedding dimension
BATCH_SIZE=100                   # Batch size for processing
MAX_ITEMS_PER_SOURCE=1000       # Max items to fetch
```

## Troubleshooting

### "ruvector not found"

Install ruvector:
```bash
npm install -g ruvector
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x scripts/*.ts
```

### "Cannot find module"

Install dependencies:
```bash
npm install
```

### "Network error" when seeding

Check internet connection and Open Food Facts API status. The seed script includes automatic retries and rate limiting.

## Development

To modify or extend these scripts:

1. All scripts use TypeScript
2. Follow existing patterns for error handling
3. Use `ora` for progress spinners
4. Use `chalk` for colored output
5. Test thoroughly before committing

## Contributing

When adding new scripts:

1. Create the script in this directory
2. Add npm script to `package.json`
3. Document it in this README
4. Add CLI command in `src/cli.ts` if needed
5. Include helpful error messages and logging
