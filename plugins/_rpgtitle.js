import { TITLES, getRpg, hasStarted, checkNewTitles } from '../lib/rpg.js'

export default {
    cmd: ['title', 'gelar'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        checkNewTitles(rpg)
        const args = text.trim().toLowerCase().split(/ +/).filter(Boolean)
        const sub = args[0] || ''

        if (sub === 'pakai' || sub === 'set') {
            const query = args.slice(1).join(' ')
            const found = TITLES.find(t => t.id === query.replace(/ /g, '_') || t.name.toLowerCase() === query)
            if (!found) return m.reply(`Gelar tidak ditemukan. Ketik ${prefix + cmd} untuk melihat gelar yang sudah Anda buka.`)
            if (!rpg.unlockedTitles.includes(found.id)) return m.reply(`Anda belum membuka gelar tersebut.`)
            rpg.activeTitle = found.id
            return m.reply(`Gelar aktif sekarang: ${found.name}. Gelar ini akan tampil di ${prefix}profile dan ${prefix}leaderboard.`)
        }
        if (sub === 'lepas' || sub === 'clear') {
            rpg.activeTitle = null
            return m.reply(`Gelar aktif sudah dilepas.`)
        }

        let out = `*DAFTAR GELAR*\n\n`
        out += TITLES.map(t => {
            const owned = rpg.unlockedTitles.includes(t.id)
            const active = rpg.activeTitle === t.id ? ' (aktif)' : ''
            return `• ${owned ? t.name : '???'}${owned ? active : ''}\n  ${t.desc}${owned ? '' : ' (belum terbuka)'}`
        }).join('\n')
        out += `\n\nPasang gelar dengan ${prefix + cmd} set <nama gelar>, atau ${prefix + cmd} clear untuk menonaktifkan.`
        return m.reply(out)
    }
}
