# Testing Guide - Real-Time API Integration

## Quick Start (5 minutes)

### Step 1: Get Free API Keys

#### Alpha Vantage (Recommended)
1. Go to https://www.alphavantage.co
2. Click "GET FREE API KEY"
3. Enter your email → Check email inbox
4. Copy the API key

#### Finnhub
1. Go to https://finnhub.io
2. Sign up with email
3. Go to Dashboard → API Keys tab
4. Copy your API key

### Step 2: Add API Keys to app.js

Open `app.js` in a text editor and find the `API_CONFIG` section around line 50:

```javascript
const API_CONFIG = {
    alphavantage: {
        apiKey: 'REPLACE_WITH_YOUR_KEY',  // ← Paste your Alpha Vantage key here
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: 5
    },
    finnhub: {
        apiKey: 'REPLACE_WITH_YOUR_KEY',  // ← Paste your Finnhub key here
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimit: 60
    },
    ...
};
```

**Replace** the placeholder text with your actual API keys.

### Step 3: Open the App

1. Open `index.html` in your web browser
2. Go to the **Home** page (Top Picks)
3. You should see a "Real-Time Data Sources" widget showing API status
4. Check the **Console** (F12 → Console tab) for logs

## Testing with Indian Stocks

The app includes support for Indian stocks through NSE data (no API key needed):

### Test Stocks (NSE - Indian Market)
Open the app and it will fetch real data for:
- **INFY** - Infosys Limited
- **TCS** - Tata Consultancy Services  
- **RELIANCE** - Reliance Industries
- **HDFCBANK** - HDFC Bank
- **WIPRO** - Wipro Limited

### Expected Behavior
1. App loads → Fetches real prices from NSE
2. Stock cards show:
   - 📡 Real price (not mocked)
   - 📊 Volume, High, Low data
   - 🔄 API source indicator
3. Console shows:
   ```
   [API] Attempting to fetch INFY from Alpha Vantage
   [API] Stock data cached: INFY expires at [time]
   ```

## Testing with US Stocks

To test with US stocks (requires Alpha Vantage key):

1. Stock symbols to try:
   - AAPL (Apple)
   - GOOGL (Google)
   - MSFT (Microsoft)
   - AMZN (Amazon)

2. App will attempt APIs in order:
   - Alpha Vantage → Finnhub → Yahoo Finance → NSE

3. Console will show which API succeeded

## Console Monitoring

Open Browser Console (Press F12):

### Looking for Success Indicators:
```
✅ [API] Successfully fetched INFY from Alpha Vantage
✅ [API] Stock data cached: INFY expires at 14:35:22
✅ 📡 Data Source Status:
   Alpha Vantage: 3 stocks
   Finnhub: 2 stocks
   NSE: 5 stocks
```

### Troubleshooting Errors:
```
❌ [ERROR] Invalid API key for Alpha Vantage
❌ [ERROR] Rate limit exceeded
❌ [ERROR] Network error: CORS not allowed
```

If you see errors:
1. Check API key spelling (no extra spaces)
2. Verify API quota on service dashboard
3. Try a different API (app auto-fallbacks)

## Testing Rate Limiting & Caching

The app has built-in protections:

### Rate Limiting (5 calls/minute)
- Try refreshing rapidly
- App will queue calls automatically
- Console shows: `[API] Rate limited - queuing request`

### Caching (5 minute expiry)
- Fetch a stock data
- Console shows: `expires at [time]`
- Refresh within 5 min → Uses cache (no new API call)
- After 5 min → Fetches fresh data

## Testing Fallback Chain

### Force Fallback Testing:
1. Add wrong API key to Alpha Vantage
2. Refresh app
3. Console shows:
   ```
   ❌ Alpha Vantage failed
   ↓ Trying Finnhub...
   ✅ Finnhub succeeded!
   ```

## Visual Testing

### Home Page Widget
Shows real-time indicator:
```
📡 Real-Time Data Sources
Alpha Vantage: 3 stocks
Finnhub: 2 stocks
NSE: 5 stocks
⏱️ Last refreshed: 14:30:45
```

### Stock Cards
Each card shows:
- ✅ Real-time price (from API)
- ✅ Source indicator (Alpha Vantage, Finnhub, NSE, etc.)
- ✅ Last updated timestamp
- ✅ Volume, High, Low data

### Auto-Refresh Testing
1. Open app
2. Go to Home page
3. Watch Console (F12)
4. Every 5 minutes, you'll see:
   ```
   [AUTO-REFRESH] Fetching all stocks...
   [API] Fetching stock data for 10 stocks
   ```

## Expected Response Times

| API | Average Time | Status |
|-----|--------------|--------|
| Alpha Vantage | 1-2 sec | ✅ Free tier: 5 calls/min |
| Finnhub | 0.5-1 sec | ✅ Free tier: 60 calls/min |
| NSE | 1-2 sec | ✅ No key needed |
| Yahoo Finance | 2-3 sec | ⚠️ Requires RapidAPI |

## Common Issues & Solutions

### Issue: "No data showing"
**Solution:**
1. Check console for errors (F12)
2. Verify API keys have no spaces
3. Check API quota on dashboard
4. Try NSE stocks (no key needed)

### Issue: "Only seeing mock data"
**Solution:**
1. Verify API keys are added to app.js
2. Check console for which API is being used
3. Ensure stock symbols are correct
4. Allow ~2-3 seconds for first load

### Issue: "Rate limit exceeded"
**Solution:**
1. Wait 1 minute - rate limit resets
2. App automatically queues requests
3. Data is cached for 5 minutes
4. Check console: `[API] Rate limited - queuing`

### Issue: "CORS error"
**Solution:**
1. This is normal for direct API calls
2. App automatically tries next API
3. NSE often has CORS restrictions (ok - fallback works)
4. Yahoo Finance requires proxy (RapidAPI)

## Data Accuracy Check

### Verify Real Data:
1. Open app
2. Go to Home page
3. Note INFY price shown
4. Open NSE website: https://www.nseindia.com
5. Search INFY and compare prices
6. Should match! (with ~2 min delay possible)

## Performance Monitoring

### Check in Console:
```javascript
// Paste in console to see cache status:
advisor.apiService.cache
// Shows all cached data with expiry times

// See API call history:
advisor.logDataSourceStatus()
// Shows which APIs provided current data

// Manual refresh:
advisor.refreshAllData()
// Fetches all fresh data
```

## Next Steps

✅ **Completed:**
- Real-time API integration
- 4 API sources with fallback
- Caching and rate limiting
- Console logging and status widget

🚀 **Ready to:**
1. Test with your API keys
2. Monitor real market data
3. Get AI-powered recommendations
4. Track portfolio performance

## Support

If issues persist:

1. **Check Console Logs** (F12 → Console)
2. **Review API Docs:**
   - Alpha Vantage: https://www.alphavantage.co/documentation/
   - Finnhub: https://finnhub.io/docs/api
3. **Verify API Status:**
   - Alpha Vantage Dashboard: https://www.alphavantage.co/
   - Finnhub Status: https://status.finnhub.io/
4. **Test Individual API:**
   ```javascript
   // In console, test Alpha Vantage directly:
   advisor.apiService.fetchAlphaVantage('INFY')
   ```

---

**Version:** 2.0 (Real-Time API Integration)  
**Last Updated:** December 2024  
**Browser Support:** Chrome, Firefox, Safari, Edge (ES6+)
