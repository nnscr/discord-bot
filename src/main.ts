import { SapphireClient } from "@sapphire/framework"
import { GatewayIntentBits, Partials } from "discord.js"

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel], // 👈 Needed to receive DMs (because DM channels are partials)

    loadMessageCommandListeners: true,
    defaultPrefix: "!",
})

client.login(process.env.DISCORD_TOKEN)
