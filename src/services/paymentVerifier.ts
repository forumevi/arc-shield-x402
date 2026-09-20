import axios from 'axios';

const ARC_EXPLORER_API = process.env.ARC_EXPLORER_API_URL || 'https://explorer.arc.network/api/v1';
const REQUIRED_AMOUNT_USDC = 0.001;

interface VerificationResult {
  valid: boolean;
  reason?: string;
  txDetails?: any;
}

export async function verifyArcPayment(txHash: string, recipientAddress: string): Promise<VerificationResult> {
  try {
    const response = await axios.get(`${ARC_EXPLORER_API}/tx/${txHash}`);
    const tx = response.data;

    if (!tx || tx.status !== 'success') {
      return { valid: false, reason: 'Transaction failed or not found on Arc Mainnet.' };
    }

    const isCorrectRecipient = tx.to?.toLowerCase() === recipientAddress.toLowerCase();
    const transferredAmount = parseFloat(tx.value_usdc || tx.value || '0');

    if (!isCorrectRecipient) {
      return { valid: false, reason: 'Payment recipient address mismatch.' };
    }

    if (transferredAmount < REQUIRED_AMOUNT_USDC) {
      return { valid: false, reason: `Insufficient fee. Required: ${REQUIRED_AMOUNT_USDC} USDC.` };
    }

    return { valid: true, txDetails: tx };
  } catch (error: any) {
    console.error('Arc Explorer Verification Error:', error.message);
    return { valid: false, reason: 'Unable to reach Arc Explorer API for verification.' };
  }
}
