# Dashboard API Reference

This document describes the API endpoints that the dashboard consumes.

## Base URL

```
/api
```

All API requests are proxied through the static server to the main API backend.

## Endpoints

### 1. Get Platform Statistics

Get overall platform statistics and metrics.

**Endpoint**: `GET /api/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalProducts": 15234,
    "totalCategories": 24,
    "totalSources": 8,
    "avgSentiment": 7.8,
    "categories": [
      "Electronics",
      "Fashion",
      "Home & Garden",
      "Sports",
      "Books",
      "Toys"
    ],
    "sources": [
      "Amazon",
      "eBay",
      "Walmart",
      "Target"
    ]
  }
}
```

**Used By**: Key metrics cards

---

### 2. Search Products

Semantic search for products using AI.

**Endpoint**: `GET /api/products/search`

**Query Parameters**:
- `query` (string, required): Search query
- `limit` (number, optional): Results limit (default: 10)
- `category` (string, optional): Filter by category
- `threshold` (number, optional): Similarity threshold 0-1 (default: 0.7)

**Example Request**:
```
GET /api/products/search?query=wireless+headphones&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": {
    "query": "wireless headphones",
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Wireless Earbuds Pro",
        "description": "Premium wireless earbuds...",
        "category": "Electronics",
        "price": 149.99,
        "currency": "USD",
        "brand": "AudioTech",
        "rating": 4.8,
        "reviewCount": 2547,
        "tags": ["wireless", "bluetooth"],
        "source": "Amazon",
        "similarity": 0.92
      }
    ],
    "count": 1,
    "threshold": 0.7
  }
}
```

**Used By**: Search bar, search results grid

---

### 3. List Products

Get a paginated list of products with filters.

**Endpoint**: `GET /api/products`

**Query Parameters**:
- `limit` (number, optional): Results per page (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)
- `category` (string, optional): Filter by category
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `sortBy` (string, optional): Sort field (name, price, category)
- `sortOrder` (string, optional): Sort order (asc, desc)
- `source` (string, optional): Filter by data source

**Example Request**:
```
GET /api/products?category=Electronics&sortBy=price&sortOrder=desc&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Wireless Earbuds Pro",
        "category": "Electronics",
        "price": 149.99,
        "rating": 4.8,
        "reviewCount": 2547
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    },
    "filters": {
      "category": "Electronics",
      "minPrice": null,
      "maxPrice": null,
      "source": null,
      "sortBy": "price",
      "sortOrder": "desc"
    }
  }
}
```

**Used By**: Trending products widget

---

### 4. Get Product by ID

Get detailed information about a specific product.

**Endpoint**: `GET /api/products/:id`

**Path Parameters**:
- `id` (string, required): Product UUID

**Example Request**:
```
GET /api/products/550e8400-e29b-41d4-a716-446655440001
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Wireless Earbuds Pro",
    "description": "Premium wireless earbuds with active noise cancellation",
    "category": "Electronics",
    "price": 149.99,
    "currency": "USD",
    "brand": "AudioTech",
    "imageUrl": "https://example.com/image.jpg",
    "rating": 4.8,
    "reviewCount": 2547,
    "tags": ["wireless", "bluetooth", "noise-cancelling"],
    "metadata": {},
    "source": "Amazon",
    "sourceUrl": "https://amazon.com/product",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Used By**: Product detail modals (future feature)

---

### 5. Find Similar Products

Find products similar to a given product.

**Endpoint**: `GET /api/products/:id/similar`

**Path Parameters**:
- `id` (string, required): Product UUID

**Query Parameters**:
- `limit` (number, optional): Results limit (default: 10)
- `threshold` (number, optional): Similarity threshold 0-1 (default: 0.7)

**Example Request**:
```
GET /api/products/550e8400-e29b-41d4-a716-446655440001/similar?limit=5
```

**Response**:
```json
{
  "success": true,
  "data": {
    "productId": "550e8400-e29b-41d4-a716-446655440001",
    "similar": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Wireless Headphones Pro",
        "category": "Electronics",
        "price": 199.99,
        "rating": 4.7,
        "similarity": 0.89
      }
    ],
    "count": 1,
    "threshold": 0.7
  }
}
```

**Used By**: Product recommendations (future feature)

---

### 6. Match Products

Find products matching a natural language description.

**Endpoint**: `POST /api/products/match`

**Request Body**:
```json
{
  "description": "I need wireless headphones for gaming with good bass",
  "limit": 10,
  "filters": {
    "category": "Electronics",
    "maxPrice": 200
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "description": "I need wireless headphones for gaming with good bass",
    "matches": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Gaming Headphones Pro",
        "category": "Electronics",
        "price": 179.99,
        "rating": 4.6,
        "matchScore": 0.94
      }
    ],
    "count": 1,
    "filters": {
      "category": "Electronics",
      "maxPrice": 200
    }
  }
}
```

**Used By**: Advanced search (future feature)

---

## Analytics Endpoints (Future)

These endpoints are planned for future implementation:

### Get Trend Analysis
```
GET /api/analytics/trends?category=Electronics&period=30d
```

### Get Sentiment Analysis
```
GET /api/analytics/sentiment?productIds[]=uuid1&productIds[]=uuid2
```

### Get Price Analysis
```
GET /api/analytics/pricing?category=Electronics
```

### Get Competitive Analysis
```
GET /api/analytics/competitive?category=Electronics&brands[]=Brand1
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - API server unavailable

---

## Rate Limiting

The API implements rate limiting:

- **Standard endpoints**: 100 requests per minute
- **Search endpoints**: 30 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Data Refresh Strategy

The dashboard uses the following data refresh strategy:

1. **On Load**: Fetch all initial data
2. **Auto Refresh**: Every 30 seconds for stats
3. **Manual Refresh**: User can trigger via button
4. **Search**: On-demand when user searches

---

## Fallback Behavior

When the API is unavailable:

1. Dashboard displays demo/sample data
2. User is notified via status indicator
3. Search uses client-side filtering on demo data
4. Charts display with sample datasets

---

## CORS Configuration

The static server is configured to allow CORS for all origins in development:

```javascript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## WebSocket Support (Future)

Real-time updates via WebSocket planned:

```
ws://localhost:3001/ws

Events:
- product.created
- product.updated
- product.deleted
- stats.updated
- ingestion.started
- ingestion.completed
```

---

## Authentication (Future)

API key authentication planned:

```
Authorization: Bearer YOUR_API_KEY
```

Response when missing:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key required"
}
```
