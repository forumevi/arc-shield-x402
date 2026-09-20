export interface SecurityAnalysisResult {
    target_address: string;
    chain_id: string;
    risk_score: number;
    safety_status: 'SAFE' | 'WARNING' | 'DANGEROUS';
    analysis_summary: string;
    detected_threats: string[];
    recommendations: string[];
}
export declare function analyzeSecurityTarget(targetAddress: string, chainId?: string): Promise<SecurityAnalysisResult>;
//# sourceMappingURL=geminiOracle.d.ts.map