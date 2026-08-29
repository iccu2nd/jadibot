export default {
    cmd: ['delmsg'],
    category: 'owner',
    description: 'Hapus pesan tersimpan berdasarkan nama',

    run: async (m, { text }) => {
        if (!m.isOwner) return m.reply('Perintah ini hanya untuk owner bot.')

        const nama = text?.trim()
        if (!nama) return m.reply('Penggunaan: .delmsg <nama>\n\nContoh:\n.delmsg halo')

        const msgs = global.db.data.msgs
        if (!msgs?.[nama]) return m.reply(`Nama *${nama}* tidak terdaftar.`)

        delete msgs[nama]
        return m.reply(`Berhasil menghapus pesan dengan nama *${nama}*`)
    }
}
