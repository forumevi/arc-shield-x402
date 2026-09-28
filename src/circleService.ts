import {
 initiateDeveloperControlledWalletsClient,
} from '@circle-fin/developer-controlled-wallets';

export interface AgentWalletInfo {
 walletId: string;
 address: string;
 blockchain: string;
 usdcBalance: string;
 state: string;
}

let _client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

function getClient() {
 if (_client) return _client;

 const apiKey = process.env.CIRCLE_API_KEY;
 const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

 if (!apiKey || !entitySecret) {
   throw new Error(
     'Circle SDK not configured: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required.'
   );
 }

 _client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
 return _client;
}

export async function getAgentWalletInfo(): Promise<AgentWalletInfo[]> {
 const client = getClient();
 const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

 const listParams: Record<string, string> = { blockchain: 'ARC-MAINNET' };
 if (walletSetId) listParams['walletSetId'] = walletSetId;

 const walletsResp = await client.listWallets(listParams);
 const wallets = walletsResp.data?.wallets ?? [];

 if (wallets.length === 0) {
   console.warn('[CircleService] No Arc Mainnet wallets found in this entity.');
   return [];
 }

 const results: AgentWalletInfo[] = [];

 for (const wallet of wallets) {
   try {
     const balResp = await client.getWalletTokenBalance({ id: wallet.id });
     const tokenBalances = balResp.data?.tokenBalances ?? [];

     const usdcEntry = tokenBalances.find(
       (tb: any) =>
         tb.token?.symbol?.toUpperCase() === 'USDC' ||
         tb.token?.name?.toLowerCase().includes('usd coin')
     );

     results.push({
       walletId: wallet.id,
       address: wallet.address,
       blockchain: wallet.blockchain,
       usdcBalance: usdcEntry?.amount ?? '0',
       state: wallet.state,
     });
   } catch (err: any) {
     console.warn(`[CircleService] Could not fetch balance for wallet ${wallet.id}:`, err?.message);
     results.push({
       walletId: wallet.id,
       address: wallet.address,
       blockchain: wallet.blockchain,
       usdcBalance: 'unknown',
       state: wallet.state,
     });
   }
 }

 console.log(`[CircleService] Retrieved ${results.length} Arc Mainnet wallet(s) via Circle SDK.`);
 return results;
}

export async function verifyCircleCredentials(): Promise<{ ok: boolean; error?: string }> {
 try {
   const client = getClient();
   await client.listWallets({ pageSize: 1 });
   return { ok: true };
 } catch (err: any) {
   return { ok: false, error: err?.message };
 }
}
