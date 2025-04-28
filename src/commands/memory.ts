import { Command } from "@sapphire/framework"
import { Message } from "discord.js"
import { getMemory } from "../database"

export class MemoryCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "memory",
            description: "Show what the bot remembers about you",
        })
    }

    public override async messageRun(message: Message) {
        const history = getMemory(message.author.id)

        if (!history.length) {
            return message.reply("📭 Kein Plan wer du bist.")
        }

        const formatted = history
            .map(msg => {
                const prefix = msg.role === "user" ? "🧑‍💬" : "🤖"
                return `${prefix} ${msg.content}`
            })
            .slice(-6)
            .join("\n\n")

        return message.reply({
            content: `🧠 Das sind alle in Erinnerungen an dich in meinem kleinen Spatzenhirn:\n\n${formatted}`,
            allowedMentions: { repliedUser: false },
        })
    }
}
