import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { settings } from '../lib/database.js'
import { reportPluginError } from '../handler.js'

export default {
    cmd: ['demote'],
    category: 'group',
    run: async (m, { sock, text, isAdmin, isBotAdmin, config, prefix, cmd }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya dapat digunakan di dalam grup.')
        if (!isAdmin) return m.reply('Hanya admin grup yang dapat menggunakan perintah ini.')
        if (!isBotAdmin) return m.reply('Bot harus menjadi admin untuk menurunkan jabatan admin.')

        const targets = m.mentionedJid?.length ? m.mentionedJid
            : m.quoted ? [m.quoted.sender]
            : text?.replace(/[^0-9]/g, '').length >= 10 ? [text.replace(/[^0-9]/g, '') + '@s.whatsapp.net']
            : []

        if (targets.length === 0) {
            let help = `⌗ *Demote System*\n\n`
            help += `Gunakan perintah ini untuk menurunkan jabatan admin menjadi member.\n\n`
            help += `› .demote @user\n`
            help += `› .demote 62831xxx\n`
            help += `› .demote (reply pesan target)\n\n`
            help += `> *${config.botName}*`
            return m.reply(help)
        }

        const ownerNumbers = config.ownerNumber.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net').concat(settings.extraOwners)
        const botJid = jidNormalizedUser(sock.user.id)

        for (let target of targets) {
            let jid = jidNormalizedUser(target)

            if (jid === botJid) {
                m.reply('Mana bisa aku turunkan jabatanku sendiri!')
                continue
            }
            if (ownerNumbers.includes(jid)) {
                m.reply('Jabatan Owner tidak bisa diturunkan!')
                continue
            }

                    try {
                        await sock.groupParticipantsUpdate(m.from, [jid], 'demote')
                        await m.reply(`✅ Berhasil menurunkan jabatan @${jid.split('@')[0]} menjadi Member.`, { mentions: [jid] })
                    } catch (e) {
                        console.error(e)
                        m.reply(`Gagal menurunkan jabatan @${jid.split('@')[0]}.`)
                        reportPluginError({ sock, config, m, cmd, prefix, text, e })
                    }
        }
    }
}
