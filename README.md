# ArcShield x402 Security Oracle Gateway

> **Build with Gemini XPRIZE Submission** | An autonomous, micropayment-gated AI Security Oracle built on Arc Mainnet, Circle Wallets, and Gemini 3.6 Flash.

---

## Architecture & Flow
```
[ Client ] --(1) 0.001 USDC Payment--> [ Arc Mainnet ]
    |                                        |
    +--(2) POST /check + x-payment-proof ----+
    v                                        v
[ x402 Gateway ] <--(3) Verify Tx Receipt ---+
    |
(Success 200)
    v
[ Gemini 3.6 Flash Oracle ] --(4) Security Assessment--> [ Client ]
```

### Core Tech Stack
- **AI Engine:** Google Gemini 3.6 Flash (@google/genai)
- **Blockchain & Indexer:** Arc Mainnet & Arc Explorer REST API
- **Wallet Infrastructure:** Circle Developer-Controlled Wallets
- **Server Framework:** Express.js + TypeScript (Node.js)
- **Monetization Standard:** x402 Micropayment Protocol (HTTP 402)

---

## Key Features
1. **x402 Payment Gate:** Enforces 0.001 USDC fee per API call using HTTP x-payment-proof headers.
2. **On-Chain Verification:** Real-time transaction validation against Arc Mainnet endpoints.
3. **AI Security Analysis:** Instant risk scoring, safety status (SAFE, WARNING, DANGEROUS), and threat summaries.
4. **Graceful Degradation:** Ensures high availability even during upstream API limits or network drops.

---

## Quick Start

### 1. Installation & Environment
```bash
git clone https://github.com/your-username/arc-shield.git
cd arc-shield/agent-gateway
npm install
```

Create .env file:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
CIRCLE_API_KEY=your_circle_api_key
AGENT_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

### 2. Execution & Live Test
```bash
npx tsx src/index.ts

curl -X POST http://localhost:3000/api/v1/security/check \n  -H "Content-Type: application/json" \n  -H "x-payment-proof: 0xf86ca0bbdc340086bbc7ee57e9611a5e42f8a766a58602a1430e8cc14fc5ee14" \n  -d "{"target_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "chain_id": "arc-mainnet"}"
```

### Sample Response (200 OK)
```json
{
  "status": "SUCCESS",
  "verified": true,
  "target_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "chain_id": "arc-mainnet",
  "risk_score": 0.1,
  "safety_status": "SAFE",
  "analysis_summary": "No malicious interaction patterns detected on Arc Mainnet.",
  "timestamp": "2026-09-20T15:19:10.973Z"
}
```

---

## License
MIT License
