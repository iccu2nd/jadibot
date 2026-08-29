export default {
    cmd: ['verify'],
    category: 'main',
    description: 'Verifikasi nama WhatsApp sebagai member bot',

    run: async (m) => {
        const user = global.db.data.users[m.sender]
        if (user.registered) return m.reply('Anda sudah terverifikasi.')

        const nama = m.pushName || 'User'
        user.regName = nama
        user.registered = true
        user.regStep = ''

        return m.reply(`Verifikasi berhasil!\n\n› Nama WhatsApp Anda *${nama}* sudah diverifikasi dan terdaftar sebagai member bot.`)
    }
}
