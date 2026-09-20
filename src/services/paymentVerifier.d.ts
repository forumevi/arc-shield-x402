interface VerificationResult {
    valid: boolean;
    reason?: string;
    txDetails?: any;
}
export declare function verifyArcPayment(txHash: string, recipientAddress: string): Promise<VerificationResult>;
export {};
//# sourceMappingURL=paymentVerifier.d.ts.map