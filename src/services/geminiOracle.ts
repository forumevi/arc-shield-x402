import { ethers } from 'ethers';

export interface SecurityAnalysisResult {
  target_address: string;
  chain_id: string;
  risk_score: number;
  safety_status: 'SAFE' | 'WARNING' | 'CRITICAL';
  analysis_summary: string;
  detected_threats: string[];
  recommendations: string[];
  onchain_context?: OnchainContext;
}

interface OnchainContext {
  is_contract: boolean;
  balance_usdc: string;
  transaction_count: number;
  bytecode_size: number;
  rpc_error?: string;
}

async function fetchOnchainContext(address: string): Promise<OnchainContext> {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const USDC_PRECOMPILE = '0x3600000000000000000000000000000000000000';
  const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const [code, txCount, usdcBalance] = await Promise.all([
      provider.getCode(address),
      provider.getTransactionCount(address),
      new ethers.Contract(USDC_PRECOMPILE, ERC20_ABI, provider).balanceOf(address) as Promise<bigint>,
    ]);

    const isContract = code !== '0x' && code.length > 2;
    return {
      is_contract: isContract,
      balance_usdc: (Number(usdcBalance) / 1_000_000).toFixed(6),
      transaction_count: txCount,
      bytecode_size: isContract ? (code.length - 2) / 2 : 0,
    };
  } catch (err: any) {
    console.warn('[GeminiOracle] Onchain context fetch failed:', err?.message);
    return { is_contract: false, balance_usdc: 'unknown', transaction_count: 0, bytecode_size: 0, rpc_error: err?.message };
  }
}

export async function analyzeSecurityTarget(
  targetAddress: string,
  chainId: string = 'arc-mainnet'
): Promise<SecurityAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const onchainCtx = await fetchOnchainContext(targetAddress);

  if (!apiKey || apiKey.trim() === '') {
    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: 0.1,
      safety_status: 'SAFE',
      analysis_summary: `Address ${targetAddress} reviewed on-chain. ${onchainCtx.is_contract ? `Smart contract detected (${onchainCtx.bytecode_size} bytes).` : 'EOA wallet.'} TX count: ${onchainCtx.transaction_count}. USDC balance: ${onchainCtx.balance_usdc}. Gemini AI analysis unavailable (API key missing).`,
      detected_threats: ['NONE'],
      recommendations: ['Configure GEMINI_API_KEY for full AI-powered analysis.'],
      onchain_context: onchainCtx,
    };
  }

  try {
    const contextSummary = onchainCtx.rpc_error
      ? `On-chain data unavailable (RPC error: ${onchainCtx.rpc_error}).`
      : `On-chain data from Arc Mainnet RPC:
- Address type: ${onchainCtx.is_contract ? `Smart Contract (${onchainCtx.bytecode_size} bytes of bytecode)` : 'EOA (Externally Owned Account)'}
- Total transactions sent: ${onchainCtx.transaction_count}
- Current USDC balance: ${onchainCtx.balance_usdc} USDC
${onchainCtx.is_contract ? '- WARNING: This is a smart contract — evaluate bytecode patterns, potential reentrancy, and upgrade proxies.' : ''}`;

    const prompt = `You are ArcShield Security Oracle, an onchain security analysis system for Arc Mainnet.

Analyze the following address: ${targetAddress}
Chain: ${chainId}

${contextSummary}

Based on these real on-chain facts, provide a security assessment. Be precise and data-driven — do NOT speculate beyond the provided data.

Return strictly a JSON object (no markdown, no extra text) with these exact keys:
{
  "risk_score": <number 0.0-1.0>,
  "safety_status": <"SAFE"|"WARNING"|"CRITICAL">,
  "analysis_summary": <string, max 3 sentences, reference actual on-chain facts>,
  "detected_threats": <string array, use ["NONE"] if no threats>,
  "recommendations": <string array, 1-3 actionable items>
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Gemini API HTTP Error: ${res.status}`);

    const data: any = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/g, '');
    const parsed = JSON.parse(cleanJson);

    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: parsed.risk_score ?? 0.1,
      safety_status: parsed.safety_status ?? 'SAFE',
      analysis_summary: parsed.analysis_summary ?? 'Address analyzed successfully via Gemini Oracle.',
      detected_threats: parsed.detected_threats ?? ['NONE'],
      recommendations: parsed.recommendations ?? ['Verified for interaction.'],
      onchain_context: onchainCtx,
    };
  } catch (error: any) {
    console.error('[GeminiOracle] API Error:', error?.message);
    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: onchainCtx.is_contract ? 0.3 : 0.1,
      safety_status: onchainCtx.is_contract ? 'WARNING' : 'SAFE',
      analysis_summary: `On-chain data retrieved from Arc Mainnet. Address is ${onchainCtx.is_contract ? `a smart contract (${onchainCtx.bytecode_size} bytes)` : 'an EOA wallet'} with ${onchainCtx.transaction_count} outbound transactions and ${onchainCtx.balance_usdc} USDC balance. Full AI analysis temporarily unavailable.`,
      detected_threats: onchainCtx.is_contract ? ['UNVERIFIED_CONTRACT'] : ['NONE'],
      recommendations: ['Verify contract source code on Arc Explorer before interaction.'],
      onchain_context: onchainCtx,
    };
  }
}
