import { Listener } from "@sapphire/framework"
import { Message, TextChannel } from "discord.js"
import { OpenAI } from "openai"
import { readFileSync } from "fs"
import { getMemory, saveMemory } from "../database"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const systemPrompt = readFileSync("ai/system-prompt.md").toString()

const RATE_LIMIT = 20 // max messages per minute
const RATE_INTERVAL = 60_000 // in ms

type RateInfo = {
    tokens: number
    lastCheck: number
}

const rateLimits = new Map<string, RateInfo>()

export class ChatListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            name: "chat",
            event: "messageCreate",
        })
    }

    public override async run(message: Message) {
        // Ignore other bots
        if (message.author.bot) return

        if (!canSendMessage(message.author.id)) {
            await message.reply("🚫 Oha, mach mal bisschen langsamer. Ich kann nicht so schnell denken.")
            return
        }

        const isDM = message.channel.isDMBased()
        const isMention = message.mentions.has(message.client.user!.id)

        console.log("[ChatListener] Message received", {
            user: message.author.username,
            content: message.content,
            isDM,
            isMention,
        })

        // In DMs: respond to anything. In guilds: only respond if mentioned.
        if (!isDM && !isMention) return

        const displayName = message.inGuild()
            ? (message.member?.displayName ?? message.author.username)
            : message.author.username

        const prompt = `[${displayName}] sagt: ${message.content.trim()}`
        // const prompt = isDM ? message.content.trim() : message.content.replace(/<@!?(\d+)>/, "").trim()

        // if (!prompt) {
        //     await message.reply("You forgot to say something.")
        //     return
        // }

        const channel = message.channel as TextChannel
        await channel.sendTyping()

        try {
            const history = getMemory(message.author.id)
            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL ?? "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history, // previous messages
                    { role: "user", content: prompt },
                ],
            })

            const reply = response.choices[0]?.message.content
            const fixed = reply
                ?.replace(/(?<!<)@(\d{17,20})(?!>)/g, "<@$1>") // replace @id with actual mention
                .replace(/<<(@\d{17,20})>>/g, "<$1>") // and remove extra angle brackets because chatgpt is dumb
            if (reply && fixed) {
                console.log("[ChatListener] Reply", {
                    user: message.author.username,
                    prompt,
                    reply,
                    fixed,
                })
                await message.reply(fixed) // replace @id with actual mention
                saveMemory(message.author.id, [
                    ...history,
                    { role: "user", content: prompt },
                    { role: "assistant", content: reply },
                ])
            } else await message.reply("❌ Ich kann gerade nicht denken, mein Hirn ist nicht errreichbar.")
        } catch (error) {
            console.error("[ChatGPT error]", error)
            await message.reply("💥 Aua, mein Kopf ist explodiert. Ich kann gerade nicht denken.")
        }
    }
}

function canSendMessage(userId: string): boolean {
    const now = Date.now()
    const info = rateLimits.get(userId) ?? { tokens: RATE_LIMIT, lastCheck: now }

    const elapsed = now - info.lastCheck
    const tokensToAdd = (elapsed / RATE_INTERVAL) * RATE_LIMIT
    info.tokens = Math.min(RATE_LIMIT, info.tokens + tokensToAdd)
    info.lastCheck = now

    if (info.tokens < 1) {
        rateLimits.set(userId, info)
        return false
    }

    info.tokens -= 1
    rateLimits.set(userId, info)
    return true
}
