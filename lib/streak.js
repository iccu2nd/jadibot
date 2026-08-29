let cachedToday = null
let cachedTodayAt = 0

function todayJakarta() {
    const now = Date.now()
    if (!cachedToday || now - cachedTodayAt > 60000) {
        cachedToday = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        cachedTodayAt = now
    }
    return cachedToday
}

function yesterdayJakarta() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function updateStreak(user) {
    const today = todayJakarta()
    if (user.lastStreakDate === today) return { updated: false }

    const continuing = !user.lastStreakDate || user.lastStreakDate === yesterdayJakarta()
    user.streak = continuing ? (user.streak || 0) + 1 : 1
    user.lastStreakDate = today

    return { updated: true }
}

export function checkBrokenStreaks(users) {
    const today = todayJakarta()
    const yesterday = yesterdayJakarta()

    const broken = []
    for (const jid of Object.keys(users)) {
        const user = users[jid]
        if (!user.streak || user.streak < 3) continue
        if (user.lastStreakDate === today || user.lastStreakDate === yesterday) continue

        broken.push({ jid, streak: user.streak, name: user.name })
        user.streak = 0
        user.lastStreakDate = ''
    }
    return broken
}
