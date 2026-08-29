import { fmtCowoncy } from '../lib/owo.js'
import { getContact } from '../lib/database.js'

const MEDAL = ['🥇', '🥈', '🥉']

export default {
    cmd: ['owotop', 'owoleaderboard', 'owolb2'],
    category: 'owo',
    run: async (m) => {
        const users = global.db.data.users || {}
        const allRanked = Object.entries(users)
            .filter(([, u]) => u?.owo)
            .map(([jid, u]) => ({ jid, total: (u.owo.cowoncy || 0) + (u.owo.bank || 0) }))
            .sort((a, b) => b.total - a.total)

        if (!allRanked.length) return m.reply('⚠️ Belum ada yang main OwO sama sekali.')

        let out = `🏆 *TOP 10 OWO TERKAYA*\n\n`
        allRanked.slice(0, 10).forEach((entry, i) => {
            const contact = getContact(entry.jid)
            const name = (contact?.pushname && contact.pushname !== 'null') ? contact.pushname : entry.jid.split('@')[0]
            const rank = MEDAL[i] || `${i + 1}.`
            out += `${rank} ${name} — ${fmtCowoncy(entry.total)}\n`
        })

        const myRank = allRanked.findIndex(e => e.jid === m.sender)
        if (myRank >= 10) out += `\nPeringkat Anda: #${myRank + 1}`

        return m.reply(out)
    }
}
