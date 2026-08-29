export default {
    cmd: ['rpg'],
    category: 'group',
    run: async (m, { text, isAdmin, prefix, cmd }) => {
        if (!m.isGroup) return m.reply('Perintah ini hanya bisa dipakai di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')

        const chat = global.db.data.chats[m.from]
        const action = text.toLowerCase().trim()

        if (action === 'off') {
            if (chat.rpgOff) return m.reply('Fitur RPG di grup ini memang lagi mati.')
            chat.rpgOff = true
            return m.reply('Fitur RPG berhasil dimatikan di grup ini.')
        } else if (action === 'on') {
            if (!chat.rpgOff) return m.reply('Fitur RPG di grup ini memang lagi aktif.')
            chat.rpgOff = false
            return m.reply('Fitur RPG berhasil diaktifkan lagi di grup ini.')
        } else {
            const status = chat.rpgOff ? 'OFF' : 'ON'
            return m.reply(`Status fitur RPG di grup ini: *[ ${status} ]*\n\nGunakan\n\`${prefix + cmd} off\`\n\`${prefix + cmd} on\``)
        }
    }
}
