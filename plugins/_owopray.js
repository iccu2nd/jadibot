import { getOwo, fmtCowoncy, cooldownLeft, fmtMs, PRAY_COOLDOWN, PRAY_MIN, PRAY_MAX } from '../lib/owo.js'

const randAmount = () => Math.floor(PRAY_MIN + Math.random() * (PRAY_MAX - PRAY_MIN + 1))

export default {
    cmd: ['owopray', 'owocurse'],
    category: 'owo',
    run: async (m, { cmd, prefix }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`❓ Tag atau reply orang yang ingin di-${cmd === 'owopray' ? 'doain' : 'kutuk'}.\nContoh: ${prefix}${cmd} @orang`)
        if (target === m.sender) return m.reply(`⚠️ Tidak bisa ${cmd === 'owopray' ? 'doain' : 'mengutuk'} diri sendiri.`)

        const owo = getOwo(m.sender)
        const cdKey = cmd === 'owopray' ? 'lastPray' : 'lastCurse'
        const left = cooldownLeft(owo[cdKey], PRAY_COOLDOWN)
        if (left > 0) return m.reply(`⏳ Tunggu ${fmtMs(left)} lagi untuk ${cmd === 'owopray' ? 'doain' : 'mengutuk'} orang lain.`)

        owo[cdKey] = Date.now()
        const amount = randAmount()
        const targetOwo = getOwo(target)

        if (cmd === 'owopray') {
            targetOwo.cowoncy += amount
            targetOwo.totalEarned += amount
            owo.prayers += 1
            return m.reply(`🙏 @${m.sender.split('@')[0]} mendoakan @${target.split('@')[0]}!\n@${target.split('@')[0]} dapat berkah ${fmtCowoncy(amount)}.`, { mentions: [m.sender, target] })
        }

        const stolen = Math.min(amount, targetOwo.cowoncy)
        targetOwo.cowoncy -= stolen
        owo.cowoncy += stolen
        owo.curses += 1

        if (stolen <= 0) {
            return m.reply(`🖤 @${m.sender.split('@')[0]} mengutuk @${target.split('@')[0]}, tapi dompetnya kosong, tidak ada yang bisa diambil.`, { mentions: [m.sender, target] })
        }

        return m.reply(`🖤 @${m.sender.split('@')[0]} mengutuk @${target.split('@')[0]}!\n${fmtCowoncy(stolen)} kesedot ke @${m.sender.split('@')[0]}.`, { mentions: [m.sender, target] })
    }
}
