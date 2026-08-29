export default {
    cmd: ['slot'],
    category: 'games',
    run: async (m, { sock, text, config }) => {
        const user = global.db.data.users[m.sender]
        const bet = parseInt(text)

        if (!bet || bet < 1) {
            return m.reply(`🎰 *JUDI SLOT*\n\nMoney Anda: *${user?.money || 0}* 🪙\n\nMasukan jumlah taruhan!\nContoh: .judi 100`)
        }

        if ((user?.money || 0) < bet) {
            return m.reply(`Money tidak cukup!\nMoney Anda: *${user?.money || 0}* 🪙`)
        }

        const fruits = ['🍎', '🍊', '🍇', '🍒', '🍋', '🍉', '⭐', '🔔', '💎']
        const getDisplay = (r1, r2, r3) => `🎰 *SLOT MACHINE* 🎰\n\n      [ ${r1} | ${r2} | ${r3} ]\n\n`

        const chance = Math.random() * 100
        let finalReels = []
        if (chance < 10) {
            let win = fruits[Math.floor(Math.random() * fruits.length)]
            finalReels = [win, win, win]
        } else if (chance < 40) {
            let win = fruits[Math.floor(Math.random() * fruits.length)]
            let lose = fruits.filter(f => f !== win)[Math.floor(Math.random() * (fruits.length - 1))]
            finalReels = [win, win, lose].sort(() => Math.random() - 0.5)
        } else {
            finalReels = fruits.sort(() => Math.random() - 0.5).slice(0, 3)
            if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) {
                finalReels = ['🍎', '💎', '🍒']
            }
        }

        const isJackpot = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]
        const isDouble = (finalReels[0] === finalReels[1]) || (finalReels[1] === finalReels[2]) || (finalReels[0] === finalReels[2])

        let status = ''
        let prize = 0

        if (isJackpot) {
            status = '🎉 *JACKPOT!!!* 🎉'
            prize = bet * 10
        } else if (isDouble) {
            status = '✨ *MENANG (2 SAME)* ✨'
            prize = Math.floor(bet * 1.5)
        } else {
            status = '❌ *KALAH* ❌'
            prize = 0
        }

        user.money = (user.money || 0) - bet + prize

        let result = getDisplay(finalReels[0], finalReels[1], finalReels[2])
        result += `${status}\n\n`
        result += prize > 0 ? `Anda mendapatkan: *${prize}* 🪙` : `Anda kehilangan: *${bet}* 🪙`
        result += `\nMoney sekarang: *${user.money}* 🪙`
        result += `\n\n> *${config.botName}*`

        return sock.sendMessage(m.from, { text: result }, { quoted: m })
    }
}
