# 🛡️ ArcShield Gateway

ArcShield is an AI-driven security oracle built for Arc Mainnet, leveraging the x402 Protocol for micropayments and powered by Google Gemini AI. It serves as an automated security validation layer for AI Agents operating on-chain, compliant with the Circle Agent Stack.
> **Live Demo (Frontend):** https://arc-shield-frontend.vercel.app  
> **Frontend Repository:** https://github.com/forumevi/arc-shield-frontend
> 
## Key Features

* x402 Micropayment Middleware: Implements dynamic HTTP 402 Payment Required headers requesting 0.001 USDC for security analysis queries.
* On-Chain Log Proof Verification: Validates native USDC Transfer event logs directly from Arc Mainnet RPC receipts, verifying recipient 0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa and required amounts before processing requests.
* Gemini 1.5 Flash AI Oracle: Delivers real-time risk scores, safety statuses (SAFE, WARNING, CRITICAL), threat analysis, and actionable security recommendations.
* Circle Agent Stack Compliant: Designed for autonomous agent-to-agent transactions using standardized USDC micro-settlements.

## Architecture Flow

1. Client Request: Client sends POST /api/v1/analyze with target_address.
2. x402 Handshake: Gateway responds with 402 Payment Required and payment requirements.
3. On-Chain Payment: Client submits 0.001 USDC payment on Arc Mainnet and captures the transaction hash.
4. Proof Submission: Client re-sends request with x-payment-proof: TX_HASH.
5. Log Parsing & Verification: Gateway verifies receipt status and checks Transfer event logs.
6. AI Analysis: Upon payment confirmation, Gemini 1.5 Flash evaluates the target address and returns the security report.

## Live Gateway Endpoint

* Base URL: [https://arc-shield-gateway-373439937684.europe-west1.run.app](https://arc-shield-gateway-373439937684.europe-west1.run.app)
* Health Check: GET /health
* Analyze Endpoint: POST /api/v1/analyze

## E2E Verification

To run the end-to-end verification script:
npx tsx scripts/test-e2e-payment.ts
### 🤖 Autonomous Agent-to-Agent E2E Execution Proof

The logs below demonstrate a 100% human-out-of-the-loop, autonomous execution where an AI Agent interacts with the ArcShield Gateway, handles the HTTP 402 handshake, signs & broadcasts 0.001 USDC on Arc Mainnet, and retrieves the AI analysis:

```bash
ubuntu@vcn-20260830-0001:~/arc-shield/agent-gateway$ npx tsx scripts/test-e2e-payment.ts
◇ injected env (8) from .env
🚀 Starting ArcShield x402 Live E2E Autonomous Agent Test...
1️⃣ Sending initial unauthenticated request to Gateway...
✅ Received HTTP 402 Payment Required!
💳 x402 Payment Requirements: {
  error: 'Payment Required',
  protocol: 'x402',
  amount_usdc: 0.001,
  recipient_address: '0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa',
  chain_id: 'arc-mainnet',
  message: 'Please attach a valid transaction hash in the x-payment-proof header.'
}
2️⃣ Signing & Broadcasting USDC Transfer on Arc Mainnet...
💸 Agent Wallet Address: 0x292685C0e1572Ec472cD8d4a971C9F26e262E27d
🎯 Recipient Oracle Address: 0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa
⏳ Broadcasting transaction to Arc Mainnet block...
TX Hash: 0x1df472849682cf748a606dd3d8a119d32f27c9e613b5ca01d2495f6e44503c8c
✅ Transaction confirmed in Block #21918289
🔗 Arc Explorer Link: [https://explorer.arc.network/tx/0x1df472849682cf748a606dd3d8a119d32f27c9e613b5ca01d2495f6e44503c8c](https://explorer.arc.network/tx/0x1df472849682cf748a606dd3d8a119d32f27c9e613b5ca01d2495f6e44503c8c)
3️⃣ Submitting payment proof (TX Hash) to Gateway for Gemini AI analysis...
🎉 [SUCCESS] x402 Payment Verified & Gemini AI Analysis Received!
----------------------------------------------------
{
  "success": true,
  "payment_info": {
    "transactionHash": "0x1df472849682cf748a606dd3d8a119d32f27c9e613b5ca01d2495f6e44503c8c",
    "blockNumber": 21918289,
    "from": "0x292685C0e1572Ec472cD8d4a971C9F26e262E27d",
    "to": "0x95773c1f40b82dd8d0529471f6a6016fdfe990aa",
    "amountUSDC": 0.001
  },
  "analysis": {
    "target_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "chain_id": "arc-mainnet",
    "risk_score": 0.15,
    "safety_status": "SAFE",
    "analysis_summary": "ArcShield AI Security Check: Target address 0x742d35Cc... evaluated as low risk based on on-chain heuristics and Gemini safety parameters.",
    "detected_threats": [
      "NONE"
    ],
    "recommendations": [
      "Address safe for standard ERC-20 / Smart Contract interaction."
    ]
  }
}
----------------------------------------------------

### 🤖 Verified Agent Wallet & On-Chain Proofs
* **Autonomous Agent Wallet:** `0x292685C0e1572Ec472cD8d4a971C9F26e262E27d`
* **Oracle Recipient Wallet:** `0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa`
* **Sample Verified Settlement (USDC):** [View on Arc Explorer](https://explorer.arc.network/tx/0xa142d1553b68e1789f818aeb2ca25a07a1bef62c624809e9fc92a8dc82028bb0)
