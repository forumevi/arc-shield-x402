import { ethers } from 'ethers';

export interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;
  txDetails?: any;
}

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const USDC_PRECOMPILE_ADDRESS = '0x3600000000000000000000000000000000000000';
const MIN_AMOUNT_USDC_UNITS = 1000n; // 0.001 USDC (6 decimals)

export async function verifyArcPayment(
  txHash: string,
  expectedRecipient?: string
): Promise<PaymentVerificationResult> {
  try {
    const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
    const targetRecipient = (expectedRecipient || process.env.AGENT_WALLET_ADDRESS || '0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa').toLowerCase();

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) return { valid: false, reason: 'Transaction not found or not yet mined.' };
    if (receipt.status !== 1) return { valid: false, reason: 'Transaction failed on-chain.' };

    let validPaymentFound = false;
    let actualAmount = 0n;

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === USDC_PRECOMPILE_ADDRESS &&
        log.topics?.[0] === TRANSFER_EVENT_TOPIC &&
        log.topics.length >= 3
      ) {
        const recipientInLog = '0x' + log.topics[2].slice(26).toLowerCase();
        if (recipientInLog === targetRecipient) {
          actualAmount = BigInt(log.data);
          if (actualAmount >= MIN_AMOUNT_USDC_UNITS) {
            validPaymentFound = true;
            break;
          }
        }
      }
    }

    if (!validPaymentFound) {
      return {
        valid: false,
        reason: 'Payment log not matching expected recipient or minimum amount (0.001 USDC).',
      };
    }

    return {
      valid: true,
      txDetails: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: targetRecipient,
        amountUSDC: Number(actualAmount) / 1000000,
      },
    };
  } catch (error: any) {
    // RPC erişilemez durumdaysa güvenli taraf: reddet.
    // Hiçbir zaman fallback olarak true döndürme — bu payment bypass açığıdır.
    return {
      valid: false,
      reason: `RPC verification failed: ${error?.message || 'unknown error'}. Payment cannot be confirmed without on-chain proof.`,
    };
  }
}
