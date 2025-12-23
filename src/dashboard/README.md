# EcommerceIQ Web Dashboard

A modern, professional web dashboard for the EcommerceIQ AI-powered e-commerce intelligence platform.

## Features

- **Modern Dark Theme UI** - Professional, eye-friendly dark interface
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Data** - Live updates and metrics
- **Interactive Charts** - Price intelligence and sentiment analysis visualizations
- **Semantic Search** - AI-powered product search
- **Trending Products** - Real-time trending product widget
- **Risk Assessment** - Market and competitive risk analysis
- **Data Ingestion Stats** - Monitor data sources and sync status

## Technology Stack

- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Alpine.js** - Lightweight JavaScript framework for reactivity (via CDN)
- **Chart.js** - Beautiful, responsive charts (via CDN)
- **Express.js** - Static file server and API proxy
- **TypeScript** - Type-safe backend

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

### Running the Dashboard

There are two ways to run the dashboard:

#### Option 1: Development Mode (with auto-reload)

```bash
npm run dashboard:dev
```

#### Option 2: Production Mode

```bash
npm run dashboard
```

The dashboard will be available at: **http://localhost:3001**

### Environment Variables

You can customize the server with these environment variables:

```bash
# Dashboard server port (default: 3001)
DASHBOARD_PORT=3001

# API server URL for proxying requests (default: http://localhost:3000)
API_URL=http://localhost:3000
```

Example:

```bash
DASHBOARD_PORT=8080 API_URL=http://api.example.com npm run dashboard
```

## Dashboard Sections

### 1. Search Bar
- Semantic AI-powered product search
- Type your query and press Enter or click Search
- Results appear in a grid below

### 2. Key Metrics
- **Total Products** - Current product count in database
- **Categories** - Number of product categories
- **Data Sources** - Active data source connections
- **Avg Sentiment** - Average sentiment score across products

### 3. Trending Products
- Top trending products based on ratings and popularity
- Filter by category
- Real-time updates

### 4. Price Intelligence
- Price trends over time
- Comparison with competitor pricing
- Interactive line charts
- Filter by category

### 5. Sentiment Overview
- Product sentiment distribution
- Positive, neutral, and negative breakdown
- Visual doughnut chart

### 6. Risk Assessment
- Price volatility monitoring
- Stock shortage alerts
- Competition risk analysis
- Demand fluctuation tracking

### 7. Data Ingestion
- Active data source status
- Last sync timestamps
- Record counts per source
- Connection health indicators

## API Integration

The dashboard automatically connects to the API server through a proxy. All `/api/*` requests are forwarded to the configured API server.

### API Endpoints Used

- `GET /api/products/search` - Semantic product search
- `GET /api/products` - List products with filters
- `GET /api/stats` - Platform statistics
- `GET /api/products/:id` - Get product details
- `GET /api/products/:id/similar` - Find similar products

### Fallback Mode

If the API server is not available, the dashboard will display demo data to showcase functionality.

## Customization

### Styling

The dashboard uses Tailwind CSS with a custom dark theme. You can customize colors by modifying the `tailwind.config` in the `<script>` section of `index.html`:

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f172a',  // Background
          800: '#1e293b',  // Cards
          700: '#334155',  // Borders
          600: '#475569',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',  // Primary accent
          pink: '#ec4899',
          green: '#10b981',
        }
      }
    }
  }
}
```

### Adding New Features

The dashboard uses Alpine.js for reactivity. To add new features:

1. Add new data properties in the `dashboard()` function
2. Create new UI sections in the HTML
3. Use `x-data`, `x-model`, `x-show`, etc. directives for interactivity

Example:

```html
<div x-data="{ count: 0 }">
  <button @click="count++">Increment</button>
  <span x-text="count"></span>
</div>
```

### Adding Charts

Use Chart.js to create new visualizations:

```javascript
createMyChart() {
  const ctx = document.getElementById('myChart');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Sales',
        data: [12, 19, 3]
      }]
    }
  });
}
```

## Architecture

```
┌─────────────────┐
│   Browser       │
│   (Dashboard)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Static Server   │
│ (Express.js)    │
│  - Serve HTML   │
│  - API Proxy    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   API Server    │
│ (Main Backend)  │
└─────────────────┘
```

## Health Check

Check server status:

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "api": {
    "configured": "http://localhost:3000",
    "reachable": true
  }
}
```

## Troubleshooting

### Dashboard won't start

- Check that port 3001 is not already in use
- Verify Node.js version is >= 18.0.0
- Run `npm install` to ensure dependencies are installed

### API requests failing

- Ensure the main API server is running
- Check the API_URL environment variable
- Verify CORS is properly configured on the API server
- Check browser console for error messages

### Charts not displaying

- Check browser console for JavaScript errors
- Ensure Chart.js loaded properly from CDN
- Verify chart canvas elements have proper IDs

## Production Deployment

For production deployment:

1. Build the TypeScript:

```bash
npm run build
```

2. Run the compiled server:

```bash
node dist/dashboard/static-server.js
```

3. Consider using a process manager:

```bash
# Using PM2
pm2 start dist/dashboard/static-server.js --name ecommerce-dashboard

# Using systemd
sudo systemctl start ecommerce-dashboard
```

4. Set up reverse proxy (nginx example):

```nginx
server {
  listen 80;
  server_name dashboard.example.com;

  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## Performance

- Single HTML file with embedded CSS/JS
- CDN assets cached by browser
- Minimal dependencies
- Optimized bundle size
- Lazy loading for charts

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - See parent project LICENSE file

## Support

For issues or questions:
- Check the main project documentation
- Review API documentation
- Open an issue on GitHub
