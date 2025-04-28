import { ApplicationCommandRegistry, Command } from "@sapphire/framework"
import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ActivityType,
    SlashCommandBuilder,
    InteractionType,
    MessageFlags,
} from "discord.js"

export class SetActivityCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "setactivity",
        })
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        const builder = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription("Set the bot’s status text and activity type")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt
                    .setName("type")
                    .setDescription("Activity type")
                    .setRequired(true)
                    .addChoices(
                        { name: "Playing", value: "Playing" },
                        { name: "Watching", value: "Watching" },
                        { name: "Listening", value: "Listening" },
                        { name: "Competing", value: "Competing" },
                    ),
            )
            .addStringOption(opt =>
                opt.setName("text").setDescription("What should the bot display?").setRequired(true),
            )

        // Register globally (can use .registerChatInputCommand(builder, { guildIds: [...] }) for test servers)
        registry.registerChatInputCommand(builder, { guildIds: ["1203496738816524371"] })
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        const text = interaction.options.getString("text", true)
        const typeStr = interaction.options.getString("type") ?? "Playing"

        const typeMap: Record<string, ActivityType> = {
            Playing: ActivityType.Playing,
            Watching: ActivityType.Watching,
            Listening: ActivityType.Listening,
            Competing: ActivityType.Competing,
        }

        const activityType = typeMap[typeStr] ?? ActivityType.Playing

        interaction.client.user?.setPresence({
            activities: [{ name: text, type: activityType }],
            status: "online",
        })

        await interaction.reply({
            content: `✅ Activity set to **${typeStr}**: "${text}"`,
            flags: [MessageFlags.Ephemeral],
        })
    }
}
