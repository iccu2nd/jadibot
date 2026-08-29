import { spawn } from 'child_process'

export default {
    cmd: ['restart'],
    category: 'owner',
    run: async (m, { sock }) => {
        if (!m.isOwner) return m.reply('Hanya owner bot yang dapat menggunakan perintah ini.')

        await m.reply('Merestart bot...')

        setTimeout(() => {
            const child = spawn(process.argv[0], process.argv.slice(1), {
                cwd: process.cwd(),
                detached: true,
                stdio: 'inherit'
            })
            child.unref()
            process.exit(0)
        }, 1000)
    }
}
