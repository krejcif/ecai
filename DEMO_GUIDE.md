# EcommerceIQ Demo & Quick Start - Complete Guide

## What's Been Created

This guide covers all the demo data and quick start resources created for the EcommerceIQ platform.

## 📁 Complete File Structure

### Scripts (`/scripts/`)

1. **setup.ts** (238 lines, 6.9KB)
   - First-time platform setup
   - Dependency validation
   - Directory creation
   - Vector database initialization
   - Environment configuration

2. **demo.ts** (509 lines, 16KB)
   - Generates 50 diverse sample products
   - Creates 150 product reviews
   - Generates 20 supplier profiles
   - Demonstrates all platform features
   - Runs sample searches and analytics

3. **seed.ts** (342 lines, 11KB)
   - Fetches real data from Open Food Facts
   - Processes and normalizes data
   - Creates embeddings
   - Verifies data integrity
   - Generates detailed reports

### Data Files (`/data/`)

1. **sample-products.json** (262 lines, 9.0KB)
   - 20 carefully curated products
   - 8 different categories
   - Realistic pricing and ratings
   - Complete product metadata

2. **sample-reviews.json** (502 lines, 15KB)
   - 50 authentic-sounding reviews
   - Mix of positive, neutral, and negative sentiment
   - Verified purchase indicators
   - Rating data

### Configuration

1. **.env.example** (169 lines, updated)
   - Comprehensive configuration template
   - Database settings
   - API configuration
   - Feature flags
   - Security settings
   - Performance tuning

### Documentation

1. **QUICKSTART.md** (7.1KB)
   - Step-by-step getting started guide
   - Common workflows
   - API examples
   - Troubleshooting

2. **scripts/README.md** (4.4KB)
   - Detailed script documentation
   - Usage examples
   - Configuration options
   - Development guide

### CLI Updates (`/src/cli.ts`)

Added commands:
- `demo` - Run the interactive demo
- `setup` - Run the setup script

## 🚀 Quick Start Workflows

### 1. First-Time Setup (< 1 minute)

```bash
# Install dependencies
npm install

# Run setup
npm run setup
```

Expected output:
- ✅ Dependencies validated
- ✅ Directories created
- ✅ Vector database initialized
- ✅ Environment configured

### 2. Run the Demo (2-3 minutes)

```bash
npm run demo
```

The demo will:
1. Generate 50 sample products across 8 categories
2. Create 150 product reviews with sentiment analysis
3. Generate 20 supplier profiles with risk scores
4. Create embeddings for all data
5. Run 4 sample semantic searches
6. Display comprehensive analytics

Sample categories:
- Electronics
- Clothing
- Food & Beverage
- Home & Garden
- Sports & Outdoors
- Beauty & Personal Care
- Books & Media
- Toys & Games

### 3. Load Real Data (1-2 minutes)

```bash
npm run seed
```

Fetches real products from:
- Open Food Facts API
- Multiple food categories
- ~100+ products
- Complete nutritional data

### 4. Start Using the Platform

```bash
# Search products
npm run cli search "organic coffee"

# Run analysis
npm run cli analyze trends --category "Food & Beverage"

# Start API server
npm run cli serve
```

## 📊 Demo Features Showcase

### Product Search
- **Semantic search**: Understands meaning, not just keywords
- **Category filtering**: Filter by product categories
- **Price range**: Min/max price filters
- **Brand filtering**: Search specific brands
- **Rating filtering**: Minimum rating threshold

Example:
```bash
npm run cli search "high-quality electronics for gaming" \
  --category Electronics \
  --min-price 100 \
  --max-price 500 \
  --min-rating 4.5
```

### Analytics Dashboard
- **Category distribution**: Products per category
- **Price statistics**: Average, min, max prices
- **Sentiment analysis**: Positive/neutral/negative reviews
- **Supplier risk**: Risk score distribution

### Data Diversity

**Product Categories**:
- Electronics (headphones, speakers, mice, LED lights)
- Food & Beverage (coffee, tea, matcha, quinoa, coconut oil)
- Sports & Outdoors (yoga mat, resistance bands, water bottle)
- Home & Garden (desk lamp, cutting boards, pillows, storage bags)
- Beauty & Personal Care (moisturizer, deodorant)

**Price Range**: $12.99 - $299.99
**Brands**: 20+ unique brands
**Review Count**: 150 reviews (60% positive, 20% neutral, 20% negative)

## 🔧 NPM Scripts Reference

### Setup & Demo
```bash
npm run setup      # Platform setup (run once)
npm run demo       # Interactive demo
npm run seed       # Fetch real data
```

### CLI Commands
```bash
npm run cli init                    # Initialize database
npm run cli search <query>          # Search products
npm run cli analyze <type>          # Run analysis
npm run cli serve                   # Start API server
npm run cli demo                    # Run demo via CLI
npm run cli setup                   # Run setup via CLI
```

### Development
```bash
npm run build      # Build TypeScript
npm run dev        # Development mode
npm run type-check # Type checking
npm run clean      # Clean build
```

## 📈 Sample Data Details

### Products (sample-products.json)

20 products featuring:
- Organic Fair Trade Coffee Beans ($24.99)
- Wireless Noise-Cancelling Headphones ($299.99)
- Eco-Friendly Yoga Mat ($59.99)
- Smart LED Desk Lamp ($45.99)
- Organic Matcha Green Tea Powder ($28.99)
- And 15 more...

Each product includes:
- Unique ID
- Name and description
- Category and brand
- Price and currency
- Rating (0-5) and review count
- Tags
- Source information

### Reviews (sample-reviews.json)

50 reviews covering:
- All 20 sample products
- Mix of sentiments (positive, neutral, negative)
- Realistic review text
- 1-5 star ratings
- Verified purchase indicators
- Review dates
- Author information

### Generated Demo Data

The demo script generates:

**Products** (50 items):
- Electronics: 7 products
- Clothing: 6 products
- Food & Beverage: 7 products
- Home & Garden: 6 products
- Sports & Outdoors: 6 products
- Beauty & Personal Care: 6 products
- Books & Media: 6 products
- Toys & Games: 6 products

**Reviews** (150 items):
- 3 reviews per product
- Sentiment distribution: 60% positive, 20% neutral, 20% negative
- Ratings aligned with sentiment

**Suppliers** (20 items):
- Global locations (China, Vietnam, India, Thailand, etc.)
- Risk scores (0-10)
- Capabilities (Manufacturing, Assembly, QC, etc.)

## 🎯 Use Cases Demonstrated

### 1. E-commerce Product Search
Search products using natural language:
```bash
npm run cli search "wireless audio devices for working out"
```

### 2. Market Analysis
Analyze pricing trends:
```bash
npm run cli analyze pricing --category Electronics
```

### 3. Sentiment Analysis
Understand customer sentiment:
```bash
npm run cli analyze sentiment
```

### 4. Supplier Risk Assessment
Evaluate supplier risk:
```bash
# View supplier risk scores in demo output
npm run demo
```

### 5. Trend Detection
Identify trending products:
```bash
npm run cli analyze trends
```

## 🔍 Vector Search Examples

The platform uses semantic vector search. Here's how it works:

**Traditional keyword search**:
- Query: "coffee" → Matches: products with "coffee" in name/description

**Semantic vector search**:
- Query: "morning energy drink" → Matches: coffee, tea, matcha, energy drinks
- Query: "workout equipment" → Matches: yoga mat, resistance bands, water bottle
- Query: "healthy breakfast" → Matches: quinoa, organic cereals, protein powder

Try it:
```bash
npm run cli search "gift for fitness enthusiast"
npm run cli search "eco-friendly kitchen items"
npm run cli search "natural beauty products"
```

## 📡 API Integration

Once the server is running (`npm run cli serve`):

### Endpoints

**Search Products**:
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "organic food",
    "category": "Food & Beverage",
    "minPrice": 10,
    "maxPrice": 50,
    "limit": 5
  }'
```

**Get Platform Stats**:
```bash
curl http://localhost:3000/api/stats
```

**Run Analysis**:
```bash
curl -X POST http://localhost:3000/api/analyze/trends \
  -H "Content-Type: application/json" \
  -d '{"category": "Electronics"}'
```

**Get All Products**:
```bash
curl http://localhost:3000/api/products
```

**Get Single Product**:
```bash
curl http://localhost:3000/api/products/{id}
```

## 🎨 Customization

### Add More Sample Products

Edit `data/sample-products.json`:
```json
{
  "id": "prod-021",
  "name": "Your Product Name",
  "description": "Product description",
  "category": "Category",
  "price": 99.99,
  "currency": "USD",
  "brand": "Brand Name",
  "rating": 4.5,
  "reviewCount": 100,
  "tags": ["tag1", "tag2"],
  "source": "sample"
}
```

### Modify Demo Script

Edit `scripts/demo.ts`:
- Change product count (default: 50)
- Add new categories
- Adjust review distribution
- Customize analytics output

### Fetch Different Data

Edit `scripts/seed.ts`:
- Add new categories to fetch
- Increase/decrease products per category
- Add new data sources

## 🐛 Troubleshooting

### Demo fails with "ruvector not found"

```bash
# Option 1: Install globally
npm install -g ruvector

# Option 2: Let npx download it
# (happens automatically on first run)
```

### "No products found" when searching

```bash
# Run demo or seed first
npm run demo
# OR
npm run seed
```

### Port 3000 already in use

```bash
# Edit .env
PORT=3001

# Or specify port
npm run cli serve --port 3001
```

### TypeScript errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

## 📚 Learning Path

1. **Day 1**: Setup and Demo
   - Run `npm run setup`
   - Run `npm run demo`
   - Explore demo output

2. **Day 2**: Explore Features
   - Try different searches
   - Run various analyses
   - Test API endpoints

3. **Day 3**: Real Data
   - Run `npm run seed`
   - Search real products
   - Compare with demo data

4. **Week 2**: Customization
   - Add custom products
   - Create custom analyses
   - Integrate with apps

## 🎓 Advanced Topics

Once comfortable with basics:

1. **Custom Connectors**: Add new data sources
2. **Advanced Filters**: Complex search queries
3. **Batch Processing**: Process large datasets
4. **Custom Analytics**: Build custom insights
5. **API Integration**: Integrate with your apps
6. **Dashboard Development**: Build custom dashboards

## 📞 Support

- Check `QUICKSTART.md` for quick reference
- See `scripts/README.md` for script details
- Review `.env.example` for configuration
- Examine source code in `src/` for implementation

---

**Ready to explore?** Start with:

```bash
npm run setup && npm run demo
```

Then try searching:

```bash
npm run cli search "your first query here"
```

Happy exploring! 🚀
