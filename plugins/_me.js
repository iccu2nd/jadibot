import { getRpg, hasStarted, getRank, nextRank, totalAtk, totalDef, expNeeded, CLASSES, ITEMS, PETS, MOUNTS, TITLES, getGuild, foodBuffActive } from '../lib/rpg.js'

export default {
    cmd: ['profile', 'me'],
    category: 'main',
    run: async (m, { sock, text }) => {
        const action = text.trim().toLowerCase()

        if (action === '--public' || action === '--private') {
            const self = global.db.data.users[m.sender]
            if (!self) return m.reply('Data Anda belum tercatat, coba kirim pesan apa saja dulu.')
            self.hideProfile = action === '--private'
            return m.reply(self.hideProfile ? 'Profile Anda sekarang *mode private* tidak bisa dicek orang lain.' : 'Profile Anda sekarang bisa dicek orang lain lagi.')
        }

        const rawTarget = m.mentionedJid?.[0] || m.quoted?.sender
        const jid = rawTarget || m.sender
        const user = global.db.data.users[jid]

        if (!user) return m.reply(rawTarget ? 'Orang itu belum tercatat di database.' : 'Data Anda belum tercatat, coba kirim pesan apa saja dulu.')
        if (rawTarget && jid !== m.sender && user.hideProfile) return m.reply('Orang ini menonaktifkan cek profile.')

        const isPremium = user.premium && user.premiumTime > Date.now()
        const premiumInfo = isPremium
            ? `Aktif hingga ${new Date(user.premiumTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Tidak aktif'

        const viaLid = rawTarget ? rawTarget.endsWith('@lid') : !!m.senderLid

        let rpgSection = ''
        if (hasStarted(jid)) {
            const rpg = getRpg(jid)
            const cls = CLASSES[rpg.class]
            const rank = getRank(rpg.level)
            const next = nextRank(rpg.level)
            const weapon = rpg.equippedWeapon ? ITEMS[rpg.equippedWeapon]?.name || rpg.equippedWeapon : 'Tidak ada'
            const armor = rpg.equippedArmor ? ITEMS[rpg.equippedArmor]?.name || rpg.equippedArmor : 'Tidak ada'
            const pet = rpg.pet ? `${PETS[rpg.pet]?.name || rpg.pet} (Lv${rpg.petLevel || 1})` : 'Tidak ada'
            const mount = rpg.mount ? MOUNTS[rpg.mount]?.name || rpg.mount : 'Tidak ada'
            const guild = rpg.guildId ? (getGuild(rpg.guildId)?.name || rpg.guildId) : 'Tidak ada'
            const title = rpg.activeTitle ? (TITLES.find(t => t.id === rpg.activeTitle)?.name || '-') : 'Tidak ada'
            const buff = foodBuffActive(rpg)

            rpgSection = `\n\n- *RPG*\n\n` +
                `- *Class:* ${cls?.name || rpg.class}\n` +
                `- *Gelar Aktif:* ${title}\n` +
                `- *Level:* ${rpg.level} (${rpg.exp}/${expNeeded(rpg.level)} exp)\n` +
                `- *Rank:* ${rank.name}${next ? ` (menuju ${next.name} di level ${next.minLevel})` : ' (Max)'}\n` +
                `- *HP:* ${rpg.hp}/${rpg.maxHp}\n` +
                `- *ATK/DEF:* ${totalAtk(rpg)} / ${totalDef(rpg)}\n` +
                `- *Senjata:* ${weapon}\n` +
                `- *Armor:* ${armor}\n` +
                `- *Peliharaan:* ${pet}\n` +
                `- *Tunggangan:* ${mount}\n` +
                `- *Klan:* ${guild}\n` +
                `- *Buff Makanan:* ${buff ? `${buff.name} (aktif)` : 'Tidak ada'}\n` +
                `- *Win/Lose:* ${rpg.wins || 0}/${rpg.losses || 0}\n` +
                `- *Arena:* ${rpg.arenaPoints || 0} poin (${rpg.arenaWins || 0}W/${rpg.arenaLosses || 0}L)\n` +
                `- *Dungeon Floor:* ${rpg.dungeonFloor || 1}\n` +
                `- *Abyss Floor:* ${rpg.abyssFloor || 1}\n` +
                `- *Boss Kills:* ${rpg.bossKills || 0}\n` +
                `- *Ikan Ditangkap:* ${rpg.fishCaught || 0}\n` +
                `- *Daily Streak:* ${rpg.dailyStreak || 0} hari\n` +
                `- *Prestige (Reborn):* ${rpg.prestige || 0}\n` +
                `- *Gelar Terbuka:* ${(rpg.unlockedTitles || []).length}/${TITLES.length}\n` +
                `- *Skill Terbuka:* ${(rpg.unlockedSkills || []).length}`
        }

        const caption = `- *Profile*\n\n` +
            `- *Nama:* ${user.name || (jid === m.sender ? m.pushName : '') || '-'}\n` +
            `- *Tag:* @${jid.split('@')[0]}\n` +
            `- *Nomor:* ${jid.split('@')[0]}\n` +
            `- *Premium:* ${premiumInfo}\n` +
            `- *Streak:* ${user.streak || 0} hari\n` +
            `- *Money:* ${user.money || 0} (berlaku untuk semua fitur, termasuk RPG dan judi)\n` +
            `- *Di Bank:* ${user.bank || 0}\n` +
            `- *Warning:* ${user.warn || 0}\n` +
            `- *Privasi:* ${user.hideProfile ? 'Private' : 'Public'}\n` +
            `- *Status:* ${user.banned ? 'Banned' : 'Aktif'}` +
            rpgSection

        const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null)
        if (pp) return sock.sendMessage(m.from, { image: pp, caption, mentions: [jid] }, { quoted: m }).catch(() => m.reply(caption, { mentions: [jid] }))

        m.reply(caption, { mentions: [jid] })
    }
}