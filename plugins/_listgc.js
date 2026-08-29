export default {
    cmd: ['listgc', 'listgroup'],
    category: 'owner',
    run: async (m, { sock, isOwner }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        const groups = await sock.groupFetchAllParticipating()
        const list = Object.values(groups)

        if (!list.length) return m.reply('Bot tidak ada di grup manapun.')

        const buttons = list.map(g => ({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: `${g.subject} (${g.participants.length} member)`,
                copy_code: g.id
            })
        }))

        const messageParamsJson = JSON.stringify({
            bottom_sheet: {
                in_thread_buttons_limit: 1,
                list_title: 'daftar grup',
                button_title: 'lihat semua grup'
            }
        })

        await sock.relayMessage(m.from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: {
                        contextInfo: {
                            stanzaId: m.key.id,
                            participant: m.key.participant || m.key.remoteJid,
                            quotedMessage: m.message,
                            remoteJid: m.from
                        },
                        body: {
                            text: `Bot bergabung di *${list.length}* grup.\n\nTekan nama grup untuk copy ID-nya.`
                        },
                        footer: { text: 'tap to copy group id' },
                        nativeFlowMessage: { buttons, messageParamsJson }
                    }
                }
            }
        }, {
            additionalNodes: [{
                tag: 'biz', attrs: {}, content: [{
                    tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{
                        tag: 'native_flow', attrs: { v: '9', name: 'mixed' }
                    }]
                }]
            }]
        })
    }
}
