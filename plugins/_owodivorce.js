import { getOwo, divorce } from '../lib/owo.js'

export default {
    cmd: ['owodivorce', 'cerai'],
    category: 'social',
    run: async (m) => {
        const owo = getOwo(m.sender)
        if (!owo.spouse) return m.reply('⚠️ Anda belum menikah.')

        const spouse = divorce(m.sender)
        return m.reply(`💔 @${m.sender.split('@')[0]} dan @${spouse.split('@')[0]} resmi bercerai.`, { mentions: [m.sender, spouse] })
    }
}
