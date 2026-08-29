import { ACTIONS, fetchActionGifBuffer } from '../lib/owo.js'

export default {
    cmd: Object.keys(ACTIONS),
    category: 'social',
    run: async (m, { sock, cmd, prefix, config }) => {
        const action = ACTIONS[cmd]
        const target = m.mentionedJid?.[0] || m.quoted?.sender

        if (!target) {
            return m.reply(`❓ Tag atau reply orang yang ingin di-${cmd}.\nContoh: ${prefix + cmd} @orang`)
        }

        const isSelf = target === m.sender
        const mentions = isSelf ? [m.sender] : [m.sender, target]
        const caption = isSelf
            ? `${action.emoji} @${m.sender.split('@')[0]} ${action.selfVerb}...`
            : `${action.emoji} @${m.sender.split('@')[0]} ${action.verb} @${target.split('@')[0]}!`

        let gifBuffer
        try {
            gifBuffer = await fetchActionGifBuffer(action.endpoint)
        } catch (e) {
            console.error(e)
            return m.reply(caption, { mentions })
        }

        try {
            await sock.sendSticker(m.from, gifBuffer, m, {
                packname: config.packname,
                author: config.author
            })
            await m.reply(caption, { mentions })
        } catch (e) {
            console.error(e)
            await m.reply(caption, { mentions })
        }
    }
}
