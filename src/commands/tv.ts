import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Command } from '../types/command';
import { captureChromeScreenshot } from '../utils/chrome';

const parseStockInput = (args: string[]): string => args.join(' ').trim();

const normalizeSymbol = (input: string): string => {
    const compact = input.replace(/\s+/g, '').toUpperCase();
    if (!compact) return compact;
    if (compact.includes(':')) return compact;
    return `IDX:${compact}`;
};

export const tv: Command = {
    name: 'tv',
    description: 'Open TradingView and send a chart screenshot',
    usage: '.tv [nama saham]',
    execute: async (sock, msg, args) => {
        const rawInput = parseStockInput(args);
        if (!rawInput) {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: 'Format: .tv [nama saham], contoh: .tv BBCA atau .tv IDX:BBCA',
            }, { quoted: msg });
            return;
        }

        const symbol = normalizeSymbol(rawInput);
        const sessionDir = join(process.cwd(), '.session', 'tradingview');
        const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;

        try {
            await fs.mkdir(sessionDir, { recursive: true });
            await sock.sendMessage(msg.key.remoteJid!, {
                text: `Sedang membuka TradingView untuk ${symbol}...`,
            }, { quoted: msg });

            const screenshot = await captureChromeScreenshot({
                url: chartUrl,
                userDataDir: sessionDir,
                timeoutMs: 90000,
            });

            await sock.sendMessage(msg.key.remoteJid!, {
                image: screenshot,
                caption: `TradingView chart: ${symbol}`,
            }, { quoted: msg });
        } catch (error) {
            const detail = error instanceof Error && error.message.trim()
                ? error.message.trim()
                : 'Gagal mengambil chart TradingView.';

            await sock.sendMessage(msg.key.remoteJid!, {
                text: `${detail} Pastikan internet aktif, simbol valid, dan session TradingView tersedia bila diminta login.`,
            }, { quoted: msg });
        }
    },
};
