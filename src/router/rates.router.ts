import { Router } from 'express';
import { RatesController } from '../controller/rates.controller';

const router = Router();

router.get('/current', RatesController.getCurrentRates);
router.get('/historical', RatesController.getHistoricalRates);
router.post('/alerts', RatesController.postPriceAlert);
router.get('/supported-currencies', RatesController.getSupportedCurrencies);

export default router;
