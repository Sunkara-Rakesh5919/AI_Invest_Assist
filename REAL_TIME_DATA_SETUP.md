# Real-Time Data Fetching Setup Guide

## Overview
The AI Stock Market Advisor now fetches real-time market data from multiple finance APIs with automatic fallback and caching mechanisms.

## Data Sources (in order of preference)

### 1. **Alpha Vantage** (Primary)
- **Website**: https://www.alphavantage.co/
- **Features**: Global stock quotes, technical indicators, forex, crypto
- **Free Plan**: 5 calls/minute, 500 requests/day
- **Setup**:
  ```javascript
  // Get your API key from: https://www.alphavantage.co/
  const API_CONFIG = {
    ALPHA_VANTAGE: {
      key: 'YOUR_API_KEY_HERE', // Replace 'demo' with your key
      ...
    }
  };
  ```
- **Endpoint**: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=TCS&apikey=YOUR_KEY`

### 2. **Finnhub** (Secondary)
- **Website**: https://finnhub.io/
- **Features**: Real-time stock data, company news, earnings
- **Free Plan**: 60 calls/minute
- **Setup**:
  ```javascript
  const API_CONFIG = {
    FINNHUB: {
      key: 'YOUR_FINNHUB_KEY', // Get from https://finnhub.io/
      ...
    }
  };
  ```
- **Endpoint**: `https://finnhub.io/api/v1/quote?symbol=TCS&token=YOUR_KEY`

### 3. **NSE India Direct** (Indian Market Native)
- **Website**: https://www.nseindia.com/
- **Features**: Live Indian NSE stock data
- **Rate Limit**: Public access available
- **Setup**: Automatic (no API key needed for public data)
- **Endpoint**: `https://www.nseindia.com/api/quote-equity?symbol=TCS`

### 4. **Yahoo Finance** (via RapidAPI)
- **Website**: https://rapidapi.com/apidojo/api/yahoo-finance1
- **Features**: Historical data, financial statements, analyst recommendations
- **Setup**:
  ```javascript
  headers: {
    'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY',
    'x-rapidapi-host': 'yh-finance.p.rapidapi.com'
  }
  ```

## How Real-Time Data Fetching Works

### 1. **Initialization** (`fetchRealTimeData()`)
- When the app loads, it automatically fetches real-time data for:
  - **Top 3 Stocks**: TCS, INFY, RELIANCE
  - **Penny Stocks**: SUZLON, VEDL, YESBANK, ADANIPORTS, NATIONALSTL, BHEL, SAIL, JSWSTEEL, TATASTEEL, NMDC
  - **Major Banks**: SBIN, ICICIBANK, BANKBARODA

### 2. **Multi-Source Fallback**
```
Try Alpha Vantage → Try Finnhub → Try NSE Direct → Use Last Known Cache
```

### 3. **Caching Mechanism**
- **Cache Duration**: 5 minutes
- **Automatic Refresh**: Every 5 minutes
- **Manual Refresh**: Press `Ctrl+R` in the browser to force refresh

### 4. **Target Price Calculation**
Once real current price is fetched, target prices are calculated dynamically:
```javascript
LOW RISK:       target = current × 1.10  (10% upside)
MEDIUM RISK:    target = current × 1.18  (18% upside)
HIGH RISK:      target = current × 1.28  (28% upside)
```

## Setting Up Your Own API Keys

### **Step 1: Alpha Vantage (Recommended)**
1. Visit https://www.alphavantage.co/
2. Click "GET FREE API KEY"
3. Enter your email
4. Copy the API key
5. Replace `'demo'` in line 13 of `app.js`:
   ```javascript
   ALPHA_VANTAGE: {
       key: 'YOUR_COPIED_KEY_HERE',
       ...
   }
   ```

### **Step 2: Finnhub (Recommended)**
1. Visit https://finnhub.io/register
2. Create a free account
3. Dashboard → Settings → Copy your API key
4. Replace `'demo_key'` in line 22 of `app.js`:
   ```javascript
   FINNHUB: {
       key: 'YOUR_COPIED_KEY_HERE',
       ...
   }
   ```

### **Step 3: Yahoo Finance (Optional)**
1. Visit https://rapidapi.com/apidojo/api/yahoo-finance1
2. Click "Subscribe to Test"
3. Copy your API key from your RapidAPI dashboard
4. Update line 227 in `app.js`

## Current Data Status

### Working Without API Keys:
- ✅ NSE India Direct API (public, no key needed)
- ✅ All static calculations and AI analysis
- ✅ Local UI and navigation

### Requires API Keys for Full Functionality:
- 📊 Alpha Vantage (real-time global prices)
- 📈 Finnhub (real-time data + news)
- 💹 Yahoo Finance (detailed historical data)

## Testing Real-Time Data

### Check Console Logs:
```javascript
// Open browser Developer Console (F12)
// Look for messages like:
// "Fetching real-time market data..."
// "Real-time data fetched: Map(11) { ... }"
// "[Finance API Service] Alpha Vantage data for TCS: ₹3850"
```

### View Data Source Status:
```javascript
// In browser console, the app logs:
console.group('📡 Data Source Status');
// Shows which stocks are using which data sources
```

### Monitor Automatic Refresh:
- Watch the 🔄 refresh indicator pulse in the header
- Data refreshes every 5 minutes automatically

## Fixing "Fetching Real Time Data" Display Issue

If you see "Fetching..." but prices don't appear:

1. **Check API Key Configuration**
   - Open browser Developer Tools (F12)
   - Go to Network tab
   - Refresh page
   - Look for failed API requests (red color)

2. **Check CORS Issues**
   - Some APIs have CORS restrictions
   - Use RapidAPI proxy for Yahoo Finance
   - NSE India is CORS-friendly by default

3. **Verify API Rate Limits**
   - Don't exceed 5 calls/minute for Alpha Vantage
   - Finnhub allows 60 calls/minute
   - Wait a few seconds between API key tests

## Example API Response Handling

### Alpha Vantage Response:
```json
{
  "Global Quote": {
    "01. symbol": "TCS",
    "05. price": "3850.00",
    "06. volume": "1234567",
    "09. change": "45.50",
    "10. change percent": "1.20%"
  }
}
```

### Finnhub Response:
```json
{
  "c": 3850.00,
  "h": 3880.00,
  "l": 3820.00,
  "o": 3835.00,
  "pc": 3804.50,
  "t": 1638900000,
  "v": 2345678
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Tata Steel ₹1150" | Hardcoded fallback | Add API key, refresh page |
| Prices show "null" | API key invalid | Check API key format |
| "Rate limit exceeded" | Too many requests | Wait 60 seconds, data is cached |
| CORS error | API blocked by browser | Use proxy or RapidAPI endpoint |
| Refresh shows old data | Cache not expired | Wait 5 min or press Ctrl+R |

## Production Deployment

### For Live Deployment:
1. **Never commit API keys** to GitHub
2. **Use environment variables**:
   ```javascript
   // In index.html header:
   const API_CONFIG = {
       ALPHA_VANTAGE: {
           key: process.env.ALPHA_VANTAGE_KEY,
           ...
       }
   };
   ```

3. **Add backend proxy** for free API keys:
   - Create Node.js/Python backend
   - Backend makes API calls with your keys
   - Frontend requests from backend (CORS-free)
   - Add rate limiting on backend

4. **Use proper secrets management**:
   - GitHub Secrets for CI/CD
   - AWS Secrets Manager
   - Azure Key Vault
   - Heroku Config Vars

## Monitoring & Debugging

### Enable Debug Logs:
Add this to browser console:
```javascript
advisor.apiService.debug = true;
advisor.apiService.checkRateLimit = function() { 
  console.log(`Requests this minute: ${this.requestCount}/${this.rateLimit}`); 
  return true; 
};
```

### View Cache Status:
```javascript
// In console:
advisor.apiService.cache  // Shows all cached data
advisor.realTimeData      // Shows fetched real-time data
```

## Future Enhancements

- [ ] WebSocket connection for tick-by-tick updates
- [ ] Database backend for historical data retention
- [ ] Advanced charting with TradingView widget
- [ ] Mobile app with push notifications
- [ ] Machine learning model improvements
- [ ] Options data integration

## Support

For API issues:
- Alpha Vantage Support: https://www.alphavantage.co/support/
- Finnhub Support: https://finnhub.io/docs/api
- NSE Help: https://www.nseindia.com/
- This Project: Check app.js `FinanceAPIService` class documentation

---

**Last Updated**: December 6, 2025
**Status**: ✅ Real-Time Data Integration Complete
**Next Step**: Add your API keys and refresh the page!
