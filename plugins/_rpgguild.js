import {
    getRpg, hasStarted, fmtMoney, fmtMs, cooldownLeft, displayName,
    ensureGuildStore, getGuild, createGuild, findGuildByQuery,
    guildLevel, guildStatPercent, guildMoneyToNextLevel, topGuilds, guildPower,
    GUILD_CREATE_COST, GUILD_CREATE_MIN_LEVEL, GUILD_MAX_MEMBERS,
    WAR_COOLDOWN, WAR_STAKE_PERCENT, WAR_MIN_STAKE
} from '../lib/rpg.js'

export default {
    cmd: ['guild', 'klan'],
    category: 'rpg',
    run: async (m, { text, prefix, cmd }) => {
        if (!hasStarted(m.sender)) {
            return m.reply(`Anda belum punya karakter. Ketik ${prefix}start untuk mulai bermain.`)
        }
        const rpg = getRpg(m.sender)
        const raw = text.trim()
        const args = raw.split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()

        if (!sub) {
            if (!rpg.guildId) {
                let out = `*KLAN*\n\nKamu belum gabung klan manapun.\n\n`
                out += `Untuk klan baru: ${prefix + cmd} create <nama klan> (biaya ${fmtMoney(GUILD_CREATE_COST)}, minimal level ${GUILD_CREATE_MIN_LEVEL})\n`
                out += `Gabung klan: ${prefix + cmd} join <nama klan>\n`
                out += `Lihat semua klan: ${prefix + cmd} list`
                return m.reply(out)
            }
            const guild = getGuild(rpg.guildId)
            if (!guild) { rpg.guildId = null; return m.reply(`Klan Anda sudah tidak ada. Anda otomatis keluar.`) }
            const level = guildLevel(guild)
            const percent = guildStatPercent(guild)
            const toNext = guildMoneyToNextLevel(guild)
            let out = `*${guild.name}*\nID: ${guild.id}\n\n`
            out += `- *Ketua:* ${displayName(guild.owner, null, guild.owner.split('@')[0])}\n`
            out += `- *Anggota:* ${guild.members.length}/${GUILD_MAX_MEMBERS}\n`
            out += `- *Level klan:* ${level}\n`
            out += `- *Bonus serang/bertahan anggota:* +${percent}%\n`
            out += `- *Total sumbangan:* ${fmtMoney(guild.money)} money\n`
            out += toNext !== null ? `- *Butuh untuk naik level:* ${fmtMoney(toNext)} money\n` : `- *Bonus klan:* sudah maksimal\n`
            out += `\nSumbang money agar klan naik level: ${prefix + cmd} donate <jumlah>\n`
            out += `Perang lawan klan lain: ${prefix + cmd} war <nama klan lawan>\n`
            out += `Keluar klan: ${prefix + cmd} leave`
            return m.reply(out)
        }

        if (sub === 'buat' || sub === 'create') {
            if (rpg.guildId) return m.reply(`Anda sudah gabung klan. Keluar dulu lewat ${prefix + cmd} leave sebelum membuat klan baru.`)
            if (rpg.level < GUILD_CREATE_MIN_LEVEL) return m.reply(`Level Anda masih terlalu rendah. Butuh minimal level ${GUILD_CREATE_MIN_LEVEL} untuk bisa membuat klan (level Anda sekarang: ${rpg.level}).`)
            const name = args.slice(1).join(' ')
            if (!name) return m.reply(`Masukkan nama klannya. Contoh: ${prefix + cmd} create Naga Merah`)
            if (rpg.money < GUILD_CREATE_COST) return m.reply(`Money tidak cukup. Butuh ${fmtMoney(GUILD_CREATE_COST)} money untuk membuat klan.`)
            const result = createGuild(name, m.sender)
            if (result.error) return m.reply(result.error)
            rpg.money -= GUILD_CREATE_COST
            rpg.guildId = result.guild.id
            return m.reply(`Klan *${result.guild.name}* berhasil dibuat!\n\nAjak teman gabung dengan ${prefix + cmd} join ${result.guild.name}, lalu sumbang emas bersama-sama agar klan naik level dan semua anggota dapat bonus tarung permanen.`)
        }

        if (sub === 'gabung' || sub === 'join') {
            if (rpg.guildId) return m.reply(`Anda sudah gabung klan lain. Keluar dulu lewat ${prefix + cmd} leave.`)
            const query = args.slice(1).join(' ')
            const result = findGuildByQuery(query)
            if (result.error) return m.reply(result.error)
            const guild = result.guild
            if (guild.members.length >= GUILD_MAX_MEMBERS) return m.reply(`Klan *${guild.name}* sudah penuh (${GUILD_MAX_MEMBERS} anggota).`)
            guild.members.push(m.sender)
            rpg.guildId = guild.id
            return m.reply(`Anda resmi gabung klan *${guild.name}*! Sumbang emas untuk membantu menaikkan level klan lewat ${prefix + cmd} donate <jumlah>.`)
        }

        if (sub === 'keluar' || sub === 'leave') {
            if (!rpg.guildId) return m.reply(`Anda belum gabung klan manapun.`)
            const guild = getGuild(rpg.guildId)
            if (!guild) { rpg.guildId = null; return m.reply(`Klan Anda sudah tidak ada, otomatis keluar.`) }
            const wasOwner = guild.owner === m.sender
            guild.members = guild.members.filter(j => j !== m.sender)
            rpg.guildId = null
            if (!guild.members.length) {
                delete ensureGuildStore()[guild.id]
                return m.reply(`Anda keluar dari *${guild.name}*. Karena sudah tidak ada anggota lain, klan otomatis bubar.`)
            }
            if (wasOwner) {
                guild.owner = guild.members[0]
                return m.reply(`Anda keluar dari *${guild.name}*. Karena Anda ketua, jabatan otomatis pindah ke anggota lain.`)
            }
            return m.reply(`Anda sudah keluar dari klan *${guild.name}*.`)
        }

        if (sub === 'sumbang' || sub === 'donate') {
            if (!rpg.guildId) return m.reply(`Anda belum gabung klan manapun.`)
            const guild = getGuild(rpg.guildId)
            if (!guild) { rpg.guildId = null; return m.reply(`Klan Anda sudah tidak ada.`) }
            const amount = parseInt(args[1], 10)
            if (!amount || amount <= 0) return m.reply(`Masukkan jumlah emas yang ingin disumbang. Contoh: ${prefix + cmd} donate 200`)
            if (rpg.money < amount) return m.reply(`Money Anda hanya ${fmtMoney(rpg.money)} money.`)
            rpg.money -= amount
            guild.money = (guild.money || 0) + amount
            const level = guildLevel(guild)
            return m.reply(`Berhasil menyumbang ${fmtMoney(amount)} money ke klan *${guild.name}*.\nLevel klan sekarang: ${level} (bonus +${guildStatPercent(guild)}% untuk semua anggota).`)
        }

        if (sub === 'war' || sub === 'perang') {
            if (!rpg.guildId) return m.reply(`Anda belum gabung klan manapun.`)
            const guild = getGuild(rpg.guildId)
            if (!guild) { rpg.guildId = null; return m.reply(`Klan Anda sudah tidak ada.`) }
            if (guild.owner !== m.sender) return m.reply(`Hanya ketua klan yang bisa mendeklarasikan perang.`)
            const enemyQuery = args.slice(1).join(' ')
            const enemyResult = findGuildByQuery(enemyQuery)
            if (enemyResult.error) return m.reply(enemyResult.error)
            const enemy = enemyResult.guild
            if (enemy.id === guild.id) return m.reply(`Tidak bisa perang melawan klan sendiri.`)
            const left = cooldownLeft(guild.lastWar, WAR_COOLDOWN)
            if (left > 0) return m.reply(`Klan Anda masih cooldown perang. Tunggu ${fmtMs(left)} lagi.`)
            const enemyLeft = cooldownLeft(enemy.lastWar, WAR_COOLDOWN)
            if (enemyLeft > 0) return m.reply(`Klan *${enemy.name}* masih cooldown perang, tidak bisa diserang dulu.`)

            const myPower = guildPower(guild) * (0.85 + Math.random() * 0.3)
            const enemyPower = guildPower(enemy) * (0.85 + Math.random() * 0.3)
            const attackerWins = myPower >= enemyPower

            const loser = attackerWins ? enemy : guild
            const winner = attackerWins ? guild : enemy
            const stake = Math.min(loser.money || 0, Math.max(WAR_MIN_STAKE, Math.floor((loser.money || 0) * WAR_STAKE_PERCENT)))
            loser.money = (loser.money || 0) - stake
            winner.money = (winner.money || 0) + stake
            guild.lastWar = Date.now()
            enemy.lastWar = Date.now()

            let out = `*PERANG KLAN*\n\n*${guild.name}* vs *${enemy.name}*\n\n`
            if (attackerWins) {
                out += `*${guild.name}* menang! Berhasil merampas ${fmtMoney(stake)} money dari perbendaharaan *${enemy.name}*.`
            } else {
                out += `*${guild.name}* kalah! *${enemy.name}* berhasil merampas ${fmtMoney(stake)} money dari perbendaharaan klan Anda.`
            }
            return m.reply(out)
        }

        if (sub === 'daftar' || sub === 'list') {
            const guilds = topGuilds(15)
            if (!guilds.length) return m.reply(`Belum ada klan yang dibuat. Jadilah yang pertama lewat ${prefix + cmd} create <nama klan>.`)
            let out = `*DAFTAR KLAN*\n\n`
            out += guilds.map((g, i) => `${i + 1}. ${g.name} (${g.id}) - level ${guildLevel(g)}, ${g.members.length}/${GUILD_MAX_MEMBERS} anggota`).join('\n')
            out += `\n\nGabung dengan ${prefix + cmd} join <nama klan>.`
            return m.reply(out)
        }

        return m.reply(`Perintah tidak dikenali. Gunakan ${prefix + cmd}, ${prefix + cmd} create <nama>, ${prefix + cmd} join <nama klan>, ${prefix + cmd} donate <jumlah>, ${prefix + cmd} war <nama klan lawan>, ${prefix + cmd} leave, atau ${prefix + cmd} list.`)
    }
}
