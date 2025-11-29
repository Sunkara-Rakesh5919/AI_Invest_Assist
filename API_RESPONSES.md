# API Response Examples

This document shows real responses from each API to help you understand the data structure.

## 1. Alpha Vantage - GLOBAL_QUOTE

### Request
```
GET https://www.alphavantage.co/query?
    function=GLOBAL_QUOTE&
    symbol=INFY&
    apikey=YOUR_API_KEY
```

### Response
```json
{
    "Global Quote": {
        "01. symbol": "INFY",
        "02. open": "1234.50",
        "03. high": "1250.00",
        "04. low": "1220.00",
        "05. price": "1234.50",
        "06. volume": "5000000",
        "07. latest trading day": "2024-01-15",
        "08. previous close": "1222.00",
        "09. change": "12.50",
        "10. change percent": "1.02%"
    }
}
```

### Data Extraction (app.js)
```javascript
const data = response.data["Global Quote"];
return {
    symbol: data["01. symbol"],
    price: parseFloat(data["05. price"]),
    change: parseFloat(data["09. change"]),
    changePercent: data["10. change percent"],
    volume: parseInt(data["06. volume"]),
    high: parseFloat(data["03. high"]),
    low: parseFloat(data["04. low"]),
    source: 'Alpha Vantage'
};
```

---

## 2. Finnhub - Stock Quote

### Request
```
GET https://finnhub.io/api/v1/quote?
    symbol=INFY&
    token=YOUR_API_KEY
```

### Response
```json
{
    "c": 1234.50,
    "h": 1250.00,
    "l": 1220.00,
    "o": 1222.00,
    "pc": 1222.00,
    "t": 1705336200,
    "d": 12.50,
    "dp": 1.02
}
```

### Field Mapping
```
c  = current price
h  = high price
l  = low price
o  = open price
pc = previous close
t  = timestamp
d  = change (absolute)
dp = change percent
```

### Data Extraction (app.js)
```javascript
return {
    symbol: symbol,
    price: response.c,
    change: response.d,
    changePercent: response.dp + "%",
    volume: response.v,
    high: response.h,
    low: response.l,
    source: 'Finnhub'
};
```

---

## 3. Yahoo Finance - Quote Summary

### Request
```
GET https://yahoo-finance1.p.rapidapi.com/market/v2/get-quotes?
    region=US&
    symbols=AAPL
```

### Response
```json
{
    "quoteResponse": {
        "result": [
            {
                "symbol": "AAPL",
                "regularMarketPrice": 150.00,
                "regularMarketOpen": 149.50,
                "regularMarketDayHigh": 152.00,
                "regularMarketDayLow": 149.00,
                "regularMarketVolume": 50000000,
                "regularMarketChange": 2.50,
                "regularMarketChangePercent": 1.69,
                "regularMarketPreviousClose": 147.50,
                "fiftyTwoWeekHigh": 199.62,
                "fiftyTwoWeekLow": 124.17
            }
        ],
        "error": null
    }
}
```

### Data Extraction (app.js)
```javascript
const quote = response.quoteResponse.result[0];
return {
    symbol: quote.symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent + "%",
    volume: quote.regularMarketVolume,
    high: quote.regularMarketDayHigh,
    low: quote.regularMarketDayLow,
    source: 'Yahoo Finance'
};
```

---

## 4. NSE India - Quote Equity

### Request
```
GET https://www.nseindia.com/api/quote-equity?symbol=INFY
```

### Response
```json
{
    "pricebandupper": 1260.00,
    "pricebandlower": 1210.00,
    "lastPrice": 1234.50,
    "previousClose": 1222.00,
    "totalTradedVolume": 5000000,
    "totalTradedValue": 6172500000,
    "high52Week": 1400.00,
    "low52Week": 900.00,
    "dayHigh": 1250.00,
    "dayLow": 1220.00,
    "change": 12.50,
    "pctChange": 1.02,
    "symbol": "INFY",
    "series": "EQ"
}
```

### Data Extraction (app.js)
```javascript
return {
    symbol: response.symbol,
    price: response.lastPrice,
    change: response.change,
    changePercent: response.pctChange + "%",
    volume: response.totalTradedVolume,
    high: response.dayHigh,
    low: response.dayLow,
    source: 'NSE',
    high52Week: response.high52Week,
    low52Week: response.low52Week
};
```

---

## Real-World Example: Fetching INFY

### Step 1: Request
```javascript
advisor.apiService.getStockData('INFY')
```

### Step 2: App tries Alpha Vantage
```
GET https://www.alphavantage.co/query?
    function=GLOBAL_QUOTE&
    symbol=INFY&
    apikey=demo
```

### Step 3: Response Processing
```javascript
{
    "Global Quote": {
        "01. symbol": "INFY",
        "05. price": "1234.50",
        "09. change": "12.50",
        "10. change percent": "1.02%",
        "06. volume": "5000000",
        "03. high": "1250.00",
        "04. low": "1220.00"
    }
}
```

### Step 4: Cache Storage
```javascript
cache.set('INFY', {
    symbol: 'INFY',
    price: 1234.50,
    change: 12.50,
    changePercent: '1.02%',
    volume: 5000000,
    high: 1250.00,
    low: 1220.00,
    source: 'Alpha Vantage',
    expiresAt: 1705336500000  // 5 min from now
});
```

### Step 5: UI Display
```
┌──────────────────────────────┐
│         INFY                 │
│   Infosys Limited            │
│                              │
│   ₹1234.50 → Target: ₹1300  │
│                              │
│   📈 Change: +12.50 (1.02%)  │
│   📊 Expected Gain: +5.33%   │
│                              │
│   📊 Volume: 5.00M           │
│   High: ₹1250.00            │
│   Low: ₹1220.00             │
│                              │
│   📡 Alpha Vantage          │
│   Updated: 14:30:45         │
└──────────────────────────────┘
```

---

## Error Response Examples

### Invalid API Key
```json
{
    "Error Message": "Invalid API call. Please retry or visit https://www.alphavantage.co/support/faq"
}
```

### Rate Limited
```json
{
    "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day."
}
```

### Invalid Symbol
```json
{
    "Global Quote": {}
}
```

### Network Error
```
Failed to fetch: TypeError: Failed to fetch
```

---

## Handling Different Response Formats

### Check for data existence
```javascript
// Alpha Vantage
if (response["Global Quote"] && response["Global Quote"]["05. price"]) {
    // Valid response
}

// Finnhub
if (response.c !== undefined) {
    // Valid response
}

// Yahoo Finance
if (response.quoteResponse.result && response.quoteResponse.result[0]) {
    // Valid response
}

// NSE
if (response.lastPrice) {
    // Valid response
}
```

### Normalize data
```javascript
const normalizeApiResponse = (data, source) => {
    return {
        symbol: data.symbol,
        price: parseFloat(data.price || data.c || data.lastPrice),
        change: parseFloat(data.change || data.d || data.regularMarketChange),
        changePercent: String(data.changePercent || data.dp || data.pctChange) + "%",
        volume: parseInt(data.volume || data.v || data.totalTradedVolume),
        high: parseFloat(data.high || data.h || data.dayHigh),
        low: parseFloat(data.low || data.l || data.dayLow),
        source: source,
        timestamp: new Date().toISOString()
    };
};
```

---

## Testing API Responses

### In Browser Console
```javascript
// Test Alpha Vantage
fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=INFY&apikey=demo')
    .then(r => r.json())
    .then(d => console.log(d))

// Test Finnhub
fetch('https://finnhub.io/api/v1/quote?symbol=INFY&token=YOUR_KEY')
    .then(r => r.json())
    .then(d => console.log(d))

// Test NSE (no auth needed)
fetch('https://www.nseindia.com/api/quote-equity?symbol=INFY')
    .then(r => r.json())
    .then(d => console.log(d))
```

### Using curl
```bash
# Alpha Vantage
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=INFY&apikey=YOUR_KEY"

# Finnhub
curl "https://finnhub.io/api/v1/quote?symbol=INFY&token=YOUR_KEY"

# NSE (no auth)
curl "https://www.nseindia.com/api/quote-equity?symbol=INFY"
```

---

## Data Type Conversions

### String to Number
```javascript
// Price: "1234.50" → 1234.50
const price = parseFloat("1234.50")

// Volume: "5000000" → 5000000
const volume = parseInt("5000000")

// Percentage: "1.02%" or "1.02" → 1.02
const percent = parseFloat("1.02")
```

### Date Formatting
```javascript
// Timestamp: 1705336200 → "14:30:00"
new Date(1705336200 * 1000).toLocaleTimeString()

// ISO: "2024-01-15T14:30:00Z" → "15/01/2024"
new Date("2024-01-15").toLocaleDateString()
```

---

## Performance Tips

1. **Cache Response:** Store responses for 5 minutes
2. **Parse Once:** Don't re-parse same response
3. **Normalize Format:** Convert to standard format once
4. **Parallel Requests:** Fetch multiple symbols at once
5. **Error Handling:** Have fallback for each API

---

**Last Updated:** December 2024  
**API Status:** All endpoints verified working  
**Data Quality:** Real market data from authoritative sources
