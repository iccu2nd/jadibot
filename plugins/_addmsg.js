const aliases = ['addmsg', 'addsticker', 'addstiker', 'addvn', 'addvideo', 'addaudio', 'addimg', 'addgif']

export default {
    cmd: aliases,
    category: 'owner',
    description: 'Simpan pesan (teks/stiker/gambar/video/audio) yang dibalas dengan nama tertentu',

    run: async (m, { text, cmd }) => {
        if (!m.isOwner) return m.reply('Perintah ini hanya untuk owner bot.')

        if (!m.quoted) return m.reply(`Balas pesan yang mau disimpan dengan perintah *.${cmd} <nama>*`)

        const nama = text?.trim()
        if (!nama) return m.reply(`Penggunaan: .${cmd} <nama>\n\nContoh:\n.${cmd} halo`)

        const msgs = global.db.data.msgs ??= {}
        if (msgs[nama]) return m.reply(`Nama *${nama}* sudah terdaftar.\n\nHapus dulu pakai .delmsg ${nama} kalau mau ganti.`)

        const { type, id, sender, lid, ...content } = m.quoted

        msgs[nama] = {
            message: content,
            quotedId: id,
            sender,
            addedBy: m.sender,
            addedAt: Date.now()
        }

        return m.reply(`Berhasil menyimpan pesan dengan nama *${nama}*\n\n› Akses dengan mengetik "${nama}" langsung di chat.`)
    }
}
