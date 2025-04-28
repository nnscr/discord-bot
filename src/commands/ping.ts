import { Command } from "@sapphire/framework"
import { Message, SendableChannels } from "discord.js"

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            aliases: ["pong"],
            description: "ping pong",
        })
    }

    public async messageRun(message: Message) {
        console.log("Ping command executed")
        const channel = message.channel as SendableChannels
        if (!channel.isSendable) {
            return
        }

        const msg = await channel.send("Ping?")

        const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${
            msg.createdTimestamp - message.createdTimestamp
        }ms.`

        return msg.edit(content)
    }
}
