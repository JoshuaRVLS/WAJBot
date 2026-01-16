import { connectToWhatsApp } from './services/socket.js';
import { startServer } from './server/index.js';

startServer();
connectToWhatsApp();