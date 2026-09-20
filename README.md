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

### 🤖 Verified Agent Wallet & On-Chain Proofs
* **Autonomous Agent Wallet:** `0x292685C0e1572Ec472cD8d4a971C9F26e262E27d`
* **Oracle Recipient Wallet:** `0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa`
* **Sample Verified Settlement (USDC):** [View on Arc Explorer](https://explorer.arc.network/tx/0xa142d1553b68e1789f818aeb2ca25a07a1bef62c624809e9fc92a8dc82028bb0)
