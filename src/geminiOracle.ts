import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export async function analyzeAddressSecurity(targetAddress: string, chainId: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment variables.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are ArcShield Security Oracle. Analyze this Web3 address on chain '${chainId}': ${targetAddress}.
    Provide a brief JSON response with keys: risk_score (number 0.0 to 1.0), safety_status ("SAFE", "WARNING", "DANGEROUS"), analysis_summary (string max 20 words). Output ONLY valid JSON without markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('[GeminiOracle] Gemini AI analysis failed:', error);
    return {
      risk_score: 0.5,
      safety_status: 'WARNING',
      analysis_summary: 'AI Oracle temporary degradation. Proceed with caution.',
    };
  }
}
