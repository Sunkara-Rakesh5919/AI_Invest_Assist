// ============================================================================
// BACKEND CLIENT LIBRARY FOR FRONTEND
// Connects to backend server for real-time updates and secure API calls
// ============================================================================

class BackendClient {
    constructor(backendUrl = 'http://localhost:5000') {
        this.backendUrl = backendUrl;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
        this.subscribers = new Map(); // Track subscribers by symbol
        this.isConnected = false;
        this.requestCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // ========================================================================
    // HTTP ENDPOINTS
    // ========================================================================

    /**
     * Fetch single stock data from backend
     */
    async getStock(symbol) {
        try {
            // Check cache first
            const cacheKey = `stock_${symbol}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log(`📦 Using cached data for ${symbol}`);
                return cached;
            }

            const response = await fetch(`${this.backendUrl}/api/stock/${symbol}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.success) {
                // Cache the response
                this.setCache(cacheKey, data.data);
                return data.data;
            } else {
                throw new Error(data.error || 'Failed to fetch stock data');
            }
        } catch (error) {
            console.error(`❌ Error fetching ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Fetch multiple stocks at once
     */
    async getStocks(symbols) {
        try {
            const symbolString = symbols.join(',');
            const response = await fetch(`${this.backendUrl}/api/stocks?symbols=${symbolString}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.success) {
                // Cache each stock
                Object.entries(data.data).forEach(([symbol, result]) => {
                    if (result.success) {
                        this.setCache(`stock_${symbol}`, result.data);
                    }
                });
                return data.data;
            } else {
                throw new Error(data.error || 'Failed to fetch stocks');
            }
        } catch (error) {
            console.error('❌ Error fetching multiple stocks:', error);
            return {};
        }
    }

    /**
     * Fetch historical price data
     */
    async getHistoricalData(symbol, days = 30) {
        try {
            const response = await fetch(`${this.backendUrl}/api/historical/${symbol}?days=${days}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error || 'Failed to fetch historical data');
            }
        } catch (error) {
            console.error(`❌ Error fetching historical data for ${symbol}:`, error);
            return [];
        }
    }

    /**
     * Get cache and rate limit status
     */
    async getCacheStatus() {
        try {
            const response = await fetch(`${this.backendUrl}/api/cache-status`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching cache status:', error);
            return null;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.backendUrl}/health`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return null;
        }
    }

    // ========================================================================
    // WEBSOCKET REAL-TIME UPDATES
    // ========================================================================

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = this.backendUrl.replace('http', 'ws');
                console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve(this.ws);
                };

                this.ws.onmessage = (event) => {
                    this.handleWebSocketMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('⚠️ WebSocket disconnected');
                    this.isConnected = false;
                    this.attemptReconnect();
                };

            } catch (error) {
                console.error('❌ WebSocket connection error:', error);
                reject(error);
            }
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(messageStr) {
        try {
            const message = JSON.parse(messageStr);

            switch (message.type) {
                case 'connection':
                    console.log(`✅ Connected with ID: ${message.clientId}`);
                    break;

                case 'price_update':
                    // Broadcast update to subscribers
                    if (this.subscribers.has(message.symbol)) {
                        const callbacks = this.subscribers.get(message.symbol);
                        callbacks.forEach(callback => callback(message.data));
                    }
                    break;

                case 'subscribed':
                    console.log(`📡 Subscribed to ${message.symbol}`);
                    break;

                case 'unsubscribed':
                    console.log(`🚫 Unsubscribed from ${message.symbol}`);
                    break;

                case 'pong':
                    // Keep-alive response
                    break;

                case 'error':
                    console.error('WebSocket error:', message.message);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }

        } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
        }
    }

    /**
     * Subscribe to real-time updates for a stock
     */
    subscribe(symbol, callback) {
        if (!this.isConnected) {
            console.warn(`⚠️ WebSocket not connected. Cannot subscribe to ${symbol}`);
            return false;
        }

        // Add callback to subscribers
        if (!this.subscribers.has(symbol)) {
            this.subscribers.set(symbol, []);
        }
        this.subscribers.get(symbol).push(callback);

        // Send subscribe message
        this.ws.send(JSON.stringify({
            type: 'subscribe',
            symbol: symbol,
            timestamp: new Date()
        }));

        console.log(`📡 Subscribed to ${symbol} updates`);
        return true;
    }

    /**
     * Unsubscribe from real-time updates
     */
    unsubscribe(symbol) {
        if (!this.isConnected) {
            console.warn(`⚠️ WebSocket not connected. Cannot unsubscribe from ${symbol}`);
            return false;
        }

        // Remove callbacks
        this.subscribers.delete(symbol);

        // Send unsubscribe message
        this.ws.send(JSON.stringify({
            type: 'unsubscribe',
            symbol: symbol,
            timestamp: new Date()
        }));

        console.log(`🚫 Unsubscribed from ${symbol}`);
        return true;
    }

    /**
     * Keep-alive ping
     */
    ping() {
        if (this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date()
            }));
        }
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connectWebSocket().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, this.reconnectInterval);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
            console.log('✅ WebSocket disconnected');
        }
    }

    // ========================================================================
    // CACHING HELPERS
    // ========================================================================

    /**
     * Get item from cache if not expired
     */
    getFromCache(key) {
        const item = this.requestCache.get(key);
        if (item && Date.now() - item.timestamp < this.cacheExpiry) {
            return item.data;
        }
        this.requestCache.delete(key);
        return null;
    }

    /**
     * Set cache item
     */
    setCache(key, data) {
        this.requestCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.requestCache.clear();
        console.log('✅ Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.requestCache.size,
            items: Array.from(this.requestCache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.requestCache.values())).length
        };
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get current connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            wsReady: this.ws ? this.ws.readyState === WebSocket.OPEN : false,
            subscribedSymbols: Array.from(this.subscribers.keys()),
            reconnectAttempts: this.reconnectAttempts,
            cacheSize: this.requestCache.size
        };
    }

    /**
     * Format data for display
     */
    formatStockData(stock) {
        return {
            symbol: stock.symbol,
            current: `₹${(stock.current || 0).toFixed(2)}`,
            change: `${stock.change >= 0 ? '+' : ''}${(stock.change || 0).toFixed(2)}`,
            changePercent: `${stock.changePercent >= 0 ? '+' : ''}${(stock.changePercent || 0).toFixed(2)}%`,
            volume: stock.volume ? `${(stock.volume / 1000000).toFixed(2)}M` : 'N/A',
            high: `₹${(stock.high || 0).toFixed(2)}`,
            low: `₹${(stock.low || 0).toFixed(2)}`,
            source: stock.source || 'Unknown',
            timestamp: stock.timestamp
        };
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackendClient;
}
