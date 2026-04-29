import { Command } from '../types/command';
import { downloadMedia, getImageMimeType, getTargetMessage } from '../utils/media';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'x-ai/grok-4.1-fast';
const DEFAULT_TIMEOUT_MS = 90000;
const MAX_REPLY_LENGTH = 3500;
const DEFAULT_MAX_COMPLETION_TOKENS = 520;
const DEFAULT_TEMPERATURE = 0.2;

type OpenRouterUsage = {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
};

type OpenRouterContentPart = {
    type?: string;
    text?: string;
};

type OpenRouterResponse = {
    choices?: Array<{
        message?: {
            content?: string | OpenRouterContentPart[];
        };
    }>;
    usage?: OpenRouterUsage;
    error?: {
        message?: string;
    };
};

const parseCustomInstruction = (args: string[]): string => args.join(' ').trim();

const buildPrompt = (customInstruction: string): string => {
    const basePrompt = [
        'Analisis teknikal chart saham pada gambar.',
        'Gunakan Bahasa Indonesia, teks polos WhatsApp, tanpa Markdown.',
        'Wajib isi: tren utama, support/resistance, momentum, skenario bullish, skenario bearish, dan rencana risiko (invalidasi/stop loss).',
        'Padat, actionable, dan maksimal sekitar 1300 karakter.',
        'Akhiri dengan disclaimer singkat: bukan nasihat finansial.',
    ].join(' ');

    return customInstruction
        ? `${basePrompt}\n\nInstruksi tambahan dari user: ${customInstruction}`
        : basePrompt;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const extractTextFromResponse = (payload: OpenRouterResponse): string => {
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part.text === 'string' ? part.text.trim() : ''))
            .filter(Boolean)
            .join('\n')
            .trim();
    }
    return '';
};

const toWhatsAppPlainText = (text: string): string => {
    return text
        .replace(/```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const splitForWhatsApp = (text: string, chunkSize: number): string[] => {
    const normalized = text.trim();
    if (!normalized) return [];

    const chunks: string[] = [];
    let remaining = normalized;

    while (remaining.length > chunkSize) {
        let splitIndex = remaining.lastIndexOf('\n', chunkSize);
        if (splitIndex < Math.floor(chunkSize * 0.5)) {
            splitIndex = remaining.lastIndexOf(' ', chunkSize);
        }
        if (splitIndex <= 0) {
            splitIndex = chunkSize;
        }

        const chunk = remaining.slice(0, splitIndex).trim();
        if (chunk) chunks.push(chunk);
        remaining = remaining.slice(splitIndex).trim();
    }

    if (remaining) chunks.push(remaining);
    return chunks;
};

const requestOpenRouterAnalysis = async (
    imageBuffer: Buffer,
    mimeType: string,
    customInstruction: string
): Promise<{ analysis: string; usage?: OpenRouterUsage }> => {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY belum ditemukan di environment.');
    }

    const model = process.env.OPENROUTER_TV_MODEL?.trim() || DEFAULT_MODEL;
    const maxCompletionTokens = parsePositiveInt(
        process.env.OPENROUTER_TV_MAX_COMPLETION_TOKENS,
        DEFAULT_MAX_COMPLETION_TOKENS
    );
    const prompt = buildPrompt(customInstruction);
    const imageDataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const response = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: DEFAULT_TEMPERATURE,
                max_completion_tokens: maxCompletionTokens,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl,
                                },
                            },
                        ],
                    },
                ],
            }),
            signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;
        if (!response.ok) {
            const errorMessage = payload.error?.message?.trim() || `OpenRouter mengembalikan status ${response.status}.`;
            throw new Error(errorMessage);
        }

        const analysis = extractTextFromResponse(payload);
        if (!analysis) {
            throw new Error('Respons model kosong. Coba lagi dengan gambar yang lebih jelas.');
        }

        return { analysis, usage: payload.usage };
    } finally {
        clearTimeout(timeoutHandle);
    }
};

export const tvanal: Command = {
    name: 'tvanal',
    description: 'Analisis gambar chart saham via OpenRouter',
    usage: '.tvanal [opsional instruksi]',
    execute: async (sock, msg, args) => {
        const targetMsg = getTargetMessage(msg);
        const imageBuffer = await downloadMedia(targetMsg);
        const mimeType = getImageMimeType(targetMsg);

        if (!imageBuffer || !mimeType) {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: 'Kirim gambar chart dengan caption .tvanal atau balas gambar chart dengan .tvanal.',
            }, { quoted: msg });
            return;
        }

        const customInstruction = parseCustomInstruction(args);
        const model = process.env.OPENROUTER_TV_MODEL?.trim() || DEFAULT_MODEL;

        try {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: `Sedang analisis chart pakai ${model}...`,
            }, { quoted: msg });

            const { analysis, usage } = await requestOpenRouterAnalysis(imageBuffer, mimeType, customInstruction);
            const plainAnalysis = toWhatsAppPlainText(analysis);
            const chunks = splitForWhatsApp(`Analisis AI (${model}):\n\n${plainAnalysis}`, MAX_REPLY_LENGTH);

            for (const chunk of chunks) {
                await sock.sendMessage(msg.key.remoteJid!, { text: chunk }, { quoted: msg });
            }

            const showUsage = process.env.OPENROUTER_TV_SHOW_USAGE?.toLowerCase() === 'true';
            if (showUsage && usage) {
                const promptTokens = usage.prompt_tokens ?? '-';
                const completionTokens = usage.completion_tokens ?? '-';
                const totalTokens = usage.total_tokens ?? '-';
                const cost = typeof usage.cost === 'number' ? usage.cost.toFixed(6) : '-';

                await sock.sendMessage(msg.key.remoteJid!, {
                    text: `Token usage -> prompt: ${promptTokens}, output: ${completionTokens}, total: ${totalTokens}, cost: ${cost}`,
                }, { quoted: msg });
            }
        } catch (error) {
            const detail = error instanceof Error && error.message.trim()
                ? error.message.trim()
                : 'Terjadi error tidak diketahui.';

            await sock.sendMessage(msg.key.remoteJid!, {
                text: `Gagal menganalisis chart: ${detail}`,
            }, { quoted: msg });
        }
    },
};
