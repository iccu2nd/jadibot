import { getOwo, ANIMALS, RARITIES, RARITY_ORDER } from '../lib/owo.js'

export default {
    cmd: ['owodex', 'owoanimals'],
    category: 'owo',
    run: async (m, { prefix }) => {
        const owo = getOwo(m.sender)

        const DIV = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'

        let out = `📖 *OWODEX* — daftar semua hewan\n${DIV}\n`
        for (const rarityKey of [...RARITY_ORDER].reverse()) {
            const rarity = RARITIES[rarityKey]
            const animals = ANIMALS.filter(a => a.rarity === rarityKey)
            const owned = animals.filter(a => (owo.zoo[a.id] || 0) > 0).length

            out += `\n*${rarity.label.toUpperCase()}* • tangkap ${Math.round(rarity.catchBase * 100)}% • ${owned}/${animals.length}\n`
            for (const animal of animals) {
                const has = (owo.zoo[animal.id] || 0) > 0
                out += `${has ? '✅' : '⬜'} ${animal.emoji} *${animal.name}* (${animal.id})\n`
            }
        }

        out += `\n${DIV}\n`
        out += `📌 Key dalam "()" dipakai buat ${prefix}owoteam set <key1,key2,key3>\n`
        out += `🏹 Berburu: ${prefix}huntanimal • Tangkap: ${prefix}catch • Fusion: ${prefix}owofusion\n`
        out += `💠 Detail statistik & ultimate tiap hewan: ${prefix}owochar <key>`

        return m.reply(out)
    }
}
