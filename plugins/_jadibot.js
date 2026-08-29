import * as sessionManager from '../lib/session-manager.js'

export default {
    cmd: ['jadibot', 'jb'],
    category: 'main',
    description: 'Jadikan nomor Anda sendiri sebagai bot pribadi (juga bisa lewat website dashboard)',

    run: async (m, { sock, text, isOwner }) => {
        if (sock.isJadibotSession) return m.reply('Fitur jadibot cuma bisa dipakai di bot utama, bukan dari sesi jadibot lain.')

        const args = text.trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (sub === 'list') {
            const entries = sessionManager.listSessions()
            if (!entries.length) return m.reply('Belum ada sesi jadibot yang aktif.')

            if (isOwner) {
                const list = entries.map((s, i) =>
                    `${i + 1}. ${s.number} - ${s.status}${s.connectedAt ? ' (sejak ' + new Date(s.connectedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ')' : ''}`
                ).join('\n')
                return m.reply(`*Daftar Jadibot Aktif (${entries.length})*\n\n${list}`)
            }

            return m.reply(`Total sesi jadibot aktif: ${entries.length}`)
        }

        if (sub === 'stop') {
            const target = args[1] ? sessionManager.formatNumber(args[1]) : null

            if (!isOwner) {
                if (target) return m.reply('Hanya owner yang bisa menghentikan sesi nomor lain.')
                return m.reply('Ketik .jadibot stop <nomor> (owner) atau kelola sesi Anda lewat website dashboard.')
            }

            if (!target) return m.reply('Masukan nomor yang mau dihentikan.\nContoh: .jadibot stop 08123456789')
            if (!sessionManager.getSession(target)) return m.reply('Nomor tersebut tidak punya sesi jadibot aktif.')
            await sessionManager.stopSession(target)
            return m.reply(`Sesi jadibot ${target} berhasil dihentikan.`)
        }

        if (sub === 'ads') {
            if (!isOwner) return m.reply('Hanya owner yang bisa memicu ads.')
            const target = args[1] ? sessionManager.formatNumber(args[1]) : null

            if (target) {
                if (!sessionManager.getSession(target)) return m.reply('Nomor tersebut tidak punya sesi jadibot aktif.')
                const sent = await sessionManager.sendAdsOnce(target)
                return m.reply(sent > 0
                    ? `Ads berhasil dikirim ke ${sent} grup untuk sesi ${target}.`
                    : `Gagal kirim ads: sesi ${target} belum terhubung / belum join grup manapun.`)
            }

            const numbers = sessionManager.listSessions().map(s => s.number)
            if (!numbers.length) return m.reply('Belum ada sesi jadibot yang aktif.')
            let success = 0, totalGroups = 0
            for (const num of numbers) {
                const sent = await sessionManager.sendAdsOnce(num)
                if (sent > 0) success++
                totalGroups += sent
            }
            return m.reply(`Ads dikirim ke ${success}/${numbers.length} sesi jadibot aktif (total ${totalGroups} grup).`)
        }

        const number = sessionManager.formatNumber(args[0])
        if (!number) {
            return m.reply('Format nomor salah.\n\nContoh:\n.jadibot 08123456789\n.jadibot +628123456789\n\nSubmenu lain: .jadibot list, .jadibot stop, .jadibot ads\n\nAtau pakai website dashboard untuk pairing + atur owner/autoread/autotyping tanpa command.')
        }

        if (sessionManager.getSession(number)) {
            return m.reply(`Nomor ${number} sudah terhubung sebagai jadibot.`)
        }

        await m.reply(`Memproses jadibot untuk ${number}...\nKode pairing akan dikirim ke chat ini dalam beberapa detik.\nJika tidak ditautkan dalam 3 menit, sesi otomatis dihapus.`)

        sessionManager.startChildSession(number, m.sender, sock).catch(async (e) => {
            m.reply(`Gagal membuat sesi jadibot: ${e.message}`).catch(() => {})
        })
    },

    onConnect: async (sock) => {
        sessionManager.restoreAllSessions(sock)
    }
}
