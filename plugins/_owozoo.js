import { getOwo, ANIMALS_BY_ID, RARITIES, RARITY_ORDER, totalZooCount } from '../lib/owo.js'

export default {
    cmd: ['owozoo', 'zoo'],
    category: 'owo',
    run: async (m, { prefix }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const owo = getOwo(target)
        const zooIds = Object.keys(owo.zoo)

        if (!zooIds.length) {
            return m.reply(`🦁 Kandang masih kosong.\nKetik ${prefix}huntanimal untuk mulai berburu hewan!`)
        }

        const grouped = {}
        for (const id of zooIds) {
            const animal = ANIMALS_BY_ID[id]
            if (!animal) continue
            grouped[animal.rarity] ??= []
            grouped[animal.rarity].push(animal)
        }

        let out = `🦁 *ZOO OWO*${target !== m.sender ? ` — @${target.split('@')[0]}` : ''}\n\n`
        for (const rarityKey of [...RARITY_ORDER].reverse()) {
            const animals = grouped[rarityKey]
            if (!animals?.length) continue
            out += `*${RARITIES[rarityKey].label}*\n`
            for (const animal of animals) {
                out += `${animal.emoji} ${animal.name} x${owo.zoo[animal.id]}\n`
            }
            out += `\n`
        }
        out += `📦 Total hewan: ${totalZooCount(target)}\n🧬 Spesies dimiliki: ${zooIds.length}/${Object.keys(ANIMALS_BY_ID).length}`

        return m.reply(out, { mentions: target !== m.sender ? [target] : [] })
    }
}
