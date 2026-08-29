import { ITEMS, getRpg, hasStarted, addItem, removeItem } from '../lib/rpg.js'

function usageText(prefix, cmd) {
    return `*Cara pakai ${prefix + cmd}*\n\n` +
        `Kirim money:\n${prefix + cmd} @orang <jumlah>\n\n` +
        `Kirim barang:\n${prefix + cmd} @orang <nama barang> <jumlah>\n\n` +
        `Nama barang boleh pake spasi, contoh:\n${prefix + cmd} @orang besi tua 2\n\n` +
        `Cek nama barang Anda di ${prefix}inventory`
}

export default {
    cmd: ['gift', 'give', 'tf', 'transfer', 'kirimkoin'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        const target = m.mentionedJid?.[0] || m.quoted?.sender
        if (!target) return m.reply(`Tag atau reply orang yang mau dikasih dulu.\n\n${usageText(prefix, cmd)}`)
        if (target === m.sender) return m.reply('Tidak bisa gift ke diri sendiri.')

        const argText = text.replace(/@\d+/g, ' ')
        const args = argText.trim().split(/ +/).filter(Boolean)
        if (!args.length) return m.reply(usageText(prefix, cmd))

        const isBareNumber = args.length === 1 && /^\d+$/.test(args[0])
        const isMoneyKeyword = args.length === 2 && args[0].toLowerCase() === 'money' && /^\d+$/.test(args[1])
        const isMoneyGift = isBareNumber || isMoneyKeyword

        if (isMoneyGift) {
            const amount = parseInt(isMoneyKeyword ? args[1] : args[0], 10)
            if (!amount || amount < 1) return m.reply(`Jumlah money-nya tidak valid.\n\nContoh: ${prefix + cmd} @orang 100`)

            const sender = global.db.data.users[m.sender]
            const receiver = global.db.data.users[target]
            if (!receiver) return m.reply('Orang itu belum tercatat di database, suruh dia kirim pesan apa aja dulu ke bot.')
            if ((sender.money || 0) < amount) return m.reply(`Money Anda tidak cukup.\n\nMoney Anda sekarang: *${sender.money || 0}*`)

            sender.money -= amount
            receiver.money = (receiver.money || 0) + amount

            return m.reply(`Berhasil kirim *${amount}* money ke @${target.split('@')[0]}.\n\nMoney Anda sekarang: *${sender.money}*`, { mentions: [target] })
        }

        if (!hasStarted(m.sender)) return m.reply(`Anda belum punya karakter.\n\nKetik ${prefix}start untuk mulai bermain.`)
        if (!hasStarted(target)) return m.reply(`Orang itu belum punya karakter.\n\nAjak dia ketik ${prefix}start dulu.`)

        let qty = 1
        let nameParts = args
        const lastArg = args[args.length - 1]
        if (/^\d+$/.test(lastArg) && args.length > 1) {
            qty = parseInt(lastArg, 10)
            nameParts = args.slice(0, -1)
        }
        const itemId = nameParts.join('_').toLowerCase()
        const item = ITEMS[itemId]
        if (!item) return m.reply(`Barang "${nameParts.join(' ')}" tidak ketemu.\n\nCek nama barang Anda di ${prefix}inventory, terus tulis ulang persis kayak yang tertera (boleh pake spasi).`)

        const rpg = getRpg(m.sender)
        if (rpg.equippedWeapon === itemId || rpg.equippedArmor === itemId) {
            return m.reply(`${item.name} lagi dipasang.\n\nLepas dulu lewat ${prefix}equip sebelum dikirim.`)
        }
        const owned = rpg.inventory[itemId] || 0
        if (owned < qty) return m.reply(`Barang Anda tidak cukup.\n\nKamu cuma punya ${item.name} x${owned}.`)

        removeItem(rpg, itemId, qty)
        const targetRpg = getRpg(target)
        addItem(targetRpg, itemId, qty)

        return m.reply(`Berhasil gift *${item.name} x${qty}* ke @${target.split('@')[0]}.`, { mentions: [target] })
    }
}
