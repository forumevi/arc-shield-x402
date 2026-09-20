"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSecurityTarget = analyzeSecurityTarget;
const genai_1 = require("@google/genai");
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new genai_1.GoogleGenAI({ apiKey });
async function analyzeSecurityTarget(targetAddress, chainId = 'arc-mainnet') {
    const systemInstruction = `
You are ArcShield Gemini Oracle, an autonomous AI security engine for Arc Mainnet.
Your task is to analyze blockchain addresses, smart contract patterns, and interaction risks.
You MUST reply ONLY with a valid JSON object matching this TypeScript interface:

{
  "target_address": string,
  "chain_id": string,
  "risk_score": number (0.0 to 1.0),
  "safety_status": "SAFE" | "WARNING" | "DANGEROUS",
  "analysis_summary": string,
  "detected_threats": string[],
  "recommendations": string[]
}

Rules:
1. Output NO markdown formatting outside the JSON, NO explanation text before or after.
2. Evaluate risk deterministically based on known malicious behavior, unverified contracts, or reentrancy/drainer patterns.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Gemini 3.6 Flash / 2.5 Flash SDK çağrısı
            contents: `Analyze the security profile for address ${targetAddress} on chain ${chainId}.`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });
        const resultText = response.text || '{}';
        return JSON.parse(resultText);
    }
    catch (error) {
        console.error('Gemini Oracle Error:', error.message);
        // Graceful Degradation / Fallback yanıtı
        return {
            target_address: targetAddress,
            chain_id: chainId,
            risk_score: 0.5,
            safety_status: 'WARNING',
            analysis_summary: 'Unable to complete AI security analysis due to upstream limitations.',
            detected_threats: ['ANALYSIS_TIMEOUT'],
            recommendations: ['Verify target address manually via Arc Explorer.']
        };
    }
}
//# sourceMappingURL=geminiOracle.js.map