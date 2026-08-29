import { getOwo, fmtCowoncy, CATCH_ITEMS, GEMS, LOOTBOXES, WEAPONS } from '../lib/owo.js'

export default {
    cmd: ['owoinventory', 'owoinv', 'owoitem'],
    category: 'owo',
    run: async (m, { prefix }) => {
        const owo = getOwo(m.sender)

        let out = `🎒 *INVENTORY OWO*\n\n`

        out += `Cowoncy: ${fmtCowoncy(owo.cowoncy)} | 🏦 Bank: ${fmtCowoncy(owo.bank)}\n`
        out += `🧪 Essence: ${owo.essence}\n\n`

        const items = Object.entries(owo.catchItems).filter(([k]) => k !== 'tangan')
        out += `*Item Tangkap*\n`
        out += items.length
            ? items.map(([k, qty]) => `• ${CATCH_ITEMS[k]?.name || k} x${qty}`).join('\n') + '\n'
            : `(kosong) — beli di ${prefix}owoshop\n`

        const gems = Object.entries(owo.gems)
        out += `\n*Gem*\n`
        out += gems.length
            ? gems.map(([k, qty]) => `• ${GEMS[k]?.emoji || ''} ${GEMS[k]?.name || k} x${qty}`).join('\n') + '\n'
            : `(kosong) — mendapatkan dari ${prefix}owolootbox\n`

        const boxes = Object.entries(owo.lootboxes)
        out += `\n*Lootbox*\n`
        out += boxes.length
            ? boxes.map(([k, qty]) => `• ${LOOTBOXES[k]?.emoji || ''} ${LOOTBOXES[k]?.name || k} x${qty}`).join('\n') + '\n'
            : `(kosong) — beli di ${prefix}owolootbox buy <tier>\n`

        out += `\n*Lainnya*\n`
        out += `• 🍪 Cookie x${owo.cookies}\n`
        out += `• 🗡️ Senjata terpasang: ${owo.weapon ? WEAPONS[owo.weapon].name : 'belum ada'}\n`

        return m.reply(out)
    }
}
