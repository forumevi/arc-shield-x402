"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const x402_1 = require("./middleware/x402");
const geminiOracle_1 = require("./services/geminiOracle");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Public Sağlık Kontrolü Endpoint'i
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ArcShield x402 Security Oracle Gateway',
        timestamp: new Date().toISOString()
    });
});
// Güvenlik Analizi Endpoint'i (x402 Micropayment Korumalı)
app.post('/api/v1/analyze', x402_1.x402Middleware, async (req, res) => {
    try {
        const { target_address, chain_id } = req.body;
        if (!target_address) {
            return res.status(400).json({ error: 'Missing required parameter: target_address' });
        }
        const analysis = await (0, geminiOracle_1.analyzeSecurityTarget)(target_address, chain_id || 'arc-mainnet');
        return res.json({
            success: true,
            payment_info: req.paymentInfo,
            analysis
        });
    }
    catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 ArcShield Gateway running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map