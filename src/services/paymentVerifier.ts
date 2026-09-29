import { ethers } from 'ethers';

export interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;
  txDetails?: any;
}

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Arc Mainnet'te iki farklı USDC transfer log adresi olabilir:
// - 0xffff...fffe : native USDC precompile (18 decimals) — cüzdanlar genellikle bunu kullanır
// - 0x3600...0000 : ERC-20 USDC precompile (6 decimals)
// Her ikisini de kabul ediyoruz, decimal'i adrese göre hesaplıyoruz.
const USDC_NATIVE_PRECOMPILE   = '0xfffffffffffffffffffffffffffffffffffffffe'; // 18 dec
const USDC_ERC20_PRECOMPILE    = '0x3600000000000000000000000000000000000000'; // 6 dec
const MIN_AMOUNT_NATIVE        = 1000000000000000n; // 0.001 USDC × 1e18
const MIN_AMOUNT_ERC20         = 1000n;             // 0.001 USDC × 1e6

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

    let validPaymentFound = false;
    let actualAmountUSDC = 0;

    for (const log of receipt.logs) {
      const logAddress = log.address.toLowerCase();

      const isNative = logAddress === USDC_NATIVE_PRECOMPILE;
      const isERC20  = logAddress === USDC_ERC20_PRECOMPILE;

      if (
        (isNative || isERC20) &&
        log.topics?.[0] === TRANSFER_EVENT_TOPIC &&
        log.topics.length >= 3
      ) {
        const recipientInLog = '0x' + log.topics[2].slice(26).toLowerCase();

        if (recipientInLog === targetRecipient) {
          const rawAmount = BigInt(log.data);
          const minAmount = isNative ? MIN_AMOUNT_NATIVE : MIN_AMOUNT_ERC20;
          const divisor   = isNative ? 1e18 : 1e6;

          if (rawAmount >= minAmount) {
            validPaymentFound = true;
            actualAmountUSDC  = Number(rawAmount) / divisor;
            console.log(`[PaymentVerifier] Geçerli ödeme bulundu — kaynak: ${isNative ? 'native' : 'ERC-20'}, miktar: ${actualAmountUSDC} USDC`);
            break;
          }
        }
      }
    }

    if (!validPaymentFound) {
      console.error(`[PaymentVerifier] Doğrulama Başarısız! Alıcı: ${targetRecipient}`);
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
        amountUSDC: actualAmountUSDC
      },
    };
  } catch (error: any) {
    console.error('[PaymentVerifier] RPC Ödeme Doğrulama Hatası:', error);
    return {
      valid: false,
      reason: `RPC verification failed: ${error?.message || 'unknown error'}. Payment cannot be confirmed without on-chain proof.`,
    };
  }
}
