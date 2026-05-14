/*
    ╔════════════════════════════════════════════════════════════════════════════════╗
    ║                                                                                ║
    ║                        LB.Dev Minecraft Discord Bot                            ║
    ║                                                                                ║
    ║    Developed by: CanBye                                                        ║
    ║    Version: 1.0.0                                                              ║
    ║    Discord: discord.gg/lbdev                                                   ║
    ║    Website: lb.dev                                                             ║
    ║                                                                                ║
    ║    © 2024 LB.Dev Community - Tüm hakları saklıdır.                           ║
    ║                                                                                ║
    ╚════════════════════════════════════════════════════════════════════════════════╝
*/

const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, REST, Routes } = require('discord.js');
const { Rcon } = require('rcon-client');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const config = require('./config.js');

moment.locale('tr');

// RCON İstemcisi
let rconClient = null;

// Veritabanı Yönetimi
class Database {
    constructor() {
        this.path = path.join(__dirname, 'database.json');
        this.data = {
            maintenance: { status: false, reason: '', startTime: null },
            announcements: { discord: [], minecraft: [] },
            logs: []
        };
        this.init();
    }

    async init() {
        try {
            const exists = await fs.access(this.path).then(() => true).catch(() => false);
            if (exists) {
                const fileContent = await fs.readFile(this.path, 'utf8');
                this.data = JSON.parse(fileContent);
            } else {
                await this.save();
            }
        } catch (error) {
            console.error('Veritabanı başlatma hatası:', error);
        }
    }

    async save() {
        try {
            await fs.writeFile(this.path, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            console.error('Veritabanı kaydetme hatası:', error);
            return false;
        }
    }

    get(key) {
        return this.data[key];
    }

    async set(key, value) {
        this.data[key] = value;
        return this.save();
    }

    async addAnnouncement(type, platform, message, author) {
        if (!this.data.announcements[platform]) {
            this.data.announcements[platform] = [];
        }

        const announcement = {
            type,
            message,
            author,
            timestamp: Date.now()
        };

        this.data.announcements[platform].unshift(announcement);
        
        if (this.data.announcements[platform].length > 10) {
            this.data.announcements[platform].pop();
        }

        await this.save();
        return announcement;
    }
}

// RCON Bağlantı Yöneticisi
class RconManager {
    static async connect() {
        try {
            console.log('🔌 RCON bağlantısı kuruluyor...');
            rconClient = await Rcon.connect({
                host: config.rcon.host,
                port: config.rcon.port,
                password: config.rcon.password,
                timeout: 5000
            });
            console.log('✅ RCON bağlantısı başarılı!');
            return true;
        } catch (error) {
            console.error('❌ RCON bağlantı hatası:', error.message);
            return false;
        }
    }

    static async sendCommand(command) {
        if (!rconClient) return null;
        try {
            return await rconClient.send(command);
        } catch (error) {
            console.error('RCON komut hatası:', error);
            return null;
        }
    }

    static async getPlayerCount() {
        const response = await this.sendCommand('list');
        const match = response?.match(/There are (\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
}

// Discord Bot İstemcisi
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Veritabanı örneği
const db = new Database();
// Durum Güncelleme Sistemi
async function updateStatus() {
    try {
        const playerCount = await RconManager.getPlayerCount();
        const maintenance = db.get('maintenance');

        if (maintenance?.status) {
            client.user.setPresence({
                activities: [{ 
                    name: `${config.style.emojis.maintenance} Bakım Modu | ${maintenance.reason}`,
                    type: ActivityType.PLAYING 
                }],
                status: 'dnd'
            });

            const channel = await client.channels.fetch(config.channels.maintenance);
            if (channel) {
                await channel.setName(config.style.channelNames.maintenance.active);
            }
        } else {
            client.user.setPresence({
                activities: [{ 
                    name: `${playerCount}/${config.server.maxPlayers} Online | ${config.server.ip}`,
                    type: ActivityType.WATCHING 
                }],
                status: 'online'
            });

            const channel = await client.channels.fetch(config.channels.maintenance);
            if (channel) {
                await channel.setName(config.style.channelNames.maintenance.inactive);
            }
        }
    } catch (error) {
        console.error('Durum güncelleme hatası:', error);
    }
}

// Komut Tanımlamaları
const commands = [
    {
        name: 'discord-duyuru',
        description: '📱 Discord sunucusuna duyuru yapar',
        options: [
            {
                name: 'mesaj',
                description: 'Duyuru mesajı',
                type: 3,
                required: true
            },
            {
                name: 'tip',
                description: 'Duyuru tipi',
                type: 3,
                choices: [
                    { name: '📢 Normal', value: 'normal' },
                    { name: '⚠️ Uyarı', value: 'warning' },
                    { name: '🚨 Önemli', value: 'important' }
                ]
            }
        ]
    },
    {
        name: 'mc-duyuru',
        description: '🎮 Minecraft sunucusuna duyuru yapar',
        options: [
            {
                name: 'mesaj',
                description: 'Duyuru mesajı',
                type: 3,
                required: true
            },
            {
                name: 'tip',
                description: 'Duyuru tipi',
                type: 3,
                choices: [
                    { name: '📢 Normal', value: 'normal' },
                    { name: '⚠️ Uyarı', value: 'warning' },
                    { name: '🚨 Önemli', value: 'important' }
                ]
            }
        ]
    },
    {
        name: 'bakim',
        description: '🔧 Bakım modu yönetimi',
        options: [
            {
                name: 'ac',
                description: '⚡ Bakım modunu aktifleştirir',
                type: 1,
                options: [
                    {
                        name: 'sebep',
                        description: 'Bakım sebebi',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'kapat',
                description: '✨ Bakım modunu kapatır',
                type: 1
            }
        ]
    },
    {
        name: 'whitelist',
        description: '📝 Whitelist yönetimi',
        options: [
            {
                name: 'ekle',
                description: '➕ Whitelist\'e oyuncu ekler',
                type: 1,
                options: [
                    {
                        name: 'oyuncu',
                        description: 'Eklenecek oyuncunun adı',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'cikar',
                description: '➖ Whitelist\'ten oyuncu çıkarır',
                type: 1,
                options: [
                    {
                        name: 'oyuncu',
                        description: 'Çıkarılacak oyuncunun adı',
                        type: 3,
                        required: true
                    }
                ]
            }
        ]
    },
    {
        name: 'ban',
        description: '🔨 Oyuncuyu sunucudan yasaklar',
        options: [
            {
                name: 'oyuncu',
                description: 'Yasaklanacak oyuncunun adı',
                type: 3,
                required: true
            },
            {
                name: 'sebep',
                description: 'Yasaklama sebebi',
                type: 3,
                required: false
            }
        ]
    },
    {
        name: 'kick',
        description: '👢 Oyuncuyu sunucudan atar',
        options: [
            {
                name: 'oyuncu',
                description: 'Atılacak oyuncunun adı',
                type: 3,
                required: true
            },
            {
                name: 'sebep',
                description: 'Atılma sebebi',
                type: 3,
                required: false
            }
        ]
    }
];

// Komut Kayıt Sistemi
async function registerCommands() {
    try {
        console.log('📝 Komutlar yükleniyor...');
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );
        console.log('✅ Komutlar başarıyla yüklendi!');
    } catch (error) {
        console.error('❌ Komut yükleme hatası:', error);
    }
}
// Komut İşleme Sistemi
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    try {
        // Yetki kontrolü
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(config.style.colors.error)
                .setDescription(`${config.style.emojis.error} Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!`)
                .setTimestamp();
            
            return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        switch (interaction.commandName) {
            case 'discord-duyuru': {
                const message = interaction.options.getString('mesaj');
                const type = interaction.options.getString('tip') || 'normal';
                
                let color = config.style.colors.announcement.discord;
                let prefix = '📢 DUYURU';
                
                switch (type) {
                    case 'warning':
                        color = config.style.colors.announcement.warning;
                        prefix = '⚠️ UYARI';
                        break;
                    case 'important':
                        color = config.style.colors.announcement.important;
                        prefix = '🚨 ÖNEMLİ DUYURU';
                        break;
                }

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: prefix, iconURL: interaction.guild.iconURL() })
                    .setDescription(message)
                    .addFields({ name: `${config.style.emojis.time} Zaman`, value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
                    .setFooter({ text: `${interaction.user.tag} tarafından gönderildi` })
                    .setTimestamp();

                const channel = await client.channels.fetch(config.channels.announcements);
                await channel.send({ embeds: [embed] });
                
                await interaction.reply({ 
                    content: `${config.style.emojis.success} Duyuru başarıyla gönderildi!`,
                    ephemeral: true 
                });

                await db.addAnnouncement(type, 'discord', message, interaction.user.tag);
                break;
            }

            case 'mc-duyuru': {
                if (!rconClient) {
                    return interaction.reply({
                        content: `${config.style.emojis.error} RCON bağlantısı kurulamadı!`,
                        ephemeral: true
                    });
                }

                const message = interaction.options.getString('mesaj');
                const type = interaction.options.getString('tip') || 'normal';
                
                let prefix = '📢 DUYURU';
                let color = config.style.colors.announcement.minecraft;
                
                switch (type) {
                    case 'warning':
                        prefix = '⚠️ UYARI';
                        color = config.style.colors.announcement.warning;
                        break;
                    case 'important':
                        prefix = '🚨 ÖNEMLİ';
                        color = config.style.colors.announcement.important;
                        break;
                }

                await RconManager.sendCommand(`say ${prefix} > ${message}`);
                
                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: 'Minecraft Duyurusu', iconURL: interaction.guild.iconURL() })
                    .addFields(
                        { name: 'Tip', value: prefix, inline: true },
                        { name: 'Mesaj', value: message, inline: true },
                        { name: `${config.style.emojis.time} Zaman`, value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    )
                    .setFooter({ text: `${interaction.user.tag} tarafından gönderildi` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                await db.addAnnouncement(type, 'minecraft', message, interaction.user.tag);
                break;
            }

            case 'bakim': {
                const subcommand = interaction.options.getSubcommand();
                
                if (subcommand === 'ac') {
                    const reason = interaction.options.getString('sebep');
                    
                    await db.set('maintenance', {
                        status: true,
                        reason: reason,
                        startTime: Date.now()
                    });

                    if (rconClient) {
                        await RconManager.sendCommand(`say ${config.style.emojis.warning} SUNUCU BAKIMA ALINIYOR!`);
                        await RconManager.sendCommand(`say ${config.style.emojis.info} Sebep: ${reason}`);
                        await RconManager.sendCommand('save-all');
                        await RconManager.sendCommand('whitelist on');
                        
                        const response = await RconManager.sendCommand('list');
                        const players = response.match(/online: (.+)/);
                        if (players && players[1]) {
                            const playerList = players[1].split(', ');
                            for (const player of playerList) {
                                await RconManager.sendCommand(`kick ${player} §c§lSunucu bakıma alınıyor!\n\n§7Sebep: §f${reason}`);
                            }
                        }
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(config.style.colors.maintenance)
                        .setTitle(`${config.style.emojis.maintenance} Sunucu Bakım Moduna Alındı`)
                        .addFields(
                            { name: `${config.style.emojis.info} Sebep`, value: reason },
                            { name: `${config.style.emojis.time} Başlangıç`, value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
                            { name: `${config.style.emojis.settings} Yapılan İşlemler`, value: '```\n• Tüm oyuncular atıldı\n• Whitelist aktifleştirildi\n• Sunucu kaydedildi\n• Bakım modu açıldı```' }
                        )
                        .setFooter({ text: `${interaction.user.tag} tarafından aktifleştirildi` })
                        .setTimestamp();
                    
                    const channel = await client.channels.fetch(config.channels.announcements);
                    await channel.send({ embeds: [embed] });
                    await interaction.reply({ content: `${config.style.emojis.success} Bakım modu başarıyla aktifleştirildi!`, ephemeral: true });
                    
                    updateStatus();
                }
                else if (subcommand === 'kapat') {
                    await db.set('maintenance', {
                        status: false,
                        reason: '',
                        startTime: null
                    });
                    
                    if (rconClient) {
                        await RconManager.sendCommand(`say ${config.style.emojis.success} Bakım modu sona erdi! Sunucu tekrar aktif!`);
                        await RconManager.sendCommand('whitelist off');
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(config.style.colors.success)
                        .setTitle(`${config.style.emojis.success} Bakım Modu Kapatıldı`)
                        .addFields(
                            { name: `${config.style.emojis.time} Bitiş`, value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
                            { name: `${config.style.emojis.settings} Yapılan İşlemler`, value: '```\n• Whitelist kapatıldı\n• Bakım modu kapatıldı\n• Sunucu aktif```' }
                        )
                        .setFooter({ text: `${interaction.user.tag} tarafından kapatıldı` })
                        .setTimestamp();
                    
                    const channel = await client.channels.fetch(config.channels.announcements);
                    await channel.send({ embeds: [embed] });
                    await interaction.reply({ content: `${config.style.emojis.success} Bakım modu başarıyla kapatıldı!`, ephemeral: true });
                    
                    updateStatus();
                }
                break;
            }

            case 'whitelist': {
                if (!rconClient) {
                    return interaction.reply({
                        content: `${config.style.emojis.error} RCON bağlantısı kurulamadı!`,
                        ephemeral: true
                    });
                }

                const subcommand = interaction.options.getSubcommand();
                const player = interaction.options.getString('oyuncu');
                
                if (subcommand === 'ekle') {
                    await RconManager.sendCommand(`whitelist add ${player}`);
                    
                    const embed = new EmbedBuilder()
                        .setColor(config.style.colors.success)
                        .setDescription(`${config.style.emojis.success} \`${player}\` whitelist'e eklendi!`)
                        .setFooter({ text: `${interaction.user.tag} tarafından eklendi` })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                }
                else if (subcommand === 'cikar') {
                    await RconManager.sendCommand(`whitelist remove ${player}`);
                    
                    const embed = new EmbedBuilder()
                        .setColor(config.style.colors.error)
                        .setDescription(`${config.style.emojis.error} \`${player}\` whitelist'ten çıkarıldı!`)
                        .setFooter({ text: `${interaction.user.tag} tarafından çıkarıldı` })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                }
                break;
            }

            case 'ban': {
                if (!rconClient) return;
                const player = interaction.options.getString('oyuncu');
                const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
                
                await RconManager.sendCommand(`ban ${player} ${reason}`);
                
                const embed = new EmbedBuilder()
                    .setColor(config.style.colors.error)
                    .setTitle(`${config.style.emojis.ban} Oyuncu Yasaklandı`)
                    .addFields(
                        { name: 'Oyuncu', value: `\`${player}\``, inline: true },
                        { name: 'Sebep', value: reason, inline: true }
                    )
                    .setFooter({ text: `${interaction.user.tag} tarafından yasaklandı` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'kick': {
                if (!rconClient) return;
                const player = interaction.options.getString('oyuncu');
                const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
                
                await RconManager.sendCommand(`kick ${player} ${reason}`);
                
                const embed = new EmbedBuilder()
                    .setColor(config.style.colors.warning)
                    .setTitle(`${config.style.emojis.kick} Oyuncu Atıldı`)
                    .addFields(
                        { name: 'Oyuncu', value: `\`${player}\``, inline: true },
                        { name: 'Sebep', value: reason, inline: true }
                    )
                    .setFooter({ text: `${interaction.user.tag} tarafından atıldı` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    } catch (error) {
        console.error('Komut çalıştırma hatası:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.style.colors.error)
            .setDescription(`${config.style.emojis.error} Bir hata oluştu! Lütfen daha sonra tekrar deneyin.`)
            .setTimestamp();
        
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch {}
    }
});

// Bot Hazır
client.on('ready', async () => {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║                LB.Dev Bot System                ║`);
    console.log(`╠════════════════════════════════════════════════╣`);
    console.log(`║ Bot: ${client.user.tag}`);
    console.log(`║ Durum: Online`);
    console.log(`║ Ping: ${client.ws.ping}ms`);
    console.log(`╚════════════════════════════════════════════════╝\n`);
    
    await registerCommands();
    await RconManager.connect();
    await updateStatus();
    setInterval(updateStatus, 60000);
});

// Hata Yakalama
client.on('error', error => {
    console.error('❌ Bot hatası:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ İşlenmeyen hata:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Beklenmeyen hata:', error);
});

// Botu Başlat
client.login(config.token).catch(error => {
    console.error('❌ Giriş hatası:', error);
});