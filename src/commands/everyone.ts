import { Command } from '../types/command.js';

export const everyone: Command = {
    name: 'everyone',
    description: 'Tag all participants in a group',
    usage: '!everyone [message]',
    aliases: ['tagall', 'hidetag'],
    execute: async (sock, msg, args) => {
        const remoteJid = msg.key.remoteJid;

        if (!remoteJid || !remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(remoteJid!, { text: 'This command can only be used in groups.' });
            return;
        }

        try {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const participants = groupMetadata.participants.map(p => p.id);

            // Determine if we should hide tags (hidetag) or show them (everyone/tagall)
            // For now, we will default to visible tags to avoid user confusion, 
            // unless the message explicitly uses the 'hidetag' alias (we can check msg text but args doesn't give command name).
            // Let's just do visible tags as a default "list" because the user complained "it's just replying Everyone".

            const text = args.join(' ') || 'Everyone!';

            // Create a message that explicitly lists the mentions so they turn blue
            let messageText = `${text}\n\n`;
            for (const participant of participants) {
                messageText += `@${participant.split('@')[0]}\n`;
            }

            await sock.sendMessage(remoteJid, {
                text: messageText,
                mentions: participants
            }, { quoted: msg });

        } catch (error) {
            console.error('Failed to tag everyone:', error);
            await sock.sendMessage(remoteJid, { text: 'Failed to fetch group members.' });
        }
    }
};
