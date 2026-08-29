export function damerauLevenshtein(a, b) {
    if (a === b) return 0
    const al = a.length, bl = b.length
    if (al === 0) return bl
    if (bl === 0) return al

    const d = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0))
    for (let i = 0; i <= al; i++) d[i][0] = i
    for (let j = 0; j <= bl; j++) d[0][j] = j

    for (let i = 1; i <= al; i++) {
        for (let j = 1; j <= bl; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            d[i][j] = Math.min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + cost
            )
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
            }
        }
    }
    return d[al][bl]
}

export function findClosestCommands(input, candidates, options = {}) {
    const {
        limit = 3,
        maxDistanceRatio = 0.4,
        minInputLength = 2
    } = options

    if (!input || input.length < minInputLength || !candidates?.length) return []

    const scored = []
    for (const cmd of candidates) {
        const lenDiff = Math.abs(cmd.length - input.length)
        const maxAllowedDiff = Math.max(2, Math.ceil(Math.max(cmd.length, input.length) * maxDistanceRatio))
        if (lenDiff > maxAllowedDiff) continue

        const startsWithSame = cmd[0] === input[0]
        const dist = damerauLevenshtein(input, cmd)
        const ratio = dist / Math.max(cmd.length, input.length)

        const threshold = startsWithSame ? maxDistanceRatio + 0.15 : maxDistanceRatio
        if (ratio > threshold) continue

        scored.push({ cmd, dist, ratio })
    }

    scored.sort((a, b) => a.dist - b.dist || a.cmd.length - b.cmd.length || a.cmd.localeCompare(b.cmd))
    return scored.slice(0, limit).map(s => s.cmd)
}
