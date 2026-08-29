import { getOwo, fmtCowoncy, isMarried, marry, pendingProposals, RING_PRICE, PROPOSAL_WINDOW } from '../lib/owo.js'

export default {
    cmd: ['owomarry', 'nikah'],
    category: 'social',
    run: async (m, { text, prefix, cmd }) => {
        const arg = text.trim().toLowerCase()

        if (arg === 'accept' || arg === 'terima') {
            const pending = pendingProposals.get(m.sender)
            if (!pending || pending.expiresAt <= Date.now()) {
                pendingProposals.delete(m.sender)
                return m.reply('⚠️ Tidak ada lamaran yang menunggu jawaban Anda.')
            }
            if (isMarried(m.sender) || isMarried(pending.from)) {
                pendingProposals.delete(m.sender)
                return m.reply('⚠️ Salah satu dari kalian sudah nikah lebih dahulu, lamaran dibatalkan.')
            }

            const proposerOwo = getOwo(pending.from)
            if (proposerOwo.cowoncy < RING_PRICE) {
                pendingProposals.delete(m.sender)
                return m.reply(`⚠️ Cowoncy si pelamar tidak cukup untuk beli cincin, lamaran batal.`)
            }

            proposerOwo.cowoncy -= RING_PRICE
            marry(pending.from, m.sender)
            pendingProposals.delete(m.sender)

            return m.reply(`💍 *SELAMAT MENIKAH!*\n\n@${pending.from.split('@')[0]} & @${m.sender.split('@')[0]} sekarang resmi jadi pasangan di OwO!`, { mentions: [pending.from, m.sender] })
        }

        if (arg === 'reject' || arg === 'tolak') {
            const pending = pendingProposals.get(m.sender)
            if (!pending) return m.reply('⚠️ Tidak ada lamaran yang perlu ditolak.')
            pendingProposals.delete(m.sender)
            return m.reply(`💔 Lamaran dari @${pending.from.split('@')[0]} ditolak.`, { mentions: [pending.from] })
        }

        const target = m.mentionedJid?.[0] || m.quoted?.sender

        if (!target) {
            const owo = getOwo(m.sender)
            if (owo.spouse) {
                const days = Math.floor((Date.now() - owo.marriedAt) / (24 * 60 * 60 * 1000))
                return m.reply(`💑 Anda sudah menikah sama @${owo.spouse.split('@')[0]}.\nUsia pernikahan: ${days} hari.\n\nMau pisah? Ketik ${prefix}owodivorce`, { mentions: [owo.spouse] })
            }
            return m.reply(`💍 *NIKAH OWO*\n\nLamar seseorang: ${prefix + cmd} @orang\nTerima lamaran: ${prefix + cmd} accept\nTolak lamaran: ${prefix + cmd} reject\n\nHarga cincin: ${fmtCowoncy(RING_PRICE)}`)
        }

        if (target === m.sender) return m.reply('⚠️ Tidak bisa menikahkan diri sendiri.')
        if (isMarried(m.sender)) return m.reply('⚠️ Anda sudah menikah. Cerai dulu kalau ingin lamar orang lain.')
        if (isMarried(target)) return m.reply('⚠️ Orang itu sudah menikah sama orang lain.')

        const owo = getOwo(m.sender)
        if (owo.cowoncy < RING_PRICE) return m.reply(`💸 Anda butuh ${fmtCowoncy(RING_PRICE)} untuk beli cincin. Saldo Anda ${fmtCowoncy(owo.cowoncy)}.`)

        const existing = pendingProposals.get(target)
        if (existing && existing.expiresAt > Date.now()) return m.reply('⚠️ Orang itu lagi ada lamaran lain yang belum dijawab.')

        pendingProposals.set(target, { from: m.sender, expiresAt: Date.now() + PROPOSAL_WINDOW })

        return m.reply(`💍 @${m.sender.split('@')[0]} melamar @${target.split('@')[0]}!\n\nBalas dengan ${prefix + cmd} accept atau ${prefix + cmd} reject dalam 2 menit.`, { mentions: [m.sender, target] })
    }
}
