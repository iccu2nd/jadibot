import chalk from 'chalk'
import config from '../config.js'

function printLog({ isGroup, groupName, chatId, senderName, senderId, senderLid, type, text, pluginName, isOutgoing }) {
    if (config.consoleLog === false) return

    const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })
    const chatType = chalk.cyanBright.bold(isGroup ? 'GC' : 'PC')

    let log = `[ ${chatType} ][ ${chalk.whiteBright(time + ' WIB')} ]\n`
    if (isGroup) log += `${chalk.cyanBright('•')} ${chalk.whiteBright.bold(groupName || 'Loading...')}\n${chalk.cyanBright('•')} ${chalk.whiteBright(chatId)}\n`
    if (senderId) log += `${chalk.cyanBright('•')} ${chalk.whiteBright(senderId)} ${chalk.whiteBright('~')} ${chalk.whiteBright(senderLid || 'no-lid')}\n`
    log += `${chalk.cyanBright('•')} ${chalk.whiteBright.bold(senderName)}${isOutgoing ? chalk.whiteBright(' (bot)') : ''}\n`
    if (type) log += `${chalk.cyanBright('•')} ${chalk.whiteBright(type)}\n`
    if (pluginName) log += `${chalk.cyanBright('•')} ${chalk.whiteBright('plugin:')} ${chalk.whiteBright(pluginName)}\n`
    log += `${chalk.cyanBright('•')} ${chalk.whiteBright(isOutgoing ? 'reply:' : 'message:')} ${chalk.whiteBright(text || 'Media Content')}\n`

    console.log(log)
}

export function printChatLog(m) {
    setImmediate(() => printLog({
        isGroup: m.isGroup,
        groupName: m.groupName,
        chatId: m.from,
        senderName: m.pushName || 'User',
        senderId: m.sender,
        senderLid: m.senderLid,
        type: m.type,
        text: m.body,
        pluginName: m.pluginName,
        isOutgoing: false
    }))
}

function extractOutgoingText(content) {
    if (!content) return 'Media Content'
    if (typeof content.text === 'string') return content.text.length > 200 ? content.text.slice(0, 200) + '...' : content.text
    if (typeof content.caption === 'string' && content.caption) return content.caption.length > 200 ? content.caption.slice(0, 200) + '...' : content.caption
    if (content.poll) return `Poll: ${content.poll.name || content.poll.question || 'Polling'}`
    if (content.sticker) return 'Sticker'
    if (content.image) return 'Image'
    if (content.video) return content.gifPlayback ? 'GIF' : 'Video'
    if (content.audio) return content.ptt ? 'Voice Note' : 'Audio'
    if (content.document) return content.fileName || 'Document'
    if (content.contacts) return 'Contact'
    if (content.location) return 'Location'
    return 'Media Content'
}

export function printOutgoingLog(jid, content, opts = {}) {
    try {
        const { botName = 'Bot', groupName, pluginName } = opts
        printLog({
            isGroup: typeof jid === 'string' && jid.endsWith('@g.us'),
            groupName,
            chatId: jid,
            senderName: botName,
            senderId: null,
            senderLid: null,
            type: null,
            text: extractOutgoingText(content),
            pluginName,
            isOutgoing: true
        })
    } catch (_) {}
}

export default { printChatLog, printOutgoingLog }
