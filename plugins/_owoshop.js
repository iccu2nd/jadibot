import { getOwo, fmtCowoncy, CATCH_ITEMS, addCatchItem, nextTeamSlotPrice, buyTeamSlot, MAX_TEAM_EXTRA_SLOTS } from '../lib/owo.js'

export default {
    cmd: ['owoshop', 'owobuy'],
    category: 'owo',
    run: async (m, { sock, text, prefix, cmd }) => {
        const owo = getOwo(m.sender)
        const args = text.trim().split(/ +/).filter(Boolean)
        const first = (args[0] || '').toLowerCase()

        if (first === 'teamslot' || first === 'timslot') {
            const owned = owo.teamSlots || 0
            const price = nextTeamSlotPrice(m.sender)

            if (args[1] !== 'beli' && args[1] !== 'buy') {
                let out = `🛒 *SLOT TIM PVP*\n\n`
                out += `Slot tambahan Anda sekarang: ${owned}/${MAX_TEAM_EXTRA_SLOTS}\n`
                out += price !== null
                    ? `Harga slot berikutnya: ${fmtCowoncy(price)}\n`
                    : `Anda sudah di batas maksimal slot tambahan (${MAX_TEAM_EXTRA_SLOTS}).\n`
                out += `Saldo Anda: ${fmtCowoncy(owo.cowoncy)}\n\n`
                if (price === null) return m.reply(out)

                return sock.sendInteractiveButton(m.from, {
                    body: out,
                    footer: 'tap tombol untuk beli',
                    buttons: [
                        { type: 'reply', label: `Beli slot (${fmtCowoncy(price)})`, id: `${prefix}owobuy teamslot beli` }
                    ]
                }, { quoted: m })
            }

            const result = buyTeamSlot(m.sender)
            if (!result.ok && result.reason === 'max') {
                return m.reply(`⚠️ Anda sudah di batas maksimal slot tambahan (${MAX_TEAM_EXTRA_SLOTS}).`)
            }
            if (!result.ok && result.reason === 'cowoncy') {
                return m.reply(`💸 Saldo Anda tidak cukup. Butuh ${fmtCowoncy(result.price)}, saldo Anda ${fmtCowoncy(owo.cowoncy)}.`)
            }
            return m.reply(`✅ Slot tim berhasil ditambah!\nHarga: ${fmtCowoncy(result.price)}\nSlot tambahan Anda sekarang: ${result.total}\nSaldo: ${fmtCowoncy(owo.cowoncy)}`)
        }

        if (cmd === 'owoshop' || !text.trim()) {
            let out = `🛒 *TOKO ITEM TANGKAP*\n\n`
            for (const [key, item] of Object.entries(CATCH_ITEMS)) {
                if (key === 'tangan') continue
                const ownedQty = owo.catchItems[key] || 0
                out += `• *${item.name}* (${key})\n  Harga: ${fmtCowoncy(item.price)} | Bonus tangkap: +${Math.round(item.bonus * 100)}%\n  Punya: ${ownedQty}x\n\n`
            }
            out += `Saldo Anda: ${fmtCowoncy(owo.cowoncy)}`

            const rows = Object.entries(CATCH_ITEMS)
                .filter(([key]) => key !== 'tangan')
                .map(([key, item]) => ({
                    header: fmtCowoncy(item.price),
                    title: `Beli 1x ${item.name}`,
                    description: `Bonus tangkap +${Math.round(item.bonus * 100)}% | punya ${owo.catchItems[key] || 0}x`,
                    id: `${prefix}owobuy ${key} 1`
                }))

            return sock.sendInteractiveButton(m.from, {
                body: out,
                footer: 'pilih item lewat tombol, atau ketik jumlah manual',
                buttons: [
                    {
                        type: 'list',
                        label: 'Pilih Item',
                        sections: [
                            { title: 'Item Tangkap', rows },
                            { title: 'Lainnya', rows: [
                                { header: '', title: 'Slot Tim PVP', description: 'Lihat harga & beli slot tim', id: `${prefix}owobuy teamslot` }
                            ] }
                        ]
                    }
                ]
            }, { quoted: m })
        }

        const itemKey = first
        const qty = parseInt(args[1]) || 1

        const item = CATCH_ITEMS[itemKey]
        if (!item || itemKey === 'tangan') return m.reply(`⚠️ Item tidak ditemukan. Ketik ${prefix}owoshop untuk lihat daftar item.`)
        if (qty < 1) return m.reply('⚠️ Jumlah tidak valid.')

        const total = item.price * qty
        if (owo.cowoncy < total) return m.reply(`💸 Saldo Anda tidak cukup. Butuh ${fmtCowoncy(total)}, saldo Anda ${fmtCowoncy(owo.cowoncy)}.`)

        owo.cowoncy -= total
        const newCount = addCatchItem(m.sender, itemKey, qty)

        return m.reply(`✅ Berhasil beli ${qty}x *${item.name}* seharga ${fmtCowoncy(total)}.\nStok sekarang: ${newCount}x\nSaldo: ${fmtCowoncy(owo.cowoncy)}`)
    }
}
