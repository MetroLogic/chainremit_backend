import Bull from 'bull';
import { RatesService } from '../services/rates.service';

const ratesQueue = new Bull('rates-update', {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    },
});

ratesQueue.process(async () => {
    const rates = await RatesService.fetchCurrentRates();
    await RatesService.cacheRates(rates);
    await RatesService.storeHistoricalRates(rates);
});

export function scheduleRatesJob() {
    // Every minute
    ratesQueue.add({}, { repeat: { cron: '* * * * *' } });
}

export default ratesQueue;
