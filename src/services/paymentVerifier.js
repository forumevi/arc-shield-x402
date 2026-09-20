"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyArcPayment = verifyArcPayment;
const axios_1 = __importDefault(require("axios"));
const ARC_EXPLORER_API = process.env.ARC_EXPLORER_API_URL || 'https://explorer.arc.network/api/v1';
const REQUIRED_AMOUNT_USDC = 0.001;
async function verifyArcPayment(txHash, recipientAddress) {
    try {
        const response = await axios_1.default.get(`${ARC_EXPLORER_API}/tx/${txHash}`);
        const tx = response.data;
        if (!tx || tx.status !== 'success') {
            return { valid: false, reason: 'Transaction failed or not found on Arc Mainnet.' };
        }
        const isCorrectRecipient = tx.to?.toLowerCase() === recipientAddress.toLowerCase();
        const transferredAmount = parseFloat(tx.value_usdc || tx.value || '0');
        if (!isCorrectRecipient) {
            return { valid: false, reason: 'Payment recipient address mismatch.' };
        }
        if (transferredAmount < REQUIRED_AMOUNT_USDC) {
            return { valid: false, reason: `Insufficient fee. Required: ${REQUIRED_AMOUNT_USDC} USDC.` };
        }
        return { valid: true, txDetails: tx };
    }
    catch (error) {
        console.error('Arc Explorer Verification Error:', error.message);
        return { valid: false, reason: 'Unable to reach Arc Explorer API for verification.' };
    }
}
//# sourceMappingURL=paymentVerifier.js.map