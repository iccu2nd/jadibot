import axios from 'axios'

async function deepai(prompt) {
    const chatHistory = JSON.stringify([{ role: 'user', content: prompt }])
    const payload = new URLSearchParams()
    payload.append('chat_style', 'chat')
    payload.append('chatHistory', chatHistory)

    const { data } = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', payload.toString(), {
        headers: {
            'api-key': 'tryit-84303483976-293520c15ccc5fada63d9e51c4639dbb',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
            Accept: '*/*',
            Origin: 'https://deepai.org',
            Referer: 'https://deepai.org/chat',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
    })

    return data
}

export default {
    cmd: ['ai'],
    category: 'main',
    run: async (m, { text }) => {
        if (!text) return m.reply('Mau nanya apa?\nContoh: .ai Apa itu logic?')

        try {
            const response = await deepai(text)
            if (!response) return m.reply('Gagal dapat jawaban, coba lagi.')

            await m.reply(response)
        } catch (e) {
            await m.reply('Gagal menghubungi AI, coba lagi nanti.')
            throw e
        }
    }
}
