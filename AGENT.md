# ArcShield Agent Specification

## Autonomous Behavior
This AI Agent is designed to autonomously audit smart contract target addresses before performing high-value on-chain operations.

## Protocol & Flow
1. **Target Evaluation Request:** Sends unauthenticated `POST /api/v1/analyze` to ArcShield Gateway.
2. **x402 Payment Negotiation:** Intercepts `HTTP 402 Payment Required` headers containing recipient wallet and USDC settlement parameters.
3. **On-Chain Settlement:** Autonomously signs and broadcasts a `0.001 USDC` native transfer transaction on Arc Mainnet via Circle Agent Stack / Ethers.
4. **Proof & Analysis Retrieval:** Submits the resulting `Tx Hash` in the `x-payment-proof` header to retrieve the Gemini 1.5 Flash security report.

## Verification Endpoint
* Base Gateway: `https://arc-shield-gateway-373439937684.europe-west1.run.app`
* Chain ID: Arc Mainnet
