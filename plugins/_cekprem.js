export default {
    cmd: ['cekprem', 'checkprem', 'myprem'],
    category: 'main',
    description: 'Cek status premium Anda atau user lain',
    run: async (m, { config, text }) => {
        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const jid = rawTarget || m.sender
        const user = global.db.data.users[jid]

        if (!user) return m.reply(rawTarget ? 'Orang itu belum tercatat di database.' : 'Data Anda belum tercatat, coba kirim pesan apa saja dulu.')

        const isSelf = jid === m.sender
        const isPremium = !!(user.premium && user.premiumTime > Date.now())

        let caption = `💎 *CEK PREMIUM*\n\n`
        caption += `- *User:* @${jid.split('@')[0]}\n`
        caption += `- *Status:* ${isPremium ? '✅ Premium Aktif' : '❌ Bukan Premium'}\n`

        if (isPremium) {
            const expire = new Date(user.premiumTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            const daysLeft = Math.ceil((user.premiumTime - Date.now()) / 86400000)
            caption += `- *Berlaku hingga:* ${expire}\n`
            caption += `- *Sisa waktu:* ${daysLeft} hari lagi\n`
        } else if (isSelf) {
            caption += `\nBelum jadi member premium. Hubungi owner bot buat upgrade ke premium biar dapat limit lebih banyak & fitur eksklusif!`
        }
        return m.reply(caption, { mentions: [jid] })
    }
}
