import { Request, Response } from 'express';
import { RatesService } from '../services/rates.service';
import Joi from 'joi';

export class RatesController {
    static async getCurrentRates(req: Request, res: Response) {
        try {
            const cached = await RatesService.getCachedRates();
            if (cached) return res.json(cached);
            const rates = await RatesService.fetchCurrentRates();
            await RatesService.cacheRates(rates);
            return res.json(rates);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to fetch current rates' });
        }
    }

    static async getHistoricalRates(req: Request, res: Response) {
        try {
            const historical = await RatesService.getHistoricalRates();
            return res.json(historical);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to fetch historical rates' });
        }
    }

    static async postPriceAlert(req: Request, res: Response) {
        const schema = Joi.object({
            symbol: Joi.string().required(),
            targetPrice: Joi.number().required(),
            direction: Joi.string().valid('above', 'below').required(),
            userId: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        try {
            await RatesService.setPriceAlert({ ...value, createdAt: Date.now() });
            return res.status(201).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to set price alert' });
        }
    }

    static async getSupportedCurrencies(req: Request, res: Response) {
        try {
            const currencies = await RatesService.getSupportedCurrencies();
            return res.json(currencies);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to fetch supported currencies' });
        }
    }
}
