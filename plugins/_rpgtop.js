import { CLASSES, fmtMoney, displayName, getRank } from '../lib/rpg.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default {
    cmd: ['leaderboard', 'rpgtop', 'top'],
    category: 'rpg',
    run: async (m, { prefix }) => {
        const entries = Object.entries(global.db.data.users || {})
            .filter(([, u]) => u.rpg?.class)
            .map(([jid, u]) => [jid, u.rpg])
        if (!entries.length) return m.reply(`Belum ada yang bermain. Jadilah yang pertama, ketik ${prefix}start.`)
        entries.sort((a, b) => (b[1].level - a[1].level) || (b[1].exp - a[1].exp))
        const top = entries.slice(0, 10)
        let out = `*PAPAN PERINGKAT PEMAIN*\nSiapa yang paling kuat minggu ini? Terus naik level untuk merebut posisi teratas.\n\n`
        out += top.map(([jid, r], i) => {
            const name = displayName(jid, r)
            const rankLabel = MEDALS[i] || `${i + 1}.`
            const prestigeTag = r.prestige ? ` (Prestige ${r.prestige}x)` : ''
            return `${rankLabel} ${name} - Level ${r.level}${prestigeTag}\n     ${getRank(r.level).name} | ${CLASSES[r.class]?.name || r.class} | ${fmtMoney(r.money)} money`
        }).join('\n\n')
        const sortedAll = [...entries].sort((a, b) => (b[1].level - a[1].level) || (b[1].exp - a[1].exp))
        const myRank = sortedAll.findIndex(([jid]) => jid === m.sender)
        if (myRank >= 10) {
            const [, myRpg] = sortedAll[myRank]
            out += `\n\n---\nPosisi Anda: peringkat #${myRank + 1} - Level ${myRpg.level}, ${fmtMoney(myRpg.money)} money`
        } else if (myRank === -1) {
            out += `\n\n---\nKamu belum masuk peringkat. Ketik ${prefix}start untuk membuat karakter dan mulai bersaing.`
        }
        out += `\n\nAda juga peringkat arena khusus, ketik ${prefix}arena top.`
        return m.reply(out)
    }
}
