import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const findChromeExecutable = async (): Promise<string | null> => {
    const envPath = process.env.CHROME_PATH;
    const candidates = [
        envPath,
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }

    for (const binaryName of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
        try {
            const { stdout } = await execFileAsync('which', [binaryName]);
            const binary = stdout.trim();
            if (binary) return binary;
        } catch {
            continue;
        }
    }

    return null;
};

type ScreenshotOptions = {
    url: string;
    userDataDir?: string;
    width?: number;
    height?: number;
    timeoutMs?: number;
};

export const captureChromeScreenshot = async ({
    url,
    userDataDir,
    width = 1440,
    height = 1024,
    timeoutMs = 60000,
}: ScreenshotOptions): Promise<Buffer> => {
    const executablePath = await findChromeExecutable();
    if (!executablePath) {
        throw new Error('Chrome/Chromium tidak ditemukan. Install Chrome atau set CHROME_PATH dulu.');
    }

    const outputPath = join(tmpdir(), `wajbot-shot-${Date.now()}.png`);
    const args = [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${width},${height}`,
        `--screenshot=${outputPath}`,
        ...(userDataDir ? [`--user-data-dir=${userDataDir}`] : []),
        url,
    ];

    try {
        await execFileAsync(executablePath, args, { timeout: timeoutMs });
        return await fs.readFile(outputPath);
    } finally {
        await fs.rm(outputPath, { force: true }).catch(() => undefined);
    }
};
