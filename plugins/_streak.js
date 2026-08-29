export default {
    cmd: ['streak', 'cekstreak'],
    category: 'main',
    run: async (m) => {
        const user = global.db.data.users[m.sender]
        if (!user) return m.reply('Data Anda belum tercatat, coba chat lagi.')

        const streak = user.streak || 0
        const status = streak >= 3 ? `${streak} hari 🔥` : `Progress ${streak}/3 hari`

        return m.reply(`🔥 Streak Anda\n\n› Nama: ${m.pushName || 'User'}\n› Status: ${status}\n\nChat bot 3 hari berturut-turut buat buka streak! Kalau kelewat sehari, streak reset dari 0 lagi.`)
    }
}
