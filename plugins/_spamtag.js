import { delay } from '@whiskeysockets/baileys'

const MAX_COUNT = 500

let handler = async (m, { conn, text }) => {
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return m.reply('Tag atau reply orangnya dulu.\nContoh: .spamtag @user 30')

    const args = text.trim().split(/\s+/).filter(Boolean)
    let count = parseInt(args.find(a => /^\d+$/.test(a)), 10)
    if (!count || count < 1) count = 10
    if (count > MAX_COUNT) count = MAX_COUNT

    for (let i = 0; i < count; i++) {
        await conn.sendMessage(m.from, { text: `@${target.split('@')[0]}`, mentions: [target] })
        await delay(1000)
    }
}

handler.command = ['spamtag']
handler.tags = ['group']
handler.group = true
handler.admin = true
handler.botAdmin = true
handler.premium = true

export default handler