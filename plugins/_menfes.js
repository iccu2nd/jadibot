import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { getPlugin } from '../lib/plugins.js'

const prefixes = ['.', '/', '#', '!']

function findRoom(sender) {
  return Object.values(global.db.data.menfess || {}).find(r => [r.a, r.b].includes(sender))
}

export function hasActiveMenfesSession(sender) {
  return !!findRoom(sender)
}

function isCmd(body) {
  const prefix = prefixes.find(p => (body || '').startsWith(p))
  if (!prefix) return false
  const cmd = body.slice(prefix.length).trim().split(/ +/)[0]?.toLowerCase()
  return !!getPlugin(cmd)
}

function getLog(room) {
  room.log ||= {}
  return room.log
}

async function relay(sock, m, room, target) {
  const log = getLog(room)
  let quoted
  if (m.quoted && log[m.quoted.id]) {
    const data = log[m.quoted.id]
    quoted = {
      key: {
        remoteJid: target,
        id: data.partnerChatId,
        fromMe: data.partnerFromMe
      },
      message: m.quoted
    }
  }
  const sent = await sock.sendMessage(
    target,
    { forward: m, force: true },
    quoted ? { quoted } : {}
  )
  if (sent?.key?.id) {
    log[m.id] = {
      partnerChatId: sent.key.id,
      partnerFromMe: true
    }
    log[sent.key.id] = {
      partnerChatId: m.id,
      partnerFromMe: false
    }
  }
}

async function stopRoom(sock, m, room) {
  const target = room.a === m.sender ? room.b : room.a
  try {
    await sock.sendMessage(target, {
      text: room.status === 'WAITING'
        ? `*Menfes Ditolak*

Yah, menfes Anda tidak diterima oleh penerima.

Mungkin dia belum ingin membuka percakapan saat ini.`
        : `*Sesi Menfes Berakhir*

Lawan chat Anda telah mengakhiri sesi menfes.

Bot telah menutup percakapan ini sebagai perantara.`
    })
  } catch {}
  delete global.db.data.menfess[room.id]
  return m.reply(room.status === 'WAITING' ? 'Menfes berhasil dibatalkan.' : 'Sesi menfes berhasil dihentikan.')
}

export default {
  cmd: ['menfes'],
  category: 'fun',

  run: async (m, { sock, text }) => {
    global.db.data.menfess ??= {}

    const args = text?.trim().split(/\s+/) || []
    if (args[0]?.toLowerCase() === 'stop') {
      const room = findRoom(m.sender)
      if (!room) return m.reply('Tidak ada sesi menfes yang sedang berjalan.')
      return stopRoom(sock, m, room)
    }

    if (findRoom(m.sender)) {
      return sock.sendInteractiveButton(
        m.from,
        {
          body: `*Anda masih memiliki sesi menfes aktif.*

Selesaikan sesi sebelumnya sebelum membuat menfes baru.`,
          buttons: [{ type: 'reply', label: 'Hapus Sesi', id: '.menfes stop' }]
        },
        { quoted: m }
      )
    }

    if (!text || !text.includes('|')) {
      return m.reply(
        `*Cara Menfes*

Kirim menfes:
.menfes <nomor>|<pesan>
Contoh: .menfes 628xxx|Halo, kenalan yuk

Hentikan sesi:
.menfes stop

Bot akan menjadi perantara dan merahasiakan identitas pengirim.`
      )
    }

    const [number, ...message] = text.split('|')
    const pesan = message.join('|').trim()
    const target = number.replace(/\D/g, '') + '@s.whatsapp.net'

    if (!pesan) return m.reply('Pesan tidak boleh kosong.')
    if (target === m.sender) return m.reply('Tidak bisa mengirim menfes ke diri sendiri.')
    if (target === jidNormalizedUser(sock.user.id)) return m.reply('Tidak bisa mengirim menfes ke bot.')
    if (findRoom(target)) return m.reply('Orang tersebut sedang memiliki sesi menfes aktif.')

    let check
    try {
      check = await sock.onWhatsApp(target)
    } catch {
      check = []
    }
    if (!check?.length) return m.reply('Nomor tidak terdaftar di WhatsApp.')

    const id = 'menfes_' + Date.now()
    global.db.data.menfess[id] = {
      id,
      a: m.sender,
      b: target,
      status: 'WAITING'
    }

    try {
      await sock.sendInteractiveButton(target, {
        title: 'Ada seseorang mengirimkan menfes',
        body: `*Pesan Menfes:*

${pesan}

Balas pesan ini jika ingin terhubung.

*Catatan:*
Bot hanya sebagai perantara dan identitas pengirim tetap dirahasiakan.`,
        buttons: [{ type: 'reply', label: 'Tolak Menfes', id: '.menfes stop' }]
      })
    } catch {
      delete global.db.data.menfess[id]
      return m.reply('Gagal mengirim menfes.')
    }

    return m.reply(
      `*Menfes Berhasil Dikirim*

Pesan Anda sudah diteruskan ke penerima.
Tunggu balasan jika dia ingin terhubung.

Bot hanya sebagai perantara dan tidak mengetahui identitas kedua pihak.`
    )
  },

  onMessage: async (m, { sock }) => {
    if (!m || m.key?.fromMe || m.isGroup || !m.message) return false
    global.db.data.menfess ??= {}

    let room = Object.values(global.db.data.menfess).find(r => r.status === 'WAITING' && r.b === m.sender)
    if (room) {
      if (isCmd(m.body)) return false
      room.status = 'CHATTING'
      const info = `*MENFES TERSAMBUNG*

◦ Kirim teks, foto, video, audio, atau stiker
◦ Balas pesan untuk reply spesifik
◦ Tanda [📨] = pesan sudah sampai ke lawan chat

Ketik .menfes stop untuk mengakhiri sesi.`
      try {
        await sock.sendMessage(room.a, { text: info })
        await sock.sendMessage(room.b, { text: info })
      } catch {}
      try {
        await relay(sock, m, room, room.a)
        await sock.sendMessage(m.from, { react: { text: '📨', key: m.key } })
      } catch {}
      return true
    }

    room = Object.values(global.db.data.menfess).find(r => r.status === 'CHATTING' && [r.a, r.b].includes(m.sender))
    if (room) {
      if (isCmd(m.body)) return false
      const target = room.a === m.sender ? room.b : room.a
      try {
        await relay(sock, m, room, target)
        await sock.sendMessage(m.from, { react: { text: '📨', key: m.key } })
      } catch {}
      return true
    }

    return false
  }
}
