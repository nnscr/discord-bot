import { Command } from "@sapphire/framework"
import { Message } from "discord.js"

export class HelCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: "Zeigt alle Befehle an",
        })
    }

    public override async messageRun(message: Message, args: any) {
        let help = "Hier sind die Befehle, die ich verstehe:\n"
        help += "`!help` - Zeigt diese Hilfe an\n"
        help += "`!clear <anzahl>` - Löscht deine letzten `<Anzahl>` Nachrichten\n"
        help += "`!ping` - Zeigt einfach nur meinen Ping an und prüft ob ich online bin\n"
        help += "\n\n"
        help += "Außerdem kannst du mich in Nachrichten erwähnen und mir damit auf die Nerven gehen\n"
        help += "Dafür kannst du auch die folgenden Befehle verwenden:\n"
        help += "`!forget` - Vergisst alle deine Nachrichten und löscht meine Erinnerungen an dich\n"
        help += "`!memory` - Zeigt meine Erinnerungen an dich an\n"

        await message.reply(help)
    }
}
