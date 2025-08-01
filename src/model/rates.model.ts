export interface Rate {
    symbol: string;
    price: number;
    currency: string;
    timestamp: number;
}

export interface HistoricalRate {
    timestamp: number;
    rates: Rate[];
}

export interface PriceAlert {
    symbol: string;
    targetPrice: number;
    direction: 'above' | 'below';
    userId: string;
    createdAt: number;
}
