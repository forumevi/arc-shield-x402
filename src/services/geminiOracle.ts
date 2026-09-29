import { ethers } from 'ethers';
import { enrichAddressIntelligence } from './addressIntelligence.js';

export interface SecurityAnalysisResult {
  target_address: string;
  chain_id: string;
  risk_score: number;
  safety_status: 'SAFE' | 'WARNING' | 'CRITICAL';
  analysis_summary: string;
  detected_threats: string[];
  recommendations: string[];
  onchain_context?: OnchainContext;
  intelligence?: any;
}

interface OnchainContext {
  is_contract: boolean;
  balance_usdc: string;
  transaction_count: number;
  bytecode_size: number;
  rpc_error?: string;
}

async function fetchOnchainContext(address: string): Promise<{ ctx: OnchainContext; bytecode: string }> {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
  const USDC_PRECOMPILE = '0xfffffffffffffffffffffffffffffffffffffffe';
  const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const [code, txCount, usdcBalance] = await Promise.all([
      provider.getCode(address),
      provider.getTransactionCount(address),
      new ethers.Contract(USDC_PRECOMPILE, ERC20_ABI, provider).balanceOf(address).catch(() => 0n) as Promise<bigint>,
    ]);

    const isContract = code !== '0x' && code.length > 2;
    const bytecodeSize = isContract ? (code.length - 2) / 2 : 0;
    const balanceUSDC = (Number(usdcBalance) / 1e18).toFixed(6);

    return {
      ctx: { is_contract: isContract, balance_usdc: balanceUSDC, transaction_count: txCount, bytecode_size: bytecodeSize },
      bytecode: code,
    };
  } catch (err: any) {
    return {
      ctx: { is_contract: false, balance_usdc: 'unknown', transaction_count: 0, bytecode_size: 0, rpc_error: err?.message },
      bytecode: '0x',
    };
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.status === 503) {
      console.log(`[GeminiOracle] 503 received, retry ${attempt + 1}/3...`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

    return await res.json();
  }

  throw new Error('Gemini 503 after 3 retries');
}

export async function analyzeSecurityTarget(
  targetAddress: string,
  chainId: string = 'arc-mainnet'
): Promise<SecurityAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`[GeminiOracle] API key present: ${!!apiKey}, length: ${apiKey?.length ?? 0}`);

  const [{ ctx: onchainCtx, bytecode }, intelligence] = await Promise.all([
    fetchOnchainContext(targetAddress),
    enrichAddressIntelligence(targetAddress, '0x').catch(() => ({ function_signatures: [], threat_intel: { is_flagged: false, sources: [], labels: [] } })),
  ]);

  const { function_signatures, threat_intel } = intelligence;

  if (!apiKey || apiKey.trim() === '') {
    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: 0.1,
      safety_status: 'SAFE',
      analysis_summary: `Address ${targetAddress} reviewed on-chain. ${onchainCtx.is_contract ? `Smart contract (${onchainCtx.bytecode_size} bytes).` : 'EOA wallet.'} TX count: ${onchainCtx.transaction_count}. USDC: ${onchainCtx.balance_usdc}. Gemini API key missing.`,
      detected_threats: threat_intel.is_flagged ? threat_intel.labels : ['NONE'],
      recommendations: ['Configure GEMINI_API_KEY for full AI analysis.'],
      onchain_context: onchainCtx,
      intelligence,
    };
  }

  try {
    const threatSummary = threat_intel.is_flagged
      ? `THREAT INTEL ALERT: Address flagged by ${threat_intel.sources.join(', ')} - labels: ${threat_intel.labels.join(', ')}.`
      : 'No threat intelligence flags found.';

    const fnSummary = function_signatures.length > 0
      ? `Known functions: ${function_signatures.filter((f: any) => f.name).map((f: any) => f.name).slice(0, 10).join(', ')}.`
      : '';

    const contextSummary = onchainCtx.rpc_error
      ? `On-chain data unavailable (${onchainCtx.rpc_error}).`
      : `On-chain data:
- Type: ${onchainCtx.is_contract ? `Smart Contract (${onchainCtx.bytecode_size} bytes)` : 'EOA'}
- Outbound TXs: ${onchainCtx.transaction_count}
- USDC balance: ${onchainCtx.balance_usdc}
- ${threatSummary}
${fnSummary}`;

    const prompt = `You are ArcShield Security Oracle for Arc Mainnet.

Address: ${targetAddress}
Chain: ${chainId}

${contextSummary}

Analyze and return ONLY a JSON object (no markdown, no code blocks, no extra text):
{"risk_score": 0.1, "safety_status": "SAFE", "analysis_summary": "3 sentence summary", "detected_threats": ["NONE"], "recommendations": ["action"]}`;

    const data = await callGemini(prompt, apiKey);
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[GeminiOracle] Raw response: ${rawText.slice(0, 200)}`);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText.trim();
    const parsed = JSON.parse(cleanJson);

    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: parsed.risk_score ?? 0.1,
      safety_status: parsed.safety_status ?? 'SAFE',
      analysis_summary: parsed.analysis_summary ?? 'Analysis complete.',
      detected_threats: parsed.detected_threats ?? ['NONE'],
      recommendations: parsed.recommendations ?? ['Verified for interaction.'],
      onchain_context: onchainCtx,
      intelligence,
    };
  } catch (error: any) {
    console.error("[GeminiOracle] CATCH ERROR:", String(error), error?.message, error?.name);
    return {
      target_address: targetAddress,
      chain_id: chainId,
      risk_score: threat_intel.is_flagged ? 0.8 : (onchainCtx.is_contract ? 0.3 : 0.1),
      safety_status: threat_intel.is_flagged ? 'CRITICAL' : (onchainCtx.is_contract ? 'WARNING' : 'SAFE'),
      analysis_summary: `On-chain: ${onchainCtx.is_contract ? `contract (${onchainCtx.bytecode_size} bytes)` : 'EOA'}, ${onchainCtx.transaction_count} TXs, ${onchainCtx.balance_usdc} USDC. ${threat_intel.is_flagged ? 'FLAGGED by ' + threat_intel.sources.join(', ') : 'No threat flags.'}`,
      detected_threats: threat_intel.is_flagged ? threat_intel.labels : ['NONE'],
      recommendations: ['Verify on Arc Explorer before interaction.'],
      onchain_context: onchainCtx,
      intelligence,
    };
  }
}
