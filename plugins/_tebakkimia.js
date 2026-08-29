import axios from 'axios'
import { getPlugin } from '../lib/plugins.js'

const DATA_URL = 'https://raw.githubusercontent.com/reyzdesu/bot-assets/main/games/tebakkimia.json'
const TIMEOUT_MS = 120000
const REWARD = 500
const HINT_PENALTY = 0.7

const prefixes = ['.', '/', '#', '!']
const surrenderRegex = /^((me)?nyerah|surr?ender)$/i

function isCmd(body) {
  const prefix = prefixes.find(p => (body || '').startsWith(p))
  if (!prefix) return false
  const cmd = body.slice(prefix.length).trim().split(/ +/)[0]?.toLowerCase()
  return !!getPlugin(cmd)
}

function makeClue(answer) {
  const chars = answer.split('')
  return chars.map((ch, i) => (i === 0 ? ch : '_')).join(' ')
}

function endGame(sock, chat) {
  const game = sock.tebakkimia?.[chat]
  if (!game) return
  clearTimeout(game.timer)
  delete sock.tebakkimia[chat]
}

export default {
  cmd: ['tebakkimia', 'tkimia'],
  category: 'games',

  run: async (m, { sock, prefix, cmd }) => {
    sock.tebakkimia ??= {}

    if (cmd === 'tkimia') {
      const game = sock.tebakkimia[m.chat]
      if (!game) return m.reply(`Tidak ada soal yang sedang berlangsung di sini. Mulai dulu dengan *${prefix}tebakkimia*.`)

      let note = ''
      if (!game.hintUsed) {
        game.hintUsed = true
        game.reward = Math.max(1, Math.floor(game.reward * HINT_PENALTY))
        note = `\n\n_Petunjuk dipakai, hadiah berkurang jadi ${game.reward} Money._`
      }

      const clue = makeClue(game.soal.lambang)
      return m.reply('Petunjuk: ```' + clue + '```' + note + '\n\nBalas pesan soal untuk menjawab, bukan pesan ini.')
    }

    if (sock.tebakkimia[m.chat]) {
      return m.reply('Masih ada soal yang belum terjawab di chat ini. Balas pesan soal untuk menjawab, atau ketik *nyerah* untuk menyerah.')
    }

    let data
    try {
      const res = await axios.get(DATA_URL)
      data = res.data
    } catch (e) {
      console.error(e)
      return m.reply('Gagal mengambil soal, coba lagi nanti.')
    }
    if (!Array.isArray(data) || !data.length) return m.reply('Soal sedang tidak tersedia, coba lagi nanti.')

    const soal = data[Math.floor(Math.random() * data.length)]
    const reward = REWARD

    const caption = `*TEBAK KIMIA*

Sebutkan lambang unsur kimia dari:
*${soal.unsur}*

Waktu: ${(TIMEOUT_MS / 1000).toFixed(0)} detik. Balas pesan ini untuk menjawab.
Ketik *${prefix}tkimia* untuk melihat petunjuk.
Hadiah: ${reward} Money`.trim()

    const sent = await sock.sendMessage(m.chat, { text: caption }, { quoted: m })

    const timer = setTimeout(() => {
      if (sock.tebakkimia?.[m.chat]) {
        sock.sendMessage(m.chat, { text: `Waktu habis. Jawabannya adalah *${soal.lambang}*.` }, { quoted: sent }).catch(() => {})
        delete sock.tebakkimia[m.chat]
      }
    }, TIMEOUT_MS)

    sock.tebakkimia[m.chat] = { key: sent.key, soal, reward, timer }
  },

  onMessage: async (m, { sock }) => {
    if (!m || !m.message || m.key?.fromMe) return false

    const game = sock.tebakkimia?.[m.chat]
    if (!game) return false
    if (!m.quoted || m.quoted.id !== game.key.id) return false
    if (isCmd(m.body)) return false

    const guess = (m.body || '').toLowerCase().trim()
    if (!guess) return false

    if (surrenderRegex.test(guess)) {
      endGame(sock, m.chat)
      m.reply(`Baik, permainan diakhiri. Jawabannya adalah *${game.soal.lambang}*.`)
      return true
    }

    const jawaban = game.soal.lambang.toLowerCase().trim()

    if (guess === jawaban) {
      endGame(sock, m.chat)
      const user = global.db.data.users[m.sender]
      if (user) user.money = (user.money || 0) + game.reward
      m.reply(`*Jawaban benar!*\n+${game.reward} Money`)
    } else {
      m.reply('*Jawaban salah.*')
    }
    return true
  }
}
