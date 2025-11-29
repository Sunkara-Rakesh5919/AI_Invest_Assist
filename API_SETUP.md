# API Setup Guide - Stock Market App

## Overview
This application now integrates with real market data from multiple financial APIs. Follow this guide to set up your API keys and enable real-time stock data.

## Supported APIs

### 1. Alpha Vantage (Recommended for US & Global Stocks)
**Best for:** US stocks, ETFs, forex, crypto  
**Free Tier:** 5 API calls per minute, 500 calls per day

**Setup Steps:**
1. Visit: https://www.alphavantage.co
2. Click "GET FREE API KEY"
3. Enter your email and name
4. Check your email for the API key
5. Copy the key and add to `app.js` line ~50:
```javascript
const API_CONFIG = {
    alphavantage: {
        apiKey: 'YOUR_API_KEY_HERE',
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: 5 // calls per minute
    },
    ...
};
```

---

### 2. Finnhub (Real-Time Stock Quotes & News)
**Best for:** Real-time quotes, company news, technical analysis  
**Free Tier:** 60 API calls per minute, real-time data

**Setup Steps:**
1. Visit: https://finnhub.io
2. Click "Get Free API Key"
3. Sign up with email
4. Go to Dashboard → API keys
5. Copy your API key and add to `app.js` line ~50:
```javascript
const API_CONFIG = {
    ...
    finnhub: {
        apiKey: 'YOUR_API_KEY_HERE',
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimit: 60
    },
    ...
};
```

---

### 3. Yahoo Finance (via Rapid API)
**Best for:** Historical data, comprehensive stock info  
**Free Tier:** Limited calls per month

**Setup Steps:**
1. Visit: https://rapidapi.com/apidojo/api/yahoo-finance1
2. Sign up for free RapidAPI account
3. Subscribe to Yahoo Finance API (free plan available)
4. Copy your RapidAPI key
5. Add to `app.js` line ~50:
```javascript
const API_CONFIG = {
    ...
    yahooFinance: {
        rapidApiKey: 'YOUR_RAPIDAPI_KEY_HERE',
        rapidApiHost: 'yahoo-finance1.p.rapidapi.com',
        rateLimit: 10
    },
    ...
};
```

---

### 4. NSE India (Indian Market Data)
**Best for:** Indian stocks, NSE data  
**Free Tier:** No API key needed - public data

**Setup Notes:**
- NSE data is publicly available
- No registration required
- Use for `INFY`, `TCS`, `RELIANCE`, etc.
- Endpoint: https://www.nseindia.com/api/quote-equity

---

## Step-by-Step Configuration

### 1. Locate the API_CONFIG section
Open `app.js` and find the `API_CONFIG` object around line 50.

### 2. Add Your API Keys
Replace the placeholder values with your actual API keys:

```javascript
const API_CONFIG = {
    alphavantage: {
        apiKey: 'YOUR_ALPHAVANTAGE_KEY',  // ← Replace this
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: 5
    },
    finnhub: {
        apiKey: 'YOUR_FINNHUB_KEY',      // ← Replace this
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimit: 60
    },
    yahooFinance: {
        rapidApiKey: 'YOUR_RAPIDAPI_KEY',  // ← Replace this
        rapidApiHost: 'yahoo-finance1.p.rapidapi.com',
        rateLimit: 10
    },
    nse: {
        baseUrl: 'https://www.nseindia.com/api',
        rateLimit: 30
        // No API key needed for NSE
    }
};
```

### 3. Save the file
Save `app.js` after adding your keys.

### 4. Test the API Integration
1. Open `index.html` in your browser
2. Open Browser Console (F12 → Console tab)
3. You should see logs like:
   ```
   [API] Attempting to fetch INFY from Alpha Vantage
   [API] Stock data cached: INFY
   [API] Data expires at: ...
   ```
4. Go to "Top Picks" page - real stock data should load!

---

## Troubleshooting

### No data showing up?
- Check browser console for errors (F12 → Console)
- Verify API keys are correct (no extra spaces)
- Ensure you're not exceeding rate limits
- Check if API quota is exceeded (see API dashboard)

### Rate limit exceeded?
- App has built-in rate limiting (5 calls/minute by default)
- Data is cached for 5 minutes
- Try again after the cache expires

### One API not working?
- App will automatically fall back to the next API
- Check browser console to see which API succeeded
- Invalid API keys will skip to next provider

---

## API Fallback Chain

The app tries APIs in this order:
1. **Alpha Vantage** - Global stocks
2. **Finnhub** - Real-time data
3. **Yahoo Finance** - Alternative data
4. **NSE** - Indian market data
5. **Mock Data** - Fallback if all fail

If one API fails, the next one is automatically tried.

---

## Performance Tips

1. **Reduce API Calls:** Data is cached for 5 minutes
2. **Start Small:** Test with 1-2 stocks first
3. **Monitor Quota:** Check your API dashboard for remaining quota
4. **Use Free Tiers:** All recommended APIs have free tiers
5. **Stagger Requests:** App automatically spreads requests

---

## Security Notes

⚠️ **IMPORTANT:** Never commit your API keys to version control!

If using Git:
```bash
# Create .gitignore
echo "*.env" >> .gitignore
```

For future improvements, consider using:
- `.env` files (with environment variables)
- Backend proxy (keep keys server-side)
- OAuth2 flows for sensitive data

---

## Stocks to Test

### Indian Stocks (NSE)
- INFY (Infosys)
- TCS (Tata Consultancy Services)
- RELIANCE (Reliance Industries)
- WIPRO (Wipro Limited)
- HDFCBANK (HDFC Bank)

### US Stocks (Alpha Vantage/Finnhub)
- AAPL (Apple)
- GOOGL (Google)
- MSFT (Microsoft)
- AMZN (Amazon)
- TSLA (Tesla)

---

## API Status Page

Check API status and remaining quota:
- **Alpha Vantage:** https://www.alphavantage.co/query?function=TIME_SERIES_DAILY
- **Finnhub:** https://finnhub.io/dashboard
- **NSE:** https://www.nseindia.com

---

## Next Steps

1. ✅ Sign up for free API keys (all three services)
2. ✅ Add keys to `app.js` API_CONFIG
3. ✅ Open app and test with real data
4. ✅ Monitor browser console for API calls
5. ✅ Enjoy real-time stock recommendations!

---

## Support

If you encounter issues:
1. Check browser console (F12 → Console)
2. Verify API keys format (no spaces, correct case)
3. Check API quota on service dashboard
4. Review rate limiting (5 calls/min by default)
5. Try test stocks (INFY for NSE, AAPL for Alpha Vantage)

---

**Last Updated:** December 2024  
**App Version:** 2.0 (Real-time API Integration)
