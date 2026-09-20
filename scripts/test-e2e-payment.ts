import 'dotenv/config';
import { ethers } from 'ethers';

const CLOUD_RUN_URL = 'https://arc-shield-gateway-373439937684.europe-west1.run.app';
const TARGET_ADDRESS_TO_SCAN = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

async function runE2ETest() {
  console.log('🚀 ArcShield x402 Canlı E2E Testi Başlatılıyor...\n');

  // 1. Ödemesiz İstek (402 Bekleniyor)
  console.log('1️⃣ Canlı Servise Ödemesiz İstek Gönderiliyor...');
  const firstResponse = await fetch(`${CLOUD_RUN_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_address: TARGET_ADDRESS_TO_SCAN }),
  });

  if (firstResponse.status !== 402) {
    console.error(`❌ Beklenen 402 yanıtı alınamadı! Status: ${firstResponse.status}`);
    return;
  }

  const paymentDetails = await firstResponse.json();
  console.log('✅ HTTP 402 Payment Required Başarıyla Alındı!');
  console.log('💳 Ödeme Detayları:', paymentDetails);

  // 2. Arc Mainnet Üzerinde USDC Transferi
  console.log('\n2️⃣ Arc Mainnet Üzerinde USDC Transferi İmzalanıyor...');
  
  const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
  const clientWallet = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY!, provider);
  const usdcContract = new ethers.Contract(process.env.ARC_USDC_ADDRESS!, ERC20_ABI, clientWallet);

  const decimals = await usdcContract.decimals();
  const amountToPay = ethers.parseUnits(paymentDetails.amount_usdc.toString(), decimals);

  console.log(`💸 Gönderen Cüzdan: ${clientWallet.address}`);
  console.log(`🎯 Alıcı Cüzdan: ${paymentDetails.recipient_address}`);

  const tx = await usdcContract.transfer(paymentDetails.recipient_address, amountToPay);
  console.log(`⏳ İşlem Bloğa Ekleniyor... TX Hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`✅ İşlem Onaylandı! Blok No: ${receipt.blockNumber}`);
  console.log(`🔗 Arc Explorer Linki: https://explorer.arc.network/tx/${tx.hash}`);

  // 3. x-payment-proof Header'ı ile İkinci İstek (200 OK + AI Raporu)
  console.log('\n3️⃣ İşlem Kanıtı (TX Hash) ile Tekrar Analiz İsteği Gönderiliyor...');
  const secondResponse = await fetch(`${CLOUD_RUN_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-proof': tx.hash,
    },
    body: JSON.stringify({ target_address: TARGET_ADDRESS_TO_SCAN }),
  });

  const finalResult = await secondResponse.json();

  if (secondResponse.ok) {
    console.log('\n🎉 [BAŞARILI] x402 Ödeme Doğrulandı ve Gemini AI Analizi Alındı!');
    console.log('----------------------------------------------------');
    console.log(JSON.stringify(finalResult, null, 2));
    console.log('----------------------------------------------------');
  } else {
    console.error(`❌ İkinci istek başarısız oldu! Status: ${secondResponse.status}`, finalResult);
  }
}

runE2ETest().catch((err) => {
  console.error('💥 Test sırasında hata oluştu:', err);
});
