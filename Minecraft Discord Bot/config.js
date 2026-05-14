module.exports = {
    token: '',
    clientId: '',
    guildId: '',
    channels: {
        maintenance: '',
        announcements: ''
    },
    server: {
        name: "⭐ MonicaProject",
        ip: "donutsmp.net",
        version: "1.20.1",
        maxPlayers: 100,
        gamemode: "Survival",
        difficulty: "Hard"
    },
    rcon: {
        host: 'localhost',
        port: 25575,
        password: 'RCON_SIFRE'
    },
    style: {
        colors: {
            primary: '#2ecc71',
            success: '#27ae60',
            warning: '#f1c40f',
            error: '#e74c3c',
            info: '#3498db',
            maintenance: '#e67e22',
            special: '#9b59b6',
            announcement: {
                discord: '#5865F2',
                minecraft: '#2ecc71',
                warning: '#e67e22',
                important: '#e74c3c'
            }
        },
        emojis: {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            maintenance: '🔧',
            online: '🟢',
            offline: '🔴',
            player: '👤',
            server: '🖥️',
            settings: '⚙️',
            announcement: '📢',
            discord: '📱',
            minecraft: '🎮',
            ban: '🔨',
            kick: '👢',
            whitelist: '📝',
            performance: '📊',
            star: '⭐',
            time: '⏰',
            dev: '👨‍💻'
        },
        channelNames: {
            maintenance: {
                active: '🔧│Bakım Modu',
                inactive: '🌟│Sunucu Aktif'
            }
        }
    },
    security: {
        commandCooldown: 5000,
        maxLogs: 1000,
        allowedRoles: ['Admin', 'Moderator'],
        debugMode: false
    }
};