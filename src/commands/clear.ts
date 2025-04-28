import { Command } from "@sapphire/framework"
import { Message, TextChannel } from "discord.js"

export class DeleteUserMessagesCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "clear",
            description: "aufräumen",
        })
    }

    public override async messageRun(message: Message, args: any) {
        const targetUser = await args.pick("user").catch(() => message.author)
        const count = await args.pick("integer")

        const isSelf = targetUser.id === message.author.id
        // Check if author is allowed to delete someone else's messages
        if (!isSelf && !message.member?.permissions.has("ManageMessages")) {
            return message.reply("❌ Nice try, aber du kannst nur deine eigenen Nachrichten löschen.")
        }

        await deleteLastMessagesFromUser(message, targetUser.id, count)
    }
}

async function deleteLastMessagesFromUser(message: Message, userId: string, count: number) {
    if (!message.guild) return

    // Narrow to TextChannel
    const channel = message.channel
    if (!channel.isTextBased() || channel.isDMBased() || !("bulkDelete" in channel)) {
        await message.reply("❌ Dat geht hier nicht, sorry.")
        return
    }

    // TypeScript now knows it's a TextChannel
    const textChannel = channel as TextChannel

    // Fetch messages
    const fetched = await textChannel.messages.fetch({ limit: 100 })

    // Filter and slice to desired count
    const userMessages = fetched.filter(msg => msg.author.id === userId).first(count)

    if (!userMessages.length) {
        await textChannel.send("❌ Hier gibs keine Nachrichten von diesem User.")
        return
    }

    await textChannel.bulkDelete(userMessages, true)

    // await textChannel.send(`🧹 Ich habe ${userMessages.length} Nachrichten von <@${userId}> gelöscht.`)
}
