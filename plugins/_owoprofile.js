import { getOwo, fmtCowoncy, isCookieBuffActive, ANIMALS_BY_ID, totalZooCount, getTeam, animalStats, WEAPONS } from '../lib/owo.js'

export default {
    cmd: ['owoprofile', 'owoprofil', 'owome'],
    category: 'owo',
    run: async (m) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const owo = getOwo(target)
        const team = getTeam(target)
        const zooSpecies = Object.keys(owo.zoo).length

        let out = `🪪 *PROFIL OWO*${target !== m.sender ? ` — @${target.split('@')[0]}` : ''}\n\n`
        out += `Cowoncy: ${fmtCowoncy(owo.cowoncy)} (di tangan) + ${fmtCowoncy(owo.bank)} (bank)\n`
        out += `🧪 Essence: ${owo.essence}\n`
        out += `🔥 Daily streak: ${owo.dailyStreak} hari\n`
        out += `🦁 Zoo: ${totalZooCount(target)} ekor, ${zooSpecies} spesies\n`

        if (team.length) {
            const teamLine = team.map(id => {
                const a = ANIMALS_BY_ID[id]
                const s = animalStats(target, id)
                return `${a?.emoji || ''}Lv.${s.level}`
            }).join(' ')
            out += `⚔️ Tim: ${teamLine}\n`
        } else {
            out += `⚔️ Tim: kosong\n`
        }

        out += `🗡️ Senjata: ${owo.weapon ? WEAPONS[owo.weapon].name : 'belum ada'}\n`
        out += `💑 Status: ${owo.spouse ? `menikah sama @${owo.spouse.split('@')[0]}` : 'lajang'}\n`

        const gemLines = Object.entries(owo.gemBonus || {}).filter(([, v]) => v > 0)
        if (gemLines.length) {
            out += `💎 Bonus gem: ${gemLines.map(([k, v]) => `${k} +${Math.round(v * 100)}%`).join(', ')}\n`
        }

        if (isCookieBuffActive(owo)) out += `🍪 Cookie buff aktif\n`

        return m.reply(out, { mentions: owo.spouse ? [target, owo.spouse].filter((v, i, a) => a.indexOf(v) === i) : (target !== m.sender ? [target] : []) })
    }
}
