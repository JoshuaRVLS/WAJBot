export const ignoredMessageIds = new Set<string>();

export function addIgnoredMessageId(id: string) {
    ignoredMessageIds.add(id);
    // Auto-cleanup after 10 seconds to prevent memory leaks
    setTimeout(() => {
        ignoredMessageIds.delete(id);
    }, 10000);
}

export function isIgnoredMessageId(id: string): boolean {
    if (ignoredMessageIds.has(id)) {
        ignoredMessageIds.delete(id); // Clean up immediately once found
        return true;
    }
    return false;
}
