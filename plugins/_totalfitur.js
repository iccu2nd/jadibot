import { plugins } from '../lib/plugins.js'

function groupByCategory() {
    const categories = {}
    for (const [, plugin] of plugins) {
        const name = plugin.category || 'others'
        categories[name] = categories[name] || []
        categories[name].push(plugin)
    }
    return categories
}

export default {
    cmd: ['totalfitur'],
    category: 'info',
    description: 'Cek total fitur bot per kategori',

    run: async (m, { config }) => {
        const categories = groupByCategory()
        const categoryNames = Object.keys(categories).sort()
        const totalCommands = Object.values(categories).flat().length

        const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

        let text = `*TOTAL FITUR*\n`

        text += categoryNames.map(name =>
            `- ${cap(name)} : ${categories[name].length}`
        ).join('\n')

        text += `\n\n*Total fitur* : ${totalCommands}\n*Total kategori* : ${categoryNames.length}`

        await m.reply(text)
    }
}
