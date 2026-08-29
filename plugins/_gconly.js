import { settings } from '../lib/database.js'
import config from '../config.js'

const STATUS_LABEL = {
    false: 'OFF',
    closed: 'ON (private chat ditutup total)',
    join: 'ON (wajib join grup)'
}

function premiumSuffix() {
    return settings.gconlyPremiumBypass ? ' + premium bebas akses ⭐' : ''
}

export default {
    cmd: ['gconly'],
    category: 'owner',
    description: 'Batasi private chat: ditutup total, atau wajib join grup dulu',

    run: async (m, { sock, isOwner, text, prefix, cmd }) => {
        if (!isOwner) return m.reply('Fitur ini khusus untuk owner.')

        if (sock.isJadibotSession) return m.reply('Fitur ini cuma bisa dipakai di bot utama.')

        const args = text.trim().split(/ +/).filter(Boolean)
        const sub = (args[0] || '').toLowerCase()
        const flags = args.slice(1).map(a => a.toLowerCase())
        const hasJoinFlag = flags.includes('--join')
        const hasPremiumFlag = flags.includes('--premium')

        if (!sub) {
            return m.reply(
                `*roup-Only Mode*\n\n` +
                `› Status saat ini : *${STATUS_LABEL[String(settings.gconly)]}${premiumSuffix()}*\n\n` +
                `*${prefix}${cmd} on*                    -> private chat ditutup total, tidak diproses & TANPA notif\n` +
                `*${prefix}${cmd} on --join*             -> private chat wajib join grup dulu, notif reminder 1x aja\n` +
                `*${prefix}${cmd} on --premium*          -> tambahan: member premium bebas akses private chat, tidak perlu join\n` +
                `*(bisa digabung, misal: ${prefix}${cmd} on --join --premium)*\n` +
                `*${prefix}${cmd} off*                   -> nonaktif, private chat normal lagi\n\n` +
                `Grup   : ${config.groupUrl}\n` +
                `Saluran: ${config.channelUrl}`
            )
        }

        if (sub === 'on') {
            const mode = hasJoinFlag ? 'join' : 'closed'

            if (settings.gconly === mode && settings.gconlyPremiumBypass === hasPremiumFlag) {
                return m.reply(`Group-only mode sudah aktif di mode *${mode}*${premiumSuffix()} dari tadi.`)
            }

            settings.gconly = mode
            settings.gconlyPremiumBypass = hasPremiumFlag

            const premiumNote = hasPremiumFlag
                ? `\n\nMember premium dikecualikan: bisa akses private chat bebas tanpa perlu join grup.`
                : ''

            if (mode === 'closed') {
                return m.reply(
                    `✅ Group-only mode diaktifkan (mode *closed*).\n\n` +
                    `Private chat ditutup total buat non-owner: pesan bakal diabaikan sepenuhnya, TANPA ada notifikasi apapun yang dikirim.${premiumNote}`
                )
            }

            return m.reply(
                `✅ Group-only mode diaktifkan (mode *join*).\n\n` +
                `Private chat cuma bisa dipakai kalau user sudah join grup:\n${config.groupUrl}\n\n` +
                `dan follow saluran:\n${config.channelUrl}\n\n` +
                `User yang belum join bakal didiemin (tidak diproses) dan cuma dikasih reminder join 1x, tidak akan diulang-ulang.${premiumNote}`
            )
        }

        if (sub === 'off') {
            if (!settings.gconly) return m.reply('Group-only mode memang lagi nonaktif.')
            settings.gconly = false
            settings.gconlyPremiumBypass = false
            return m.reply('✅ Group-only mode dinonaktifkan. Private chat bisa dipakai bebas lagi.')
        }

        return m.reply(`Opsi tidak dikenal.\nGunakan: *${prefix}${cmd} on*, *${prefix}${cmd} on --join*, *${prefix}${cmd} on --premium*, atau *${prefix}${cmd} off*`)
    }
}
