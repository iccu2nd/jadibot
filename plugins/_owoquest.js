import { getOwo, fmtCowoncy, getQuests, claimQuest, questTemplate } from '../lib/owo.js'

export default {
    cmd: ['owoquest', 'owomisi'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const arg = text.trim().toLowerCase()

        if (arg.startsWith('claim')) {
            const questId = arg.split(/ +/)[1]
            if (!questId) return m.reply(`❓ Contoh: ${prefix + cmd} claim win3`)

            const result = claimQuest(m.sender, questId)
            if (!result.ok) {
                const msg = {
                    notfound: '⚠️ Misi tidak ditemukan di daftar hari ini.',
                    claimed: '⚠️ Misi ini sudah diklaim.',
                    incomplete: '⚠️ Progress misi ini belum selesai.'
                }[result.reason]
                return m.reply(msg)
            }

            let out = `✅ Reward misi *"${result.template.desc}"* diklaim!\n`
            if (result.template.reward.cowoncy) out += `+${fmtCowoncy(result.template.reward.cowoncy)}\n`
            if (result.template.reward.essence) out += `+${result.template.reward.essence} essence\n`
            return m.reply(out)
        }

        const quests = getQuests(m.sender)
        let out = `📋 *MISI HARIAN*\n\n`
        for (const entry of quests.list) {
            const template = questTemplate(entry.id)
            const done = entry.progress >= template.target
            const status = entry.claimed ? '✅ Diklaim' : done ? '🎁 Siap diklaim!' : `${entry.progress}/${template.target}`
            out += `• ${template.desc}\n  ${status}${!entry.claimed && done ? ` — ${prefix + cmd} claim ${entry.id}` : ''}\n\n`
        }
        out += `Misi reset otomatis tiap hari.`

        return m.reply(out)
    }
}
