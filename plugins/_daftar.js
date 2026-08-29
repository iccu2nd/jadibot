import { getPlugin } from '../lib/plugins.js'

const prefixes = ['.', '/', '#', '!']

function isCmd(body) {
    const prefix = prefixes.find(p => (body || '').startsWith(p))
    if (!prefix) return false
    const cmd = body.slice(prefix.length).trim().split(/ +/)[0]?.toLowerCase()
    return !!getPlugin(cmd)
}

export default {
    cmd: ['daftar'],
    category: 'main',
    description: 'Daftar sebagai member bot',

    run: async (m, { text }) => {
        const user = global.db.data.users[m.sender]
        if (user.registered) return m.reply('Anda sudah terdaftar.')

        const nama = text?.trim()
        if (nama) {
            user.regName = nama
            user.registered = true
            user.regStep = ''

            return m.reply(`Pendaftaran berhasil!\n\n› Nama: ${user.regName}`)
        }

        user.regStep = 'nama'
        user.regName = ''

        m.reply('Siapa namamu?')
    },

    onMessage: async (m) => {
        const user = global.db.data.users[m.sender]
        if (!user || !user.regStep || m.key.fromMe) return false

        if (user.regStep === 'nama') {
            // Kalau yang dikirim ternyata command beneran, jangan dianggap nama.
            // Biarkan lolos ke proses command normal, regStep tetap nyala biar bisa lanjut daftar kapan-kapan.
            if (isCmd(m.body)) return false

            const nama = m.body?.trim()
            if (!nama) return true

            user.regName = nama
            user.registered = true
            user.regStep = ''

            m.reply(`Pendaftaran berhasil!\n\n› Nama: ${user.regName}`)
            return true
        }

        return false
    }
}
