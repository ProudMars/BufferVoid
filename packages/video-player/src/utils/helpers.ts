export function normalizeId(id: string) {
    return id.startsWith('#') ? id.slice(1) : id
}