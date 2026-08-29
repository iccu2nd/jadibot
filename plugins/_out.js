import { settings } from '../lib/database.js'

export default {
    cmd: ['out'],
    category: 'owner',
    run: async (m, { sock, isOwner, text, prefix }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        if (m.isGroup) {
            try {
                await m.reply('👋 Keluar dari grup ini...')
                delete settings.scheduledLeaves[m.from]
                await sock.groupLeave(m.from)
            } catch (e) {
                console.error(e)
                m.reply('Gagal keluar dari grup.')
            }
            return
        }

        const groups = Object.values(await sock.groupFetchAllParticipating())
        if (!groups.length) return m.reply('Bot tidak ada di grup manapun.')

        const arg = text.trim()
        if (!arg) {
            const rows = groups.map(g => ({ title: g.subject, description: `${g.participants.length} member`, id: `${prefix}out ${g.id}` }))
            return sock.sendInteractiveButton(m.from, {
                body: `*DAFTAR GRUP BOT (${groups.length})*\n\nPilih grup buat keluar dari jarak jauh.`,
                footer: 'remote group leave',
                buttons: [{
                    type: 'list',
                    label: 'Pilih Grup',
                    sections: [{ title: 'Grup Terdaftar', rows }]
                }]
            }, { quoted: m })
        }

        const target = /^\d+$/.test(arg) ? groups[Number(arg) - 1] : groups.find(g => g.id === arg)
        if (!target) return m.reply('Grup tidak ditemukan. Cek lagi nomor/ID-nya lewat `.out` tanpa argumen.')

        try {
            await m.reply(`👋 Keluar dari grup *${target.subject}*...`)
            delete settings.scheduledLeaves[target.id]
            await sock.groupLeave(target.id)
        } catch (e) {
            console.error(e)
            m.reply('Gagal keluar dari grup.')
        }
    }
}