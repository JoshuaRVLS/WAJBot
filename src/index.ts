import { connectToWhatsApp } from './services/socket';
import { startServer } from './server/index';

startServer();
connectToWhatsApp();
