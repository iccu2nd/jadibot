import { FOOD_RECIPES, ITEMS, getRpg, hasStarted, hasItems, removeItem, fmtMoney, fmtMs, eatFood, foodBuffActive } from '../lib/rpg.js'

function needText(need) {
    return Object.entries(need).map(([id, qty]) => `${ITEMS[id]?.name || id} x${qty}`).join(', ')
}

export default {
    cmd: ['cook', 'masak'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const id = text.trim().toLowerCase().replace(/ /g, '_')

        if (!id) {
            const active = foodBuffActive(rpg)
            let out = `*MASAK*\n`
            out += active
                ? `Buff aktif: *${active.name}* (serang +${active.atk}, bertahan +${active.def}), sisa ${fmtMs(active.expiresAt - Date.now())}.\n\n`
                : `Belum ada buff makanan yang aktif.\n\n`
            out += `*RESEP TERSEDIA*\n`
            out += Object.entries(FOOD_RECIPES).map(([rid, r]) =>
                `• ${r.name} (${rid}) - butuh ${needText(r.need)} + ${fmtMoney(r.money)} money\n  Bonus: serang +${r.atk}, bertahan +${r.def}, tahan ${fmtMs(r.duration)}`
            ).join('\n')
            out += `\n\nMasak dengan ${prefix + cmd} <nama resep>, contoh: ${prefix + cmd} sup_teri\nBahan ikan didapat lewat ${prefix}fish. Hanya bisa ada satu buff aktif, masak baru akan menimpa yang lama.`
            return m.reply(out)
        }

        const recipe = FOOD_RECIPES[id]
        if (!recipe) return m.reply(`Resep tidak ditemukan. Ketik ${prefix + cmd} untuk melihat daftar resep.`)
        if (!hasItems(rpg, recipe.need)) {
            return m.reply(`Bahan kurang untuk memasak ${recipe.name}. Butuh ${needText(recipe.need)}.\nTangkap dulu ikannya lewat ${prefix}fish.`)
        }
        if (rpg.money < recipe.money) {
            return m.reply(`Money tidak cukup. Butuh ${fmtMoney(recipe.money)} money untuk memasak ${recipe.name}.`)
        }
        for (const [mid, qty] of Object.entries(recipe.need)) removeItem(rpg, mid, qty)
        rpg.money -= recipe.money
        eatFood(rpg, id)
        return m.reply(`Berhasil memasak dan memakan *${recipe.name}*!\nSerang +${recipe.atk}\nBertahan +${recipe.def}\nBertahan ${fmtMs(recipe.duration)}\n\nBuff ini otomatis terpakai di semua mode tarung (${prefix}hunt, ${prefix}dungeon, ${prefix}boss, ${prefix}duel, ${prefix}arena) sampai waktunya habis.`)
    }
}
