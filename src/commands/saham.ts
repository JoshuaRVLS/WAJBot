import { Command } from '../types/command';
import { captureChromeScreenshot } from '../utils/chrome';

const parseStockInput = (args: string[]): string => args.join(' ').trim();

const createQuoteCandidates = (input: string): string[] => {
    const normalized = input.replace(/\s+/g, '').toUpperCase();
    if (normalized.includes(':')) return [normalized];
    return [`${normalized}:IDX`, `${normalized}:NASDAQ`, `${normalized}:NYSE`];
};

export const saham: Command = {
    name: 'saham',
    description: 'Cari saham di Google Finance lalu kirim screenshot chart',
    usage: '.saham [nama saham]',
    execute: async (sock, msg, args) => {
        const stockName = parseStockInput(args);
        if (!stockName) {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: 'Format: .saham [nama saham], contoh: .saham BBCA',
            }, { quoted: msg });
            return;
        }

        const quoteCandidates = createQuoteCandidates(stockName);

        try {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: `Sedang mengambil screenshot saham ${stockName}...`,
            }, { quoted: msg });

            let screenshot: Buffer | null = null;

            for (const quote of quoteCandidates) {
                try {
                    screenshot = await captureChromeScreenshot({
                        url: `https://www.google.com/finance/quote/${encodeURIComponent(quote)}`,
                        timeoutMs: 45000,
                    });
                    break;
                } catch {
                    continue;
                }
            }

            if (!screenshot) {
                screenshot = await captureChromeScreenshot({
                    url: `https://www.google.com/search?q=${encodeURIComponent(`cek saham ${stockName}`)}`,
                    timeoutMs: 45000,
                });
            }

            await sock.sendMessage(msg.key.remoteJid!, {
                image: screenshot,
                caption: `Chart saham: ${stockName}`,
            }, { quoted: msg });
        } catch (error) {
            const detail = error instanceof Error && error.message.trim()
                ? error.message.trim()
                : 'Gagal mengambil screenshot saham.';

            await sock.sendMessage(msg.key.remoteJid!, {
                text: `${detail} Pastikan internet aktif dan nama saham valid.`,
            }, { quoted: msg });
        }
    },
};
