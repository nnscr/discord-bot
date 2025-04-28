import { Command } from "@sapphire/framework"
import { Message } from "discord.js"
import { clearMemory } from "../database"

export class ForgetCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "forget",
            description: "Vergisse den aktuellen Nutzer",
        })
    }

    public override async messageRun(message: Message, args: any) {
        clearMemory(message.author.id)
        message.reply("🧹 Ich habe alle deine Nachrichten gelöscht.")
    }
}
