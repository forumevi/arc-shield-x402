import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { verifyNanopaymentProof } from './circleService';
import { analyzeAddressSecurity } from './geminiOracle';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const requireNanopayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const paymentHeader = (req.headers['x-payment-proof'] || req.headers['x402-payment']) as string;

  if (!paymentHeader) {
    res.status(402).json({
      error: 'Payment Required',
      protocol: 'x402',
      amount_usdc: '0.001',
      recipient_wallet: process.env.CIRCLE_AGENT_WALLET || '0x0000000000000000000000000000000000000000',
      message: 'Autonomous security query requires a 0.001 USDC nanopayment via Circle Agent Stack.',
    });
    return;
  }

  const isValid = await verifyNanopaymentProof(paymentHeader);
  if (!isValid) {
    res.status(402).json({
      error: 'Invalid Payment Proof',
      protocol: 'x402',
      message: 'Provided payment proof is invalid, unconfirmed, or does not meet minimum 0.001 USDC threshold.',
    });
    return;
  }

  next();
};

app.post('/api/v1/security/check', requireNanopayment, async (req: Request, res: Response) => {
  const { target_address, chain_id } = req.body;

  if (!target_address) {
    res.status(400).json({ error: 'Missing target_address parameter' });
    return;
  }

  const aiAnalysis = await analyzeAddressSecurity(target_address, chain_id || 'arc-mainnet');

  res.status(200).json({
    status: 'SUCCESS',
    verified: true,
    target_address,
    chain_id: chain_id || 'arc-mainnet',
    ...aiAnalysis,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', service: 'ArcShield x402 Gateway' });
});

app.listen(PORT, () => {
  console.log('[ArcShield] x402 Agent Gateway running on port ' + PORT);
});
