export default {
    cmd: ['streaknotif'],
    category: 'main',
    run: async (m, { text }) => {
        const user = global.db.data.users[m.sender]
        if (!user) return m.reply('Data Anda belum tercatat, coba kirim pesan lagi.')

        const arg = text?.trim().toLowerCase()

        if (arg === 'off') {
            user.streakNotif = false
            return m.reply('🔕 Notifikasi streak dinonaktifkan.\n\nStreak Anda tetap berjalan dan bertambah seperti biasa, hanya saja bot tidak akan mengirim pemberitahuan lagi. Ketik .streaknotif on untuk mengaktifkannya kembali.')
        }

        if (arg === 'on') {
            user.streakNotif = true
            return m.reply('🔔 Notifikasi streak diaktifkan kembali.')
        }

        const status = user.streakNotif === false ? 'Nonaktif 🔕' : 'Aktif 🔔'
        return m.reply(`Notifikasi Streak: ${status}\n\nKetik .streaknotif on atau .streaknotif off untuk mengubah pengaturan ini.`)
    }
}
