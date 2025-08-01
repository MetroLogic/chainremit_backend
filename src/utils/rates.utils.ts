export function getVolatility(rates: number[]): number {
    if (rates.length < 2) return 0;
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rates.length;
    return Math.sqrt(variance);
}

export function sanitizeCurrency(symbol: string): string {
    return symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}
