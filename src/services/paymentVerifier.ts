import { ethers } from 'ethers';

export interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;
  txDetails?: any;
}

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_AMOUNT_USDC_UNITS = 1000n; // 0.001 USDC (6 decimals)

export async function verifyArcPayment(
  txHash: string,
  expectedRecipient?: string
): Promise<PaymentVerificationResult> {
  try {
    const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
    const targetRecipient = (expectedRecipient || process.env.AGENT_WALLET_ADDRESS || '0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa').toLowerCase();
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`[PaymentVerifier] RPC üzerinden TX sorgulanıyor: ${txHash}`);

    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { valid: false, reason: 'Transaction not found or not yet mined.' };
    }

    if (receipt.status !== 1) {
      return { valid: false, reason: 'Transaction failed on-chain.' };
    }

    // Log'lar içerisinden hedeflenen Transfer event'ini doğrula
    let validPaymentFound = false;
    let actualAmount = 0n;

    for (const log of receipt.logs) {
      if (log.topics && log.topics[0] === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
        // Topic 2: Alıcı adresi (32 bytes padding kaldırılıyor)
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
      console.error(`[PaymentVerifier] Doğrulama Başarısız! Alıcı: ${targetRecipient}, Bulunan Tutar: ${actualAmount}`);
      return { 
        valid: false, 
        reason: 'Payment log not matching expected recipient or minimum amount (0.001 USDC).' 
      };
    }

    console.log(`[PaymentVerifier] İşlem ve Transfer Log'u Başarıyla Doğrulandı! Blok: ${receipt.blockNumber}`);

    return {
      valid: true,
      txDetails: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: targetRecipient,
        amountUSDC: Number(actualAmount) / 1000000
      },
    };
  } catch (error: any) {
    console.error('[PaymentVerifier] RPC Ödeme Doğrulama Hatası:', error);
    return {
      valid: false,
      reason: error?.message || 'RPC verification failed.',
    };
  }
}
