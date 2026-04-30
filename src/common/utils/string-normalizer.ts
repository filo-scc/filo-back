export function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export function normalizeCode(value: string): string {
    return normalizeText(value).toUpperCase();
}
