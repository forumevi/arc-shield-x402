import { Request, Response, NextFunction } from 'express';
import { verifyArcPayment } from '../services/paymentVerifier';

const AGENT_WALLET_ADDRESS = process.env.AGENT_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

export async function x402Middleware(req: Request, res: Response, next: NextFunction) {
  const paymentProof = req.headers['x-payment-proof'] as string;

  if (!paymentProof) {
    return res.status(402).json({
      error: 'Payment Required',
      protocol: 'x402',
      amount_usdc: 0.001,
      recipient_address: AGENT_WALLET_ADDRESS,
      chain_id: 'arc-mainnet',
      message: 'Please attach a valid transaction hash in the x-payment-proof header.'
    });
  }

  // Arc Mainnet Explorer API üzerinden gerçek on-chain doğrulama
  const verification = await verifyArcPayment(paymentProof, AGENT_WALLET_ADDRESS);

  if (!verification.valid) {
    return res.status(402).json({
      error: 'Payment Verification Failed',
      reason: verification.reason,
      protocol: 'x402'
    });
  }

  // Ödeme doğrulandı, isteğe işlem detaylarını ekle ve sonraki katmana geç
  (req as any).paymentInfo = verification.txDetails;
  next();
}
