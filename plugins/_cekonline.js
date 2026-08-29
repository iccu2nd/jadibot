import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { getCachedGroupMetadata } from '../lib/simple.js'
import { getLidMapping } from '../lib/database.js'

export default {
    cmd: ['cekonline', 'listonline', 'online'],
    category: 'group',
    description: 'Cek siapa saja yang online di grup',

    run: async (m, { sock }) => {
        if (!m.isGroup) return m.reply('Fitur ini hanya bisa dipakai di grup.')

        const metadata = await getCachedGroupMetadata(sock, m.from)
        const botJid = jidNormalizedUser(sock.user.id)

        const members = []
        for (const p of metadata?.participants || []) {
            let jid = jidNormalizedUser(p.id)
            if (jid.endsWith('@lid')) {
                jid = jidNormalizedUser(p.phoneNumber) || getLidMapping(jid) || null
            }
            if (jid && jid !== botJid && jid.endsWith('@s.whatsapp.net')) members.push(jid)
        }

        if (!members.length) return m.reply('Tidak ada anggota untuk dicek.')

        await m.react('⏳')

        const ONLINE_STATES = ['available', 'composing', 'recording']
        const MAX_WAIT = 8000

        const responded = new Set()
        const online = new Set()
        let doneResolve
        const done = new Promise(r => { doneResolve = r })

        const listener = ({ id, presences }) => {
            const state = presences?.[id]?.lastKnownPresence
            if (!state) return
            responded.add(id)
            if (ONLINE_STATES.includes(state)) online.add(id)
            if (responded.size >= members.length) doneResolve()
        }

        sock.ev.on('presence.update', listener)
        for (const jid of members) sock.presenceSubscribe(jid).catch(() => {})

        await Promise.race([done, new Promise(r => setTimeout(r, MAX_WAIT))])
        sock.ev.off('presence.update', listener)

        await m.react('✅')

        if (!online.size) {
            return m.reply('Tidak ada anggota yang terdeteksi online (tergantung setelan privasi masing-masing).')
        }

        const list = [...online]
        return m.reply(
            `🟢 *Online* (${list.length}/${members.length})\n\n` +
            list.map(jid => `• @${jid.split('@')[0]}`).join('\n'),
            { mentions: list }
        )
    }
}
