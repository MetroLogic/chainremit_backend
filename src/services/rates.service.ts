import axios from 'axios';
import Redis from 'ioredis';
import { Rate, HistoricalRate, PriceAlert } from '../model/rates.model';

const redis = new Redis();

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const COINMARKETCAP_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY;

export class RatesService {
    static supportedCurrencies = ['BTC', 'ETH', 'USDT', 'USD', 'EUR'];

    static async fetchCurrentRates(): Promise<Rate[]> {
        // Try CoinGecko first
        try {
            const cgRes = await axios.get(COINGECKO_URL, {
                params: {
                    ids: 'bitcoin,ethereum,tether',
                    vs_currencies: 'usd,eur',
                },
            });
            // ...parse and return rates...
            return this.parseCoinGeckoRates(cgRes.data);
        } catch (err) {
            // Fallback to CoinMarketCap
            try {
                const cmcRes = await axios.get(COINMARKETCAP_URL, {
                    headers: { 'X-CMC_PRO_API_KEY': COINMARKETCAP_KEY },
                    params: { convert: 'USD,EUR' },
                });
                return this.parseCoinMarketCapRates(cmcRes.data);
            } catch (err2) {
                throw new Error('Failed to fetch rates from all sources');
            }
        }
    }

    static async cacheRates(rates: Rate[]): Promise<void> {
        await redis.set('current_rates', JSON.stringify(rates), 'EX', 60); // 1 min cache
    }

    static async getCachedRates(): Promise<Rate[] | null> {
        const cached = await redis.get('current_rates');
        return cached ? JSON.parse(cached) : null;
    }

    static async storeHistoricalRates(rates: Rate[]): Promise<void> {
        const now = Date.now();
        await redis.lpush('historical_rates', JSON.stringify({ timestamp: now, rates }));
    }

    static async getHistoricalRates(): Promise<HistoricalRate[]> {
        const items = await redis.lrange('historical_rates', 0, 99);
        return items.map((i) => JSON.parse(i));
    }

    static async setPriceAlert(alert: PriceAlert): Promise<void> {
        await redis.lpush('price_alerts', JSON.stringify(alert));
    }

    static async getSupportedCurrencies(): Promise<string[]> {
        return this.supportedCurrencies;
    }

    static parseCoinGeckoRates(data: any): Rate[] {
        // CoinGecko returns: { bitcoin: { usd: 123, eur: 120 }, ethereum: { usd: 456, eur: 450 }, ... }
        const symbolMap: Record<string, string> = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            tether: 'USDT',
        };
        const rates: Rate[] = [];
        const timestamp = Date.now();
        for (const [key, value] of Object.entries(data)) {
            const symbol = symbolMap[key] || key.toUpperCase();
            for (const [currency, price] of Object.entries(value as Record<string, number>)) {
                rates.push({
                    symbol,
                    price: typeof price === 'number' ? price : Number(price),
                    currency: currency.toUpperCase(),
                    timestamp,
                });
            }
        }
        return rates;
    }

    static parseCoinMarketCapRates(data: any): Rate[] {
        // CoinMarketCap returns: { data: [ { symbol: 'BTC', quote: { USD: { price: 123 }, EUR: { price: 120 } }, ... } ] }
        if (!data || !Array.isArray(data.data)) return [];
        const rates: Rate[] = [];
        const timestamp = Date.now();
        for (const item of data.data) {
            const symbol = item.symbol;
            if (item.quote) {
                for (const [currency, quote] of Object.entries(item.quote)) {
                    const price = (quote as { price?: number }).price;
                    if (typeof price === 'number') {
                        rates.push({
                            symbol,
                            price,
                            currency: currency.toUpperCase(),
                            timestamp,
                        });
                    }
                }
            }
        }
        return rates;
    }
}
