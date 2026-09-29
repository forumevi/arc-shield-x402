import { ethers } from 'ethers';

export interface FunctionSignature {
  selector: string;
  name: string | null;
}

export interface ThreatIntelResult {
  is_flagged: boolean;
  sources: string[];
  labels: string[];
}

export interface AddressIntelligence {
  function_signatures: FunctionSignature[];
  threat_intel: ThreatIntelResult;
}

export async function decodeFunctionSignatures(bytecode: string): Promise<FunctionSignature[]> {
  if (!bytecode || bytecode === '0x' || bytecode.length < 10) return [];

  const selectorSet = new Set<string>();
  const clean = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;

  for (let i = 0; i <= clean.length - 8; i += 2) {
    const candidate = clean.slice(i, i + 8);
    if (/^[0-9a-f]{8}$/.test(candidate)) selectorSet.add(candidate);
  }

  const selectors = Array.from(selectorSet).slice(0, 20);
  if (selectors.length === 0) return [];

  console.log(`[AddressIntel] ${selectors.length} selector bulundu, 4bytes.directory'den çözümleniyor...`);

  const results: FunctionSignature[] = [];

  for (const selector of selectors) {
    try {
      const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=0x${selector}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data: any = await res.json();
        const name = data?.results?.[0]?.text_signature ?? null;
        results.push({ selector: `0x${selector}`, name });
      } else {
        results.push({ selector: `0x${selector}`, name: null });
      }
    } catch {
      results.push({ selector: `0x${selector}`, name: null });
    }
  }

  return results;
}

export async function checkThreatIntel(address: string): Promise<ThreatIntelResult> {
  const result: ThreatIntelResult = { is_flagged: false, sources: [], labels: [] };
  const addr = address.toLowerCase();

  try {
    const chainabuseRes = await fetch(
      `https://www.chainabuse.com/api/reports?address=${addr}&limit=1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (chainabuseRes.ok) {
      const data: any = await chainabuseRes.json();
      const count = data?.total ?? data?.reports?.length ?? 0;
      if (count > 0) {
        result.is_flagged = true;
        result.sources.push('chainabuse');
        result.labels.push(`${count} abuse report(s)`);
      }
    }
  } catch { /* non-blocking */ }

  try {
    const fortaRes = await fetch(
      `https://api.forta.network/labels/state?entities=${addr}&limit=5`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (fortaRes.ok) {
      const data: any = await fortaRes.json();
      const labels: any[] = data?.labels ?? [];
      const critical = labels.filter((l: any) =>
        l?.label?.toLowerCase().includes('exploit') ||
        l?.label?.toLowerCase().includes('phish') ||
        l?.label?.toLowerCase().includes('scam') ||
        l?.confidence >= 0.8
      );
      if (critical.length > 0) {
        result.is_flagged = true;
        result.sources.push('forta');
        result.labels.push(...critical.map((l: any) => l.label));
      }
    }
  } catch { /* non-blocking */ }

  return result;
}

export async function enrichAddressIntelligence(
  address: string,
  bytecode: string
): Promise<AddressIntelligence> {
  const [function_signatures, threat_intel] = await Promise.all([
    decodeFunctionSignatures(bytecode),
    checkThreatIntel(address),
  ]);
  return { function_signatures, threat_intel };
}
