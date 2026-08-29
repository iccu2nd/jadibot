import { imgbb, tmpfiles, uguu, pone } from '../lib/uploader.js'

export default {
    cmd: ['tourl'],
    category: 'tools',
    run: async (m, { sock }) => {
        let buffer
        try {
            buffer = await m.download()
        } catch {
            return m.reply('Reply atau kirim media yang ingin diupload.')
        }

        await m.react('⏳')

        try {
            const [resImgbb, resTmpfiles, resUguu, resPone] = await Promise.allSettled([
                imgbb(buffer),
                tmpfiles(buffer, buffer.fileName),
                uguu(buffer, buffer.fileName),
                pone(buffer, buffer.fileName)
            ])

            const results = {
                imgbb: resImgbb.status === 'fulfilled' ? resImgbb.value : null,
                tmpfiles: resTmpfiles.status === 'fulfilled' ? resTmpfiles.value : null,
                uguu: resUguu.status === 'fulfilled' ? resUguu.value : null,
                pone: resPone.status === 'fulfilled' ? resPone.value : null
            }

            const buttons = Object.entries(results)
                .filter(([, url]) => url)
                .map(([name, url]) => ({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({ display_text: name, copy_code: url })
                }))

            if (!buttons.length) {
                await m.react('❌')
                return m.reply('Semua endpoint gagal upload.')
            }

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
                            body: { text: `Upload berhasil ke *${buttons.length}* layanan.\n\nTekan nama layanan untuk copy link.` },
                            footer: { text: 'tap to copy url' },
                            nativeFlowMessage: {
                                buttons,
                                messageParamsJson: JSON.stringify({
                                    bottom_sheet: {
                                        in_thread_buttons_limit: 1,
                                        list_title: 'hasil upload',
                                        button_title: 'lihat semua link'
                                    }
                                })
                            }
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

            await m.react('✅')
        } catch (e) {
            console.error(e)
            await m.react('❌')
            m.reply(`Error: ${e.message}`)
            throw e
        }
    }
}
