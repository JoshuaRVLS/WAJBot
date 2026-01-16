import { WASocket } from '@whiskeysockets/baileys';

const groupCache = new Map<string, string>();

export const getGroupName = async (sock: WASocket, jid: string): Promise<string | undefined> => {
    if (groupCache.has(jid)) {
        return groupCache.get(jid);
    }

    try {
        const metadata = await sock.groupMetadata(jid);
        const name = metadata.subject;
        groupCache.set(jid, name);
        return name;
    } catch (e) {
        return undefined;
    }
};
