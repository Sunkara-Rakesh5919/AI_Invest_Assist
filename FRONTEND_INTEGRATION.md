# Frontend-Backend Integration Guide

## 🔗 Overview

This guide shows how to integrate the frontend (`app.js`) with the new backend server to enable:
- Secure API key management
- Real-time WebSocket updates
- Historical data for charting
- Reduced API latency via caching

---

## 📦 Current Architecture

### Before (Direct API Calls)
```
Frontend (app.js) 
    ↓ (direct HTTP calls with exposed keys)
    ├─ Alpha Vantage API
    ├─ Finnhub API
    ├─ NSE India API
    └─ Yahoo Finance API
```

**Problems**:
- ❌ API keys visible in frontend code
- ❌ 5-minute polling (not real-time)
- ❌ No data persistence
- ❌ Rate limiting issues

### After (Backend Proxy)
```
Frontend (app.js) 
    ├─ HTTP Requests → Backend Server
    │   ├─ GET /api/stock/TCS
    │   ├─ GET /api/stocks?symbols=...
    │   └─ GET /api/historical/TCS?days=30
    │
    └─ WebSocket Connection → Backend Server
        ├─ subscribe('TCS')
        ├─ subscribe('INFY')
        └─ receive updates (~30 sec interval)
        
Backend Server (server.js)
    ├─ Cache Layer (5-minute expiry)
    ├─ SQLite Database
    └─ Multi-Source API Proxy
        ├─ Alpha Vantage API
        ├─ Finnhub API
        ├─ NSE India API
        └─ Fallback Chain
```

**Benefits**:
- ✅ API keys never exposed to frontend
- ✅ Real-time updates via WebSocket
- ✅ Historical data in SQLite
- ✅ Smart rate limiting
- ✅ Reduced latency via caching

---

## 🚀 Integration Steps

### Step 1: Backend Setup

First, ensure backend is running:

```bash
cd backend
npm install
cp .env.example .env
# Add your API keys to .env
npm start
```

Expected output:
```
✅ Server running on: http://localhost:5000
✅ WebSocket available on: ws://localhost:5000
```

### Step 2: Update index.html

Add the backend client library before `app.js`:

```html
<!-- Before app.js -->
<script src="backend/client.js"></script>
<script src="app.js"></script>
```

### Step 3: Modify app.js Initialization

Replace direct API calls with backend client:

```javascript
class AIStockAdvisor {
    constructor() {
        // Initialize backend client
        this.apiClient = new BackendClient('http://localhost:5000');
        
        this.stocks = this.initializeStocks();
        this.selectedStocks = [];
        this.priceHistory = {};
        this.predictions = {};
        this.riskProfiles = {
            conservative: { minReturn: 8, maxRisk: 15 },
            balanced: { minReturn: 12, maxRisk: 25 },
            aggressive: { minReturn: 18, maxRisk: 40 }
        };
    }

    async init() {
        try {
            // Connect to backend WebSocket
            console.log('🔌 Connecting to backend...');
            await this.apiClient.connectWebSocket();
            console.log('✅ Backend connected!');
            
            // Fetch initial real-time data
            const symbols = this.getAllSymbols();
            console.log(`📡 Fetching data for ${symbols.length} stocks...`);
            
            const stocksData = await this.apiClient.getStocks(symbols);
            this.updateStocksWithRealData(stocksData);
            
            // Subscribe to real-time updates
            symbols.forEach(symbol => {
                this.apiClient.subscribe(symbol, (priceData) => {
                    this.handleRealTimeUpdate(symbol, priceData);
                });
            });
            
            // Setup UI
            this.setupUI();
            this.attachEventListeners();
            this.render();
            
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            console.warn('⚠️ Falling back to local mode (limited features)');
            // Fallback to local mode
            this.setupUI();
            this.attachEventListeners();
            this.render();
        }
    }

    // Real-time update handler
    handleRealTimeUpdate(symbol, priceData) {
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (stock) {
            const oldPrice = stock.current || 0;
            stock.current = priceData.current || oldPrice;
            stock.high = priceData.high || stock.high;
            stock.low = priceData.low || stock.low;
            stock.volume = priceData.volume || stock.volume;
            stock.change = stock.current - oldPrice;
            stock.changePercent = ((stock.change / oldPrice) * 100).toFixed(2);
            
            // Update UI for this stock
            this.updateStockUI(symbol);
            console.log(`📊 ${symbol}: ₹${stock.current} (${stock.changePercent}%)`);
        }
    }

    // Fetch historical data for charting
    async fetchHistoricalData(symbol, days = 30) {
        try {
            const historicalData = await this.apiClient.getHistoricalData(symbol, days);
            this.priceHistory[symbol] = historicalData;
            return historicalData;
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            return [];
        }
    }

    // Get cache status
    async getCacheStatus() {
        try {
            const status = await this.apiClient.getCacheStatus();
            console.log('📊 Cache Status:', status);
            return status;
        } catch (error) {
            console.error('Error getting cache status:', error);
            return null;
        }
    }

    // Disconnect on page unload
    cleanup() {
        if (this.apiClient) {
            this.apiClient.disconnect();
        }
    }
}

// Initialize on page load
const advisor = new AIStockAdvisor();
advisor.init();

// Cleanup on page unload
window.addEventListener('beforeunload', () => advisor.cleanup());
```

### Step 4: Update UI Components

Modify the stock display to show real-time data:

```javascript
updateStockUI(symbol) {
    const stock = this.stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const card = document.querySelector(`[data-symbol="${symbol}"]`);
    if (!card) return;

    // Update price
    const priceEl = card.querySelector('.stock-price');
    if (priceEl) {
        priceEl.textContent = `₹${stock.current?.toFixed(2) || 'N/A'}`;
        
        // Add animation effect
        priceEl.style.animation = 'pulse 0.5s ease-out';
        setTimeout(() => {
            priceEl.style.animation = 'none';
        }, 500);
    }

    // Update change
    const changeEl = card.querySelector('.stock-change');
    if (changeEl) {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        changeEl.textContent = `${stock.change > 0 ? '+' : ''}₹${stock.change?.toFixed(2) || '0'} (${stock.changePercent}%)`;
        changeEl.className = `stock-change ${changeClass}`;
    }

    // Update status
    const statusEl = card.querySelector('.update-status');
    if (statusEl) {
        statusEl.textContent = '🔴 LIVE';
        statusEl.style.color = '#10b981';
    }
}

renderStockCard(stock) {
    return `
        <article class="stock-card" data-symbol="${stock.symbol}" role="region" aria-label="${stock.symbol} stock information">
            <header class="stock-header">
                <h3 class="stock-name">${stock.name}</h3>
                <span class="stock-symbol">${stock.symbol}</span>
                <span class="update-status" title="Real-time update status">🔴 LIVE</span>
            </header>
            
            <div class="stock-content">
                <div class="price-section">
                    <div class="stock-price" role="status">₹${stock.current?.toFixed(2) || 'Loading...'}</div>
                    <div class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}" role="status">
                        ${stock.change > 0 ? '+' : ''}₹${stock.change?.toFixed(2) || '0'} (${stock.changePercent}%)
                    </div>
                </div>
                
                <div class="stock-details">
                    <div class="detail">
                        <span class="label">High:</span>
                        <span class="value">₹${stock.high?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Low:</span>
                        <span class="value">₹${stock.low?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Volume:</span>
                        <span class="value">${this.formatVolume(stock.volume)}</span>
                    </div>
                </div>
            </div>
            
            <div class="stock-actions">
                <button class="btn btn-primary" onclick="advisor.selectStock('${stock.symbol}')">
                    Select
                </button>
                <button class="btn btn-secondary" onclick="advisor.viewChart('${stock.symbol}')">
                    Chart
                </button>
            </div>
        </article>
    `;
}
```

### Step 5: Add Chart Integration

Fetch and display historical data:

```javascript
async viewChart(symbol) {
    try {
        console.log(`📈 Loading chart for ${symbol}...`);
        
        // Fetch historical data
        const historicalData = await this.fetchHistoricalData(symbol, 30);
        
        if (!historicalData || historicalData.length === 0) {
            console.warn('No historical data available');
            return;
        }

        // Prepare data for chart
        const labels = historicalData.map(d => d.date);
        const closes = historicalData.map(d => parseFloat(d.close));
        
        // Create modal with chart
        this.showChartModal(symbol, labels, closes);
        
    } catch (error) {
        console.error(`Error loading chart for ${symbol}:`, error);
        alert('Failed to load chart. Please try again.');
    }
}

showChartModal(symbol, labels, data) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <header class="modal-header">
                <h2>${symbol} - 30 Day Chart</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
            </header>
            <canvas id="stockChart"></canvas>
            <footer class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </footer>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Optional: Integrate Chart.js for better visualization
    // require(['https://cdn.jsdelivr.net/npm/chart.js'], (Chart) => {
    //     new Chart(document.getElementById('stockChart'), {
    //         type: 'line',
    //         data: {
    //             labels: labels,
    //             datasets: [{
    //                 label: symbol,
    //                 data: data,
    //                 borderColor: '#3b82f6',
    //                 fill: false
    //             }]
    //         }
    //     });
    // });
}
```

---

## 🔄 Migration Checklist

- [ ] Backend server installed and running
- [ ] `.env` file configured with API keys
- [ ] `backend/client.js` linked in `index.html`
- [ ] `app.js` updated with BackendClient initialization
- [ ] `init()` method refactored to use `apiClient`
- [ ] Real-time update handler implemented
- [ ] Historical data fetching implemented
- [ ] Chart display implemented
- [ ] Error handling for backend unavailability
- [ ] Cleanup handler added (`beforeunload`)
- [ ] Tested in development environment
- [ ] Tested with backend enabled and disabled
- [ ] Performance verified (real-time responsiveness)
- [ ] Deploy backend to production
- [ ] Update frontend to production backend URL

---

## 🧪 Testing

### Test Backend Connection

```javascript
// In browser console
const client = new BackendClient('http://localhost:5000');
await client.connectWebSocket();
console.log('Connected!');

// Test health check
const health = await client.healthCheck();
console.log('Health:', health);

// Test single stock
const tcs = await client.getStock('TCS');
console.log('TCS:', tcs);

// Subscribe to updates
client.subscribe('TCS', (data) => {
    console.log('Update:', data);
});
```

### Test Real-Time Updates

```javascript
// Watch console for updates every ~30 seconds
// Each update should show new price data
```

### Test Fallback

Stop the backend:
```bash
# Terminal: Press Ctrl+C in backend terminal
```

Frontend should gracefully handle the disconnection and display cached data.

---

## 🔗 Environment Configuration

### Development

```javascript
// app.js
const BACKEND_URL = 'http://localhost:5000';
const apiClient = new BackendClient(BACKEND_URL);
```

### Production

```javascript
// app.js
const BACKEND_URL = 'https://api.yourdomain.com';
const apiClient = new BackendClient(BACKEND_URL);
```

---

## 📊 Data Flow Diagram

```
User Action (Open Stock Page)
    ↓
app.js init()
    ├─ Instantiate BackendClient
    ├─ Connect WebSocket
    │   ├─ Server.js receives connection
    │   ├─ Added to subscribers list
    │   └─ Keep-alive heartbeat started
    │
    └─ apiClient.getStocks()
        ├─ HTTP GET /api/stocks?symbols=...
        ├─ Backend checks cache (5-min expiry)
        ├─ If cached: return instantly
        ├─ If expired: Call 3 APIs (Alpha → Finnhub → NSE)
        ├─ Store in SQLite
        └─ Return to frontend
    
Real-Time Updates (Every 30 seconds)
    ├─ Backend broadcasts to WebSocket clients
    ├─ Frontend receives priceData
    ├─ handleRealTimeUpdate() called
    ├─ Stock object updated
    ├─ UI updated with animation
    └─ User sees real-time price
```

---

## ⚡ Performance Tips

1. **Batch requests**: Fetch multiple stocks in one call instead of individual requests
2. **Use WebSocket**: More efficient than polling
3. **Cache aggressively**: 5-minute cache reduces API calls by 75%
4. **Lazy load charts**: Load historical data only when viewing chart
5. **Debounce UI updates**: Throttle UI renders to 1-2 per second

---

## 🆘 Troubleshooting

### "Cannot connect to backend"
```
✅ Check backend is running: npm start
✅ Check port: http://localhost:5000/health
✅ Check firewall
✅ Check CORS configuration in .env
```

### "Real-time updates not working"
```
✅ Check WebSocket connection: client.getStatus()
✅ Check subscription: client.subscribe()
✅ Check console for errors
✅ Verify backend broadcasts enabled
```

### "Data is stale"
```
✅ Check cache expiry time
✅ Manual refresh: Ctrl+Shift+Del and reload
✅ Call getCacheStatus() to debug
✅ Check API key limits (not rate limited)
```

---

## 📚 Next Steps

1. ✅ Set up backend server
2. ✅ Integrate frontend with backend
3. ✅ Enable WebSocket for real-time updates
4. ✅ Implement charting with historical data
5. ✅ Add technical indicators
6. ✅ Deploy to production

---

**Status**: Ready for Integration  
**Last Updated**: December 6, 2025
