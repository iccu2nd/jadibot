import { getContentType, jidNormalizedUser, downloadContentFromMessage } from '@whiskeysockets/baileys'
import { saveContact, saveMetadata, syncGroupParticipants, getLidMapping, settings } from './database.js'
import { getCachedGroupMetadata, getCachedParticipantIndex } from './simple.js'
import config from '../config.js'
import util from 'util'

const ownerNumbers = config.ownerNumber.map(n => n.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

export async function serialize(sock, m) {
    if (!m) return m

    if (m.key) {
        m.id = m.key.id
        m.from = m.key.remoteJid
        m.chat = m.from
        m.jid = m.from
        m.isGroup = m.from.endsWith('@g.us')
        m.isNewsletter = m.from.endsWith('@newsletter')

        let jid, lid
        if (m.isGroup) {
            lid = m.key.participant
            jid = m.key.participantAlt
        } else {
            lid = m.key.remoteJid
            jid = m.key.remoteJidAlt
        }

        if (lid && !jid && lid.endsWith('@s.whatsapp.net')) jid = lid
        if (lid && lid.endsWith('@lid') && !jid) {
            const mapped = getLidMapping(lid)
            if (mapped) jid = mapped
        }

        m.sender = jid ? jidNormalizedUser(jid) : jidNormalizedUser(lid)
        m.senderLid = lid && lid.endsWith('@lid') ? lid : null
    }

    if (m.message) {
        m.type = getContentType(m.message)
        if (m.type === 'ephemeralMessage' || m.type === 'viewOnceMessageV2' || m.type === 'viewOnceMessageV2Extension' || m.type === 'viewOnceMessage') {
            m.message = m.message[m.type].message
            m.type = getContentType(m.message)
        }

        let body = ''
        if (m.type === 'conversation') {
            body = m.message.conversation
        } else if (m.type === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text
        } else if (m.type === 'imageMessage') {
            body = m.message.imageMessage.caption
        } else if (m.type === 'videoMessage') {
            body = m.message.videoMessage.caption
        } else if (m.type === 'buttonsResponseMessage') {
            body = m.message.buttonsResponseMessage.selectedButtonId
        } else if (m.type === 'listResponseMessage') {
            body = m.message.listResponseMessage.singleSelectReply?.selectedRowId
        } else if (m.type === 'templateButtonReplyMessage') {
            body = m.message.templateButtonReplyMessage.selectedId
        } else if (m.type === 'interactiveResponseMessage') {
            try {
                const params = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}')
                body = params.id || ''
            } catch {
                body = ''
            }
        }
        m.body = body || ''

        m.arg = m.body.trim().split(/ +/) || []
        m.text = m.arg.slice(1).join(' ')
        m.expiration = m.message[m.type]?.contextInfo?.expiration || 0

        m.quoted = m.message[m.type]?.contextInfo?.quotedMessage || null
        if (m.quoted) {
            m.quoted.type = getContentType(m.quoted)
            if (m.quoted.type === 'viewOnceMessageV2' || m.quoted.type === 'viewOnceMessageV2Extension' || m.quoted.type === 'viewOnceMessage') {
                m.quoted = m.quoted[m.quoted.type].message
                m.quoted.type = getContentType(m.quoted)
            }
            m.quoted.id = m.message[m.type].contextInfo.stanzaId

            let qRaw = m.message[m.type].contextInfo.participant
            let qAlt = m.message[m.type].contextInfo.participantAlt
            let qJid = qAlt || (qRaw?.endsWith('@s.whatsapp.net') ? qRaw : null)
            let qLid = qRaw?.endsWith('@lid') ? qRaw : null

            if (qLid && !qJid) {
                const qMapped = getLidMapping(qLid)
                if (qMapped) qJid = qMapped
            }

            m.quoted.sender = qJid ? jidNormalizedUser(qJid) : jidNormalizedUser(qRaw)
            m.quoted.lid = qLid
        }

        const rawMentions = m.message[m.type]?.contextInfo?.mentionedJid || []
        m.mentionedJid = rawMentions.map(raw =>
            raw.endsWith('@lid') ? (getLidMapping(raw) || raw) : jidNormalizedUser(raw)
        )
    }

    m.isAdmin = false
    m.isBotAdmin = false

    if (m.isGroup) {
        const metadata = await getCachedGroupMetadata(sock, m.from)
        if (metadata) {
            m.groupName = metadata.subject
            const botJid = jidNormalizedUser(sock.user.id)
            const participantIndex = getCachedParticipantIndex(m.from)

            m.isAdmin = participantIndex.get(m.sender)?.admin !== null
            m.isBotAdmin = participantIndex.get(botJid)?.admin !== null

            setImmediate(() => {
                saveMetadata(m.from, metadata.subject, metadata.desc?.toString(), metadata.participants)
                syncGroupParticipants(m.from, metadata.participants)
            })
        }
    }

    setImmediate(() => {
        if (m.sender && m.sender.endsWith('@s.whatsapp.net') && !m.key.fromMe) {
            saveContact(m.sender, m.senderLid, m.pushName)
        }
    })

    if (sock.isJadibotSession) {
        // Sesi jadibot punya owner sendiri-sendiri (bukan owner bot utama):
        // nomor bot itu sendiri selalu jadi owner, plus nomor tambahan yang
        // diatur lewat website dashboard / .jadibot settings.
        const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null
        const extraOwnerNumber = sock.jadibotSettings?.ownerNumber
        const extraOwnerJid = extraOwnerNumber ? extraOwnerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null
        m.isOwner = m.sender === selfJid || (!!extraOwnerJid && m.sender === extraOwnerJid)
    } else {
        m.isOwner = ownerNumbers.includes(m.sender) || settings.extraOwners.includes(m.sender)
    }

    m.reply = (text, options = {}) => {
        let content = typeof text === 'object' ? util.inspect(text) : (text || "Selesai.")
        let mentions = [...String(content).matchAll(/@(\d+)/g)].map(v => v[1] + '@s.whatsapp.net')
        return sock.sendMessage(m.from, {
            text: String(content),
            mentions: options.mentions || mentions,
            contextInfo: { expiration: m.expiration }
        }, { quoted: m, pluginName: m.pluginName, ...options })
    }

    m.react = (emoji) => {
        return sock.sendMessage(m.from, { react: { text: emoji, key: m.key } })
    }

    m.download = async (retries = 3) => {
        const type = m.quoted ? m.quoted.type : m.type
        const mediaMsg = m.quoted ? m.quoted[type] : m.message?.[type]
        if (!mediaMsg) throw new Error('Tidak ada media pada pesan ini.')

        const dlType = type.replace('Message', '')

        let lastErr
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const stream = await downloadContentFromMessage(mediaMsg, dlType)
                const chunks = []
                for await (const chunk of stream) chunks.push(chunk)
                const buffer = Buffer.concat(chunks)

                if (!buffer.length) throw new Error('Media kosong / gagal diunduh.')

                buffer.mimetype = mediaMsg.mimetype || ''
                buffer.fileName = mediaMsg.fileName || `file.${buffer.mimetype.split('/')[1] || 'bin'}`
                buffer.type = type
                return buffer
            } catch (e) {
                lastErr = e
                const retryable = /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(
                    e?.message || e?.cause?.message || String(e)
                )
                if (!retryable || attempt === retries) break
                await new Promise(r => setTimeout(r, 800 * attempt))
            }
        }

        throw new Error(
            `Gagal mengunduh media setelah ${retries}x percobaan (koneksi ke server WhatsApp timeout). ` +
            `Penyebab: ${lastErr?.message || lastErr}`
        )
    }

    return m
}
