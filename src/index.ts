import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { x402Middleware } from './middleware/x402';
import { analyzeSecurityTarget } from './services/geminiOracle';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Yapılandırması (Vercel ve Cloud Run Uyumlu)
app.use(cors({
  origin: [
    'https://frontend-8gcgla5as-forumevis-projects.vercel.app',
    /\.vercel\.app$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-payment-proof'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json());

// Public Sağlık Kontrolü Endpoint'i
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ArcShield x402 Security Oracle Gateway',
    timestamp: new Date().toISOString()
  });
});

// Güvenlik Analizi Endpoint'i (x402 Micropayment Korumalı)
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
  console.log(`🚀 ArcShield Gateway running on port ${PORT}`);
});
