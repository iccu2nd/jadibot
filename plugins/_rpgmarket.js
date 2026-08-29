import {
    ITEMS, getRpg, hasStarted, addItem, removeItem, fmtMoney, fmtMs, displayName,
    activeMarketListings, playerMarketListings, playerMarketListingCount,
    createMarketListing, getMarketListing, removeMarketListing,
    MARKET_MAX_PER_PLAYER, MARKET_TAX_PERCENT, MARKET_MAX_PRICE_PER_UNIT, MARKET_LISTING_MS
} from '../lib/rpg.js'

const PAGE_SIZE = 8

function parseItemQtyPrice(args) {
    if (args.length < 3) return null
    const price = args[args.length - 1]
    const qty = args[args.length - 2]
    if (!/^\d+$/.test(price) || !/^\d+$/.test(qty)) return null
    const nameParts = args.slice(0, -2)
    if (!nameParts.length) return null
    return { itemId: nameParts.join('_'), qty: parseInt(qty, 10), pricePerUnit: parseInt(price, 10) }
}

function listingLine(l, showSeller = true) {
    const item = ITEMS[l.itemId]
    const name = item ? item.name : l.itemId
    const total = l.qty * l.pricePerUnit
    const sellerLabel = showSeller ? ` • penjual: ${displayName(l.sellerJid, null, l.sellerJid.split('@')[0])}` : ''
    return `• [${l.id}] ${name} x${l.qty} - ${fmtMoney(l.pricePerUnit)} money/pcs (total ${fmtMoney(total)})${sellerLabel}`
}

export default {
    cmd: ['market', 'pasar'],
    category: 'rpg',
    run: async (m, { sock, text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const raw = text.trim()
        const args = raw.split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (!sub || sub === 'list') {
            const page = Math.max(1, parseInt(args[sub ? 1 : 0], 10) || 1)
            const listings = activeMarketListings()
            if (!listings.length) {
                let out = `*PASAR PEMAIN*\n\nBelum ada barang yang dijual siapa pun sekarang.\n\n`
                out += `Jual barangmu: ${prefix + cmd} jual <nama barang> <jumlah> <harga per pcs>\n`
                out += `Contoh: ${prefix + cmd} jual kristal_sihir 3 250`
                return m.reply(out)
            }
            const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))
            const p = Math.min(page, totalPages)
            const pageItems = listings.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)
            let out = `*PASAR PEMAIN* (halaman ${p}/${totalPages})\n\n`
            out += pageItems.map(l => listingLine(l)).join('\n')
            out += `\n\nBeli: ${prefix + cmd} beli <id> [jumlah]\n`
            out += `Jual: ${prefix + cmd} jual <nama barang> <jumlah> <harga per pcs>\n`
            out += `Lihat lapak Anda: ${prefix + cmd} saya\n`
            if (totalPages > 1) out += `Halaman lain: ${prefix + cmd} list <nomor halaman>`
            return m.reply(out.trim())
        }

        if (sub === 'saya' || sub === 'mine') {
            const mine = playerMarketListings(m.sender)
            const limit = MARKET_MAX_PER_PLAYER
            if (!mine.length) return m.reply(`Anda belum punya barang yang dijual di pasar.\nSlot lapak: 0/${limit}\nJual barangmu: ${prefix + cmd} jual <nama barang> <jumlah> <harga per pcs>`)
            let out = `*LAPAK ANDA DI PASAR* (${mine.length}/${limit} slot)\n\n`
            out += mine.map(l => listingLine(l, false) + `\n     sisa waktu: ${fmtMs(l.expiresAt - Date.now())}`).join('\n\n')
            out += `\n\nBatalkan lapak: ${prefix + cmd} batal <id>`
            return m.reply(out)
        }

        if (sub === 'jual' || sub === 'sell') {
            const parsed = parseItemQtyPrice(args.slice(1))
            if (!parsed) {
                return m.reply(`Format salah.\nContoh: ${prefix + cmd} jual kristal_sihir 3 250\n(artinya: jual Kristal Sihir sebanyak 3, seharga 250 money per pcs)`)
            }
            const { itemId, qty, pricePerUnit } = parsed
            const item = ITEMS[itemId]
            if (!item) return m.reply(`Barang tidak ditemukan. Cek ${prefix}inventory untuk melihat nama barang Anda.`)
            if (qty <= 0) return m.reply(`Jumlah barang harus lebih dari 0.`)
            if (pricePerUnit <= 0) return m.reply(`Harga per pcs harus lebih dari 0.`)
            if (pricePerUnit > MARKET_MAX_PRICE_PER_UNIT) return m.reply(`Harga per pcs kemahalan, maksimal ${fmtMoney(MARKET_MAX_PRICE_PER_UNIT)} money.`)
            if (rpg.equippedWeapon === itemId || rpg.equippedArmor === itemId) {
                return m.reply(`${item.name} sedang dipasang. Lepas dulu dengan memasang barang lain lewat ${prefix}equip sebelum menjualnya di pasar.`)
            }
            const owned = rpg.inventory[itemId] || 0
            if (owned < qty) return m.reply(`Barang Anda tidak cukup. Anda hanya punya ${item.name} x${owned}.`)
            const slotLimit = MARKET_MAX_PER_PLAYER
            if (playerMarketListingCount(m.sender) >= slotLimit) {
                return m.reply(`Lapak Anda sudah penuh (maksimal ${slotLimit} sekaligus). Batalkan/tunggu salah satu lapak terjual/kedaluwarsa.`)
            }

            removeItem(rpg, itemId, qty)
            const listing = createMarketListing(m.sender, itemId, qty, pricePerUnit)
            const total = qty * pricePerUnit
            let out = `*BARANG DIPASANG DI PASAR*\n\n`
            out += `${item.name} x${qty} seharga ${fmtMoney(pricePerUnit)} money/pcs (total ${fmtMoney(total)}).\n`
            out += `ID lapak: *${listing.id}*\n`
            out += `Lapak otomatis kedaluwarsa dalam ${fmtMs(MARKET_LISTING_MS)} kalau tidak laku, barang akan dikembalikan.\n`
            out += `Batalkan kapan saja: ${prefix + cmd} batal ${listing.id}`
            return m.reply(out)
        }

        if (sub === 'beli' || sub === 'buy') {
            const id = args[1]
            if (!id) return m.reply(`Masukkan ID lapak yang ingin dibeli.\nContoh: ${prefix + cmd} beli M12\nLihat daftar lapak: ${prefix + cmd} list`)
            const listing = getMarketListing(id.toUpperCase())
            if (!listing) return m.reply(`Lapak dengan ID itu tidak ditemukan atau sudah tidak ada.`)
            if (listing.sellerJid === m.sender) return m.reply(`Anda tidak bisa membeli lapakmu sendiri. Batalkan saja dengan ${prefix + cmd} batal ${id.toUpperCase()}.`)

            let buyQty = listing.qty
            if (args[2]) {
                if (!/^\d+$/.test(args[2])) return m.reply(`Jumlah beli harus berupa angka.`)
                buyQty = parseInt(args[2], 10)
            }
            if (buyQty <= 0 || buyQty > listing.qty) {
                return m.reply(`Jumlah tidak valid. Lapak ini menjual sisa ${listing.qty} pcs.`)
            }

            const total = buyQty * listing.pricePerUnit
            if (rpg.money < total) {
                return m.reply(`Money Anda tidak cukup. Butuh ${fmtMoney(total)} money, money Anda ${fmtMoney(rpg.money)}.`)
            }

            const item = ITEMS[listing.itemId]
            const tax = Math.floor(total * MARKET_TAX_PERCENT / 100)
            const sellerReceives = total - tax

            rpg.money -= total
            addItem(rpg, listing.itemId, buyQty)

            const sellerRpg = getRpg(listing.sellerJid)
            sellerRpg.money += sellerReceives

            const remaining = listing.qty - buyQty
            if (remaining > 0) {
                listing.qty = remaining
            } else {
                removeMarketListing(listing.id)
            }

            let out = `*PEMBELIAN BERHASIL*\n\n`
            out += `${item ? item.name : listing.itemId} x${buyQty} seharga ${fmtMoney(total)} money.\n`
            out += `Money Anda sekarang: ${fmtMoney(rpg.money)} money.`
            m.reply(out)

            if (sellerRpg) {
                const notif = `🛒 Lapak pasarmu laku!\n${item ? item.name : listing.itemId} x${buyQty} terjual ke ${displayName(m.sender, null, m.sender.split('@')[0])} seharga ${fmtMoney(total)} money (dipotong pajak pasar ${MARKET_TAX_PERCENT}%, Anda terima ${fmtMoney(sellerReceives)} money).`
                sock.sendMessage(listing.sellerJid, { text: notif }).catch(() => {})
            }
            return
        }

        if (sub === 'batal' || sub === 'cancel') {
            const id = args[1]
            if (!id) return m.reply(`Masukkan ID lapak yang ingin dibatalkan.\nLihat lapak Anda: ${prefix + cmd} saya`)
            const listing = getMarketListing(id.toUpperCase())
            if (!listing) return m.reply(`Lapak dengan ID itu tidak ditemukan atau sudah tidak ada.`)
            if (listing.sellerJid !== m.sender) return m.reply(`Itu bukan lapak Anda.`)

            addItem(rpg, listing.itemId, listing.qty)
            removeMarketListing(listing.id)
            const item = ITEMS[listing.itemId]
            return m.reply(`Lapak ${listing.id} dibatalkan. ${item ? item.name : listing.itemId} x${listing.qty} dikembalikan ke tas Anda.`)
        }

        let out = `*PASAR PEMAIN*\nJual beli barang langsung antar pemain.\n\n`
        out += `${prefix + cmd} list - lihat semua barang yang dijual\n`
        out += `${prefix + cmd} jual <nama barang> <jumlah> <harga per pcs> - pasang lapak\n`
        out += `${prefix + cmd} beli <id> [jumlah] - beli dari lapak\n`
        out += `${prefix + cmd} batal <id> - batalkan lapak Anda\n`
        out += `${prefix + cmd} saya - lihat lapak Anda sendiri\n\n`
        out += `Catatan: pasar mengenakan pajak ${MARKET_TAX_PERCENT}% dari hasil penjualan, dan lapak otomatis kedaluwarsa dalam ${fmtMs(MARKET_LISTING_MS)}.\n`
        out += `Slot lapak: ${MARKET_MAX_PER_PLAYER}.`
        return m.reply(out)
    }
}
