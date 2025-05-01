import { Listener } from "@sapphire/framework"
import { Message, TextChannel } from "discord.js"
import { readFileSync } from "fs"
import { OpenAI } from "openai"
import { getMemory, saveMemory } from "../database"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const RATE_LIMIT = 20 // max messages per minute
const RATE_INTERVAL = 60_000 // in ms

type RateInfo = {
    tokens: number
    lastCheck: number
}

const rateLimits = new Map<string, RateInfo>()

export function getMessageMemoryIdentifier(message: Message): string {
    return message.channel.isDMBased() ? message.author.id : message.channelId
}

export class ChatListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            name: "chat",
            event: "messageCreate",
        })
    }

    public override async run(message: Message) {
        const channelName = message.channel instanceof TextChannel ? message.channel.name : null

        // Ignore messages not in the "test" channel
        if (process.env.TEST_MODE && channelName !== "test") {
            console.log("[ChatListener] Ignoring message in channel", { channelName })
            return
        }

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

        const userIdPart = message.author.id ? ` <@${message.author.id}>` : ""
        let prompt = `[${displayName}]${userIdPart} sagt: ${message.content.trim()}`

        // If the message is a reply, include the referenced message's content
        if (message.reference?.messageId) {
            try {
                const referencedMessage = await message.channel.messages.fetch(message.reference.messageId)
                const referencedDisplayName = referencedMessage.inGuild()
                    ? (referencedMessage.member?.displayName ?? referencedMessage.author.username)
                    : referencedMessage.author.username
                const referencedUserIdPart = referencedMessage.author.id ? ` <@${referencedMessage.author.id}>` : ""
                prompt = `Bezieht sich auf Nachricht von [${referencedDisplayName}]${referencedUserIdPart}: ${referencedMessage.content.trim()}\n${prompt}`
            } catch (error) {
                console.error("[ChatListener] Error fetching referenced message:", error)
            }
        }

        const channel = message.channel as TextChannel
        await channel.sendTyping()

        const memoryIdentifier = getMessageMemoryIdentifier(message)

        try {
            const history = getMemory(memoryIdentifier)
            const systemPrompt = readFileSync("ai/system-prompt.md").toString()

            // Prepare messages array
            const messages: any[] = [
                { role: "system", content: systemPrompt },
                ...history, // previous messages
            ]

            // Handle image attachments
            if (message.attachments.size > 0) {
                const imageUrls = message.attachments
                    .filter(attachment => attachment.contentType?.startsWith("image/"))
                    .map(attachment => attachment.url)

                if (imageUrls.length > 0) {
                    // Add image content to the prompt
                    console.log("[ChatListener] Found image attachments:", imageUrls)
                    const imageContent = imageUrls.map(url => ({
                        type: "image_url",
                        image_url: {
                            url: url,
                        },
                    }))

                    messages.push({
                        role: "user",
                        content: [{ type: "text", text: prompt }, ...imageContent],
                    })
                } else {
                    messages.push({ role: "user", content: prompt })
                }
            } else {
                messages.push({ role: "user", content: prompt })
            }

            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL ?? "gpt-4-vision-preview",
                messages: messages,
                max_tokens: 1000,
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

                if (process.env.TEST_MODE) {
                    await message.reply(fixed + "[v2]")
                } else {
                    await message.reply(fixed)
                }

                saveMemory(memoryIdentifier, [
                    ...history,
                    { role: "user", content: prompt },
                    { role: "assistant", content: fixed },
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
