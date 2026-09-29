import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { x402Middleware } from './middleware/x402.js';
import { analyzeSecurityTarget } from './services/geminiOracle.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-payment-proof', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ArcShield x402 Security Oracle Gateway',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['onchain-context', 'threat-intel', 'function-signatures']
  });
});

app.post('/api/v1/analyze', x402Middleware, async (req: Request, res: Response) => {
  try {
    const { target_address, chain_id } = req.body;

    if (!target_address) {
      return res.status(400).json({ error: 'Missing required parameter: target_address' });
    }

    const analysis = await analyzeSecurityTarget(target_address, chain_id || 'arc-mainnet');

    return res.json({
      success: true,
      payment_info: (req as any).paymentInfo,
      analysis
    });
  } catch (error: any) {
    console.error('API Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ArcShield Gateway v2.0 running on port ${PORT}`);
});
