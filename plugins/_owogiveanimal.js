import { getOwo, hasOwo, findAnimalByQuery, zooCount, removeFromZoo, addToZoo, RARITIES } from '../lib/owo.js'

export default {
    cmd: ['owogiveanimal', 'givehewan'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`❓ Tag atau reply orang yang ingin diberikan hewan, sertakan nama hewannya.\nContoh: ${prefix + cmd} @orang kucing\nContoh dengan jumlah: ${prefix + cmd} @orang kucing 2`)
        if (target === m.sender) return m.reply('⚠️ Tidak bisa berikan hewan ke diri sendiri.')
        if (!hasOwo(target)) return m.reply('⚠️ Orang itu belum pernah main OwO, suruh dia ketik .owodaily dulu.')

        let query = text
        if (m.mentionedJid?.length) {
            for (const jid of m.mentionedJid) query = query.split('@' + jid.split('@')[0]).join(' ')
        }
        query = query.trim()
        if (!query) return m.reply(`❓ Sebutkan nama hewan yang ingin diberikan.\nContoh: ${prefix + cmd} @orang kucing`)

        let qty = 1
        const parts = query.split(/\s+/)
        const last = parts[parts.length - 1]
        if (/^\d+$/.test(last)) {
            qty = parseInt(last, 10)
            parts.pop()
            query = parts.join(' ').trim()
        }
        if (!query) return m.reply(`❓ Sebutkan nama hewan yang ingin diberikan.\nContoh: ${prefix + cmd} @orang kucing`)
        if (qty < 1) return m.reply('⚠️ Jumlahnya minimal 1.')

        const animal = findAnimalByQuery(query)
        if (!animal) return m.reply(`⚠️ Hewan "${query}" tidak ditemukan. Cek nama hewannya di ${prefix}owozoo atau ${prefix}owodex.`)

        const owned = zooCount(m.sender, animal.id)
        if (owned < qty) return m.reply(`⚠️ Kandang Anda hanya punya ${animal.emoji} ${animal.name} x${owned}, tidak cukup untuk diberikan ${qty}.`)

        removeFromZoo(m.sender, animal.id, qty)
        addToZoo(target, animal.id, qty)

        const rarity = RARITIES[animal.rarity]
        let out = `✅ Berhasil berikan ${animal.emoji} *${animal.name}* (${rarity.label}) x${qty} ke @${target.split('@')[0]}!\n`
        if (animal.rarity === 'rahasia') out += `\n🌌 Itu hewan paling langka di OwO, baik sangat Anda memberikannya!\n`
        out += `\n📦 Sisa ${animal.name} di kandang Anda: ${zooCount(m.sender, animal.id)}`

        return m.reply(out, { mentions: [target] })
    }
}
