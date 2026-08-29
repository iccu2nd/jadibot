import { ITEMS, getRpg, hasStarted } from '../lib/rpg.js'

const TYPE_LABEL = { weapon: 'Senjata', armor: 'Zirah', potion: 'Ramuan', material: 'Material', fish: 'Ikan', junk: 'Sampah' }

export default {
    cmd: ['inventory', 'inv', 'tas'],
    category: 'rpg',
    run: async (m, { prefix }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const entries = Object.entries(rpg.inventory || {})
        if (!entries.length) {
            return m.reply(`Tas Anda masih kosong. Belanja dulu di ${prefix}shop atau kumpulkan material lewat ${prefix}dungeon.`)
        }
        const grouped = {}
        for (const [id, qty] of entries) {
            const item = ITEMS[id]
            if (!item) continue
            grouped[item.type] ??= []
            const refine = rpg.refine?.[id]
            const equipped = (rpg.equippedWeapon === id || rpg.equippedArmor === id) ? ' (dipakai)' : ''
            grouped[item.type].push(`${item.name}${refine ? ` +${refine}` : ''} x${qty}${equipped}`)
        }
        let out = `*ISI TAS*\n\n`
        for (const [type, list] of Object.entries(grouped)) {
            out += `*${TYPE_LABEL[type] || type}*\n`
            out += list.map(line => `• ${line}`).join('\n')
            out += `\n\n`
        }
        out += `Pasang senjata/zirah dengan ${prefix}equip <nama item>\nAsah item yang terpasang dengan ${prefix}enchant\nJual barang yang tidak terpakai dengan ${prefix}sell <nama item>`
        return m.reply(out.trim())
    }
}
