import axios from 'axios'

const url = 'https://raw.githubusercontent.com/BochilTeam/database/master/kata-kata/truth.json'

export default {
    cmd: ['truth'],
    category: 'fun',
    run: async (m) => {
        try {
            const { data } = await axios.get(url)
            const result = data[Math.floor(Math.random() * data.length)]
            m.reply(result)
        } catch (e) {
            console.error(e)
            m.reply('Gagal mengambil data, coba lagi nanti.')
            throw e
        }
    }
}
