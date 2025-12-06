// ============================================================================
// AI STOCK MARKET ADVISOR - BACKEND SERVER
// Secure API proxy with key management, rate limiting, and data aggregation
// ============================================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// DATABASE SETUP
// ============================================================================

const dbPath = path.join(__dirname, 'stock_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database error:', err);
    else console.log('✅ Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
    // Historical price data
    db.run(`
        CREATE TABLE IF NOT EXISTS stock_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            source TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(symbol, date)
        )
    `);

    // Stock predictions
    db.run(`
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            current_price REAL,
            predicted_price REAL,
            confidence REAL,
            models TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME
        )
    `);

    // User preferences
    db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            portfolio TEXT,
            notifications_enabled BOOLEAN,
            theme TEXT DEFAULT 'dark',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Cache entries
    db.run(`
        CREATE TABLE IF NOT EXISTS api_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE,
            data TEXT,
            source TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ============================================================================
// RATE LIMITING
// ============================================================================

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per IP
    message: 'Too many requests, please try again later'
});

const stockLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // 100 requests per 5 minutes
    keyGenerator: (req) => req.query.symbol || 'unknown'
});

app.use('/api/', apiLimiter);

// ============================================================================
// API CONFIGURATION - SECURE FROM ENVIRONMENT VARIABLES
// ============================================================================

const API_KEYS = {
    ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_KEY || 'demo',
    FINNHUB: process.env.FINNHUB_KEY || 'demo_key',
    RAPID_API: process.env.RAPID_API_KEY || '',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get cached data
async function getCachedData(symbol) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT data, source FROM api_cache WHERE symbol = ? AND expires_at > datetime("now")',
            [symbol],
            (err, row) => {
                if (err) reject(err);
                else resolve(row ? { data: JSON.parse(row.data), source: row.source } : null);
            }
        );
    });
}

// Set cache data
async function setCacheData(symbol, data, source) {
    return new Promise((resolve, reject) => {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute expiry
        db.run(
            'INSERT OR REPLACE INTO api_cache (symbol, data, source, expires_at) VALUES (?, ?, ?, ?)',
            [symbol, JSON.stringify(data), source, expiresAt.toISOString()],
            (err) => {
                if (err) reject(err);
                else resolve(true);
            }
        );
    });
}

// Store historical price data
async function storeHistoricalPrice(symbol, data) {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString().split('T')[0];
        db.run(
            `INSERT OR REPLACE INTO stock_prices 
             (symbol, date, open, high, low, close, volume, source) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                symbol,
                date,
                data.open || null,
                data.high || null,
                data.low || null,
                data.close || data.current || null,
                data.volume || null,
                data.source || 'api_proxy'
            ],
            (err) => {
                if (err) reject(err);
                else resolve(true);
            }
        );
    });
}

// ============================================================================
// STOCK DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/stock/:symbol
 * Fetch single stock data from best available source with caching
 */
app.get('/api/stock/:symbol', stockLimiter, async (req, res) => {
    try {
        const { symbol } = req.params;

        // Check cache first
        const cached = await getCachedData(symbol);
        if (cached) {
            return res.json({
                success: true,
                data: cached.data,
                source: cached.source,
                cached: true,
                timestamp: new Date()
            });
        }

        let data = null;

        // Try Alpha Vantage
        try {
            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: API_KEYS.ALPHA_VANTAGE
                },
                timeout: 5000
            });

            if (response.data['Global Quote']) {
                const quote = response.data['Global Quote'];
                data = {
                    symbol: symbol,
                    current: parseFloat(quote['05. price']),
                    change: parseFloat(quote['09. change']),
                    changePercent: parseFloat(quote['10. change percent']),
                    volume: quote['06. volume'],
                    high: parseFloat(quote['03. high']),
                    low: parseFloat(quote['04. low']),
                    open: parseFloat(quote['02. open']),
                    source: 'Alpha Vantage',
                    timestamp: new Date()
                };
            }
        } catch (error) {
            console.log(`Alpha Vantage failed for ${symbol}, trying Finnhub...`);
        }

        // Try Finnhub if Alpha failed
        if (!data) {
            try {
                const response = await axios.get('https://finnhub.io/api/v1/quote', {
                    params: {
                        symbol: symbol,
                        token: API_KEYS.FINNHUB
                    },
                    timeout: 5000
                });

                if (response.data && response.data.c) {
                    data = {
                        symbol: symbol,
                        current: response.data.c,
                        change: response.data.c - response.data.pc,
                        changePercent: ((response.data.c - response.data.pc) / response.data.pc * 100).toFixed(2),
                        volume: response.data.v,
                        high: response.data.h,
                        low: response.data.l,
                        open: response.data.o,
                        source: 'Finnhub',
                        timestamp: new Date()
                    };
                }
            } catch (error) {
                console.log(`Finnhub failed for ${symbol}, trying NSE...`);
            }
        }

        // Try NSE India
        if (!data) {
            try {
                const response = await axios.get(`https://www.nseindia.com/api/quote-equity?symbol=${symbol}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 5000
                });

                if (response.data && response.data.lastprice) {
                    data = {
                        symbol: symbol,
                        current: response.data.lastprice,
                        change: response.data.change,
                        changePercent: response.data.pchange,
                        volume: response.data.totalTradedVolume,
                        high: response.data.high,
                        low: response.data.low,
                        source: 'NSE India',
                        timestamp: new Date()
                    };
                }
            } catch (error) {
                console.log(`NSE failed for ${symbol}`);
            }
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Unable to fetch data from any source',
                symbol: symbol
            });
        }

        // Cache the successful response
        await setCacheData(symbol, data, data.source);

        // Store historical data
        await storeHistoricalPrice(symbol, data);

        res.json({
            success: true,
            data: data,
            cached: false,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Stock endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/stocks
 * Fetch multiple stocks data
 */
app.get('/api/stocks', stockLimiter, async (req, res) => {
    try {
        const { symbols } = req.query;
        if (!symbols) {
            return res.status(400).json({ error: 'symbols query parameter required' });
        }

        const symbolList = symbols.split(',').map(s => s.trim());
        const results = {};

        // Fetch all in parallel
        const promises = symbolList.map(async (symbol) => {
            try {
                const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/stock/${symbol}`);
                results[symbol] = response.data;
            } catch (error) {
                results[symbol] = { success: false, error: error.message };
            }
        });

        await Promise.all(promises);

        res.json({
            success: true,
            data: results,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Stocks endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/historical/:symbol
 * Get historical price data from database
 */
app.get('/api/historical/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        return new Promise((resolve) => {
            db.all(
                'SELECT * FROM stock_prices WHERE symbol = ? AND date >= ? ORDER BY date DESC LIMIT ?',
                [symbol, startDate.toISOString().split('T')[0], days],
                (err, rows) => {
                    if (err) {
                        res.status(500).json({ success: false, error: err.message });
                    } else {
                        res.json({
                            success: true,
                            data: rows || [],
                            symbol: symbol,
                            days: days
                        });
                    }
                    resolve();
                }
            );
        });

    } catch (error) {
        console.error('Historical endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/cache-status
 * Check current cache and rate limit status
 */
app.get('/api/cache-status', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        timestamp: new Date(),
        features: {
            caching: 'enabled (5min)',
            rateLimit: '30 req/min',
            database: 'sqlite3',
            websocket: 'enabled'
        }
    });
});

// ============================================================================
// WEBSOCKET SETUP FOR REAL-TIME UPDATES
// ============================================================================

const connectedClients = new Map();
let updateInterval = null;

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    connectedClients.set(clientId, {
        ws: ws,
        symbols: new Set(),
        connected: new Date()
    });

    console.log(`✅ WebSocket client connected: ${clientId}`);

    // Send connection confirmation
    ws.send(JSON.stringify({
        type: 'connection',
        clientId: clientId,
        status: 'connected',
        timestamp: new Date()
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const parsed = JSON.parse(message);

            if (parsed.type === 'subscribe') {
                // Subscribe to stock updates
                connectedClients.get(clientId).symbols.add(parsed.symbol);
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    symbol: parsed.symbol,
                    timestamp: new Date()
                }));
                console.log(`📡 Client ${clientId} subscribed to ${parsed.symbol}`);
            }

            if (parsed.type === 'unsubscribe') {
                // Unsubscribe from stock updates
                connectedClients.get(clientId).symbols.delete(parsed.symbol);
                ws.send(JSON.stringify({
                    type: 'unsubscribed',
                    symbol: parsed.symbol,
                    timestamp: new Date()
                }));
            }

            if (parsed.type === 'ping') {
                // Keep-alive ping
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
            }

        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
                error: error.message
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        connectedClients.delete(clientId);
        console.log(`❌ WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
    });
});

// Broadcast live updates to subscribed clients
async function broadcastLiveUpdates() {
    for (const [clientId, client] of connectedClients) {
        if (client.ws.readyState === WebSocket.OPEN) {
            for (const symbol of client.symbols) {
                try {
                    const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/stock/${symbol}`);
                    if (response.data.success) {
                        client.ws.send(JSON.stringify({
                            type: 'price_update',
                            symbol: symbol,
                            data: response.data.data,
                            timestamp: new Date()
                        }));
                    }
                } catch (error) {
                    console.error(`Error fetching ${symbol} for broadcast:`, error.message);
                }
            }
        }
    }
}

// Start broadcasting updates every 30 seconds
function startBroadcasting() {
    if (!updateInterval) {
        updateInterval = setInterval(() => {
            if (connectedClients.size > 0) {
                broadcastLiveUpdates();
            }
        }, 30000); // 30 seconds
        console.log('📡 WebSocket broadcasting started (30s interval)');
    }
}

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date(),
        wsClients: connectedClients.size,
        apiKeys: {
            alphaVantage: !!process.env.ALPHA_VANTAGE_KEY,
            finnhub: !!process.env.FINNHUB_KEY
        }
    });
});

/**
 * GET /
 * Root endpoint
 */
app.get('/', (req, res) => {
    res.json({
        name: 'AI Stock Market Advisor - Backend Server',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
            'GET /api/stock/:symbol': 'Fetch single stock data',
            'GET /api/stocks?symbols=TCS,INFY,RELIANCE': 'Fetch multiple stocks',
            'GET /api/historical/:symbol?days=30': 'Get historical data (30 days)',
            'GET /api/cache-status': 'Check cache status',
            'GET /health': 'Health check',
            'WS /': 'WebSocket for real-time updates'
        },
        documentation: 'See BACKEND_SETUP.md'
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`\n🚀 AI Stock Market Advisor Backend Server`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`✅ WebSocket available on: ws://localhost:${PORT}`);
    console.log(`✅ Database: SQLite (${dbPath})`);
    console.log(`✅ API Keys loaded: ${Object.keys(API_KEYS).filter(k => process.env[k.split('_').slice(0, -1).join('_') + '_KEY']).length}/${Object.keys(API_KEYS).length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📡 WebSocket broadcasting ready`);
    console.log(`💾 Historical data storage enabled`);
    console.log(`🔐 API keys secured in environment variables\n`);

    // Start WebSocket broadcasting
    startBroadcasting();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) console.error('Database close error:', err);
        else console.log('✅ Database closed');
    });
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = app;
