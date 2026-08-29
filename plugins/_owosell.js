import { getOwo, fmtCowoncy, findAnimalByQuery, removeFromZoo, zooCount, RARITIES } from '../lib/owo.js'

export default {
    cmd: ['owosell', 'owojual'],
    category: 'owo',
    run: async (m, { text, prefix, cmd }) => {
        const args = text.trim().split(/ +/)
        const wantEssence = args.includes('--essence')
        const cleanArgs = args.filter(a => a !== '--essence')

        const qty = parseInt(cleanArgs[cleanArgs.length - 1])
        const hasQtyArg = !isNaN(qty) && cleanArgs.length > 1
        const query = (hasQtyArg ? cleanArgs.slice(0, -1) : cleanArgs).join(' ')
        const sellQty = hasQtyArg ? qty : 1

        if (!query) {
            return m.reply(`❓ Jual hewan duplikat untuk mendapatkan cowoncy atau essence.\n\nContoh:\n${prefix + cmd} ayam 3\n${prefix + cmd} ayam 3 --essence`)
        }

        const animal = findAnimalByQuery(query)
        if (!animal) return m.reply(`⚠️ Hewan tidak ditemukan. Cek nama di ${prefix}owodex.`)

        const owned = zooCount(m.sender, animal.id)
        if (owned < sellQty) return m.reply(`⚠️ Anda hanya punya ${owned}x *${animal.name}*, tidak cukup untuk jual ${sellQty}x.`)

        const rarity = RARITIES[animal.rarity]
        const removed = removeFromZoo(m.sender, animal.id, sellQty)
        if (!removed) return m.reply('⚠️ Gagal menjual, coba lagi.')

        const owo = getOwo(m.sender)

        if (wantEssence) {
            const gained = rarity.essence * sellQty
            owo.essence += gained
            return m.reply(`✅ ${sellQty}x *${animal.name}* ${animal.emoji} dihancurkan jadi *${gained} essence*.\n🧪 Essence sekarang: ${owo.essence}`)
        }

        const gained = rarity.sellPrice * sellQty
        owo.cowoncy += gained
        owo.totalEarned += gained
        return m.reply(`✅ Berhasil jual ${sellQty}x *${animal.name}* ${animal.emoji} seharga ${fmtCowoncy(gained)}.\nSaldo sekarang: ${fmtCowoncy(owo.cowoncy)}`)
    }
}
