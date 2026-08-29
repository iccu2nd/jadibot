import { ACHIEVEMENTS, getRpg, hasStarted, fmtMoney, claimableAchievements, claimAllAchievements } from '../lib/rpg.js'

function rewardText(reward) {
    const parts = []
    if (reward.money) parts.push(`${fmtMoney(reward.money)} money`)
    if (reward.mats) parts.push(Object.entries(reward.mats).map(([id, qty]) => `${id.replace(/_/g, ' ')} x${qty}`).join(', '))
    return parts.join(', ')
}

export default {
    cmd: ['achievement', 'achv', 'prestasi', 'pencapaian'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const sub = text.trim().toLowerCase()

        if (sub === 'klaim' || sub === 'claim' || sub === 'ambil') {
            const claimed = claimAllAchievements(rpg)
            if (!claimed.length) return m.reply(`Tidak ada pencapaian baru yang siap diklaim. Ketik ${prefix + cmd} untuk melihat progres.`)
            let out = `*PENCAPAIAN DIKLAIM*\n\n`
            out += claimed.map(a => `• ${a.name} - ${rewardText(a.reward)}`).join('\n')
            out += `\n\nMoney sekarang: ${fmtMoney(rpg.money)} money.`
            return m.reply(out)
        }

        rpg.claimedAchievements ??= []
        const claimable = claimableAchievements(rpg)
        let out = `*PENCAPAIAN*\n\n`
        if (claimable.length) out += `*SIAP DIKLAIM (${claimable.length})*\nKetik ${prefix + cmd} claim untuk mengambil semua sekaligus.\n\n`
        for (const a of ACHIEVEMENTS) {
            const done = rpg.claimedAchievements.includes(a.id)
            const status = done ? 'selesai' : a.check(rpg) ? 'siap diklaim' : 'terkunci'
            out += `*${a.name}* (${status})\n   ${a.desc}\n   Hadiah: ${rewardText(a.reward)}\n\n`
        }
        return m.reply(out.trim())
    }
}
