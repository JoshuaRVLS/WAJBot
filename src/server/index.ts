import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initSocket } from '../utils/socket.js';
import { connectToWhatsApp, disconnectWhatsApp, reconnectWhatsApp, getBotStatus } from '../services/socket.js';
import { commands } from '../commands/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer() {
    const app = express();
    const server = createServer(app);
    const port = 3000;

    // Use JSON parser for potential future needs, though not strictly needed here
    app.use(express.json());

    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '../../public')));

    // Initialize Socket.IO
    initSocket(server);

    // Set view engine to ejs
    app.set('views', path.join(__dirname, '../../views'));
    app.set('view engine', 'ejs');

    // APIs
    app.post('/api/bot/start', (req, res) => {
        connectToWhatsApp();
        res.json({ success: true });
    });

    app.post('/api/bot/stop', (req, res) => {
        disconnectWhatsApp();
        res.json({ success: true });
    });

    app.post('/api/bot/restart', (req, res) => {
        reconnectWhatsApp();
        res.json({ success: true });
    });

    app.get('/', (req, res) => {
        res.render('index', {
            status: getBotStatus(),
            botName: 'WAJBot',
            startTime: Date.now() - (process.uptime() * 1000),
            commands: commands
        });
    });

    server.listen(port, () => {
        console.log(`Dashboard running at http://localhost:${port}`);
    });
}
