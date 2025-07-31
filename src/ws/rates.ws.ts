import WebSocket, { Server } from 'ws';
import { RatesService } from '../services/rates.service';

let wss: Server;

export function setupRatesWebSocket(server: any) {
    wss = new WebSocket.Server({ server, path: '/ws/rates' });

    wss.on('connection', async (ws: WebSocket) => {
        // Send current rates on connect
        const rates = await RatesService.getCachedRates();
        ws.send(JSON.stringify({ type: 'current', rates }));

        // Optionally, send updates every minute
        const interval = setInterval(async () => {
            const updatedRates = await RatesService.getCachedRates();
            ws.send(JSON.stringify({ type: 'update', rates: updatedRates }));
        }, 60000);

        ws.on('close', () => clearInterval(interval));
    });
}
