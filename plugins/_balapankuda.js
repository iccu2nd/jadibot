export default {
    cmd: ['balapan', 'balapankuda', 'race'],
    category: 'games',
    run: async (m, { text, config }) => {
        const user = global.db.data.users[m.sender]
        const animals = ['🦓', '🐅', '🦏', '🐪', '🦛', '🦬', '🐃', '🐂', '🐎', '🐏']
        const trackLength = 25

        const bet = parseInt(text)
        if (isNaN(bet) || bet < 1 || bet > 10) {
            let help = `⌗ *Balapan Kuda*\n\n`
            help += `Money Anda: *${user?.money || 0}* 🪙\n\n`
            help += `Pilih nomor kuda (1-10) untuk bertaruh!\nContoh: .balapan 5\n\n`
            animals.forEach((emoji, i) => { help += `${i + 1}. ${emoji}\n` })
            return m.reply(help)
        }

        if ((user?.money || 0) < bet * 100) {
            return m.reply(`Money tidak cukup! Butuh *${bet * 100}* 🪙\nMoney Anda: *${user?.money || 0}* 🪙`)
        }

        const playerBet = bet - 1
        let positions = new Array(animals.length).fill(0)
        let finished = false
        let winnerIndex = -1
        let trackView = ''

        while (!finished) {
            trackView = `[ *BALAPAN KUDA SEDANG BERLANGSUNG* ]\n\n`
            for (let i = 0; i < animals.length; i++) {
                positions[i] += Math.floor(Math.random() * 4)
                if (positions[i] >= trackLength) {
                    positions[i] = trackLength
                    if (!finished) { finished = true; winnerIndex = i }
                }
                const progress = '-'.repeat(positions[i])
                const remaining = '-'.repeat(trackLength - positions[i])
                trackView += `${i + 1}. ${progress}${animals[i]}${remaining} 🏁\n`
            }
        }

        const isWin = playerBet === winnerIndex
        const taruhan = bet * 100
        const hadiah = isWin ? taruhan * 5 : 0

        user.money = (user.money || 0) - taruhan + hadiah

        let resultText = trackView + `\n> *Pilihan Anda:* ${animals[playerBet]}\n\n`
        resultText += `⌗ *HASIL BALAPAN*\n\n`
        resultText += `Pemenangnya adalah: *${animals[winnerIndex]}* (Nomor ${winnerIndex + 1})\n\n`

        if (isWin) {
            resultText += `🎉 Selamat! Anda menang *${hadiah}* 🪙`
        } else {
            resultText += `❌ Yahh kalah... Kehilangan *${taruhan}* 🪙`
        }
        resultText += `\nMoney sekarang: *${user.money}* 🪙`

        return m.reply(resultText)
    }
}
