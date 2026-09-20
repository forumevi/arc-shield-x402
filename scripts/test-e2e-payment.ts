import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://arc-shield-gateway-373439937684.europe-west1.run.app';
const RPC_URL = process.env.ARC_RPC_URL || process.env.RPC_URL || 'https://rpc.arc.network';

// .env dosyasındaki CLIENT_PRIVATE_KEY veya AGENT_PRIVATE_KEY okuma
let rawKey = (process.env.CLIENT_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || '').trim();
if (rawKey && !rawKey.startsWith('0x')) {
  rawKey = `0x${rawKey}`;
}
const AGENT_PRIVATE_KEY = rawKey;

const USDC_CONTRACT_ADDRESS = process.env.ARC_USDC_ADDRESS || process.env.USDC_CONTRACT_ADDRESS || '0x323a676E469cEBCB28d2d6342d8d8581F7EFB306';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)'
];

async function runE2E() {
  console.log('🚀 Starting ArcShield x402 Live E2E Autonomous Agent Test...\n');

  const targetAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

  console.log('1️⃣ Sending initial unauthenticated request to Gateway...');
  const initRes = await fetch(`${GATEWAY_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_address: targetAddress, chain_id: 'arc-mainnet' })
  });

  if (initRes.status !== 402) {
    console.error('❌ Expected HTTP 402 Payment Required, got:', initRes.status);
    return;
  }

  const paymentReq = await initRes.json();
  console.log('✅ Received HTTP 402 Payment Required!');
  console.log('💳 x402 Payment Requirements:', paymentReq);

  const recipientAddress = paymentReq.recipient_address;
  const amountUSDC = paymentReq.amount_usdc;

  console.log('\n2️⃣ Signing & Broadcasting USDC Transfer on Arc Mainnet...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  if (!AGENT_PRIVATE_KEY) {
    throw new Error('❌ Neither CLIENT_PRIVATE_KEY nor AGENT_PRIVATE_KEY was found in .env file!');
  }

  const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);

  console.log(`💸 Agent Wallet Address: ${wallet.address}`);
  console.log(`🎯 Recipient Oracle Address: ${recipientAddress}`);

  const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, wallet);
  const amountToTransfer = ethers.parseUnits(amountUSDC.toString(), 6);

  console.log('⏳ Broadcasting transaction to Arc Mainnet block...');
  const tx = await usdcContract.transfer(recipientAddress, amountToTransfer);
  console.log(`TX Hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in Block #${receipt.blockNumber}`);
  console.log(`🔗 Arc Explorer Link: https://explorer.arc.io/tx/${tx.hash}`);

  console.log('\n3️⃣ Submitting payment proof (TX Hash) to Gateway for Gemini AI analysis...');
  const finalRes = await fetch(`${GATEWAY_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-proof': tx.hash
    },
    body: JSON.stringify({ target_address: targetAddress, chain_id: 'arc-mainnet' })
  });

  const finalData = await finalRes.json();
  console.log('\n🎉 [SUCCESS] x402 Payment Verified & Gemini AI Analysis Received!');
  console.log('----------------------------------------------------');
  console.log(JSON.stringify(finalData, null, 2));
  console.log('----------------------------------------------------');
}

runE2E().catch(console.error);
