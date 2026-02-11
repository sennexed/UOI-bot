import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const APPLICATION_ID = "1470853260591108256";
const GUILD_ID = "1467485915374162025";

// Leave null for testing (no role restriction)
const IDENTITY_ROLE_ID = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function hasIdentityRole(member) {
  if (!IDENTITY_ROLE_ID) return true;
  return member.roles.cache.has(IDENTITY_ROLE_ID);
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("login")
      .setDescription("Login to UOI")
      .addStringOption(option =>
        option.setName("username")
          .setDescription("Your username")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("password")
          .setDescription("Your password")
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName("info")
      .setDescription("Get user ID info")
      .addUserOption(option =>
        option.setName("user")
          .setDescription("User to check")
          .setRequired(true))
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (error) {
    console.error(error);
  }
}

client.once("ready", async () => {
  console.log("UOI Identity Bot Online");
  await registerCommands();
});

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  if (!hasIdentityRole(interaction.member)) {
    return interaction.reply({ content: "Unauthorized", ephemeral: true });
  }

  if (interaction.commandName === "login") {

    const res = await fetch("http://localhost:8080/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: interaction.options.getString("username"),
        password: interaction.options.getString("password")
      })
    });

    if (!res.ok) {
      return interaction.reply({ content: "Login failed", ephemeral: true });
    }

    await fetch("http://localhost:8080/link-discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: interaction.options.getString("username"),
        discord_id: interaction.user.id
      })
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("myid")
        .setLabel("My ID")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("logout")
        .setLabel("Logout")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content: "Logged in successfully.",
      components: [row],
      ephemeral: true
    });
  }

  if (interaction.commandName === "info") {

    const user = interaction.options.getUser("user");

    const res = await fetch("http://localhost:8080/myid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord_id: user.id })
    });

    if (!res.ok) return interaction.reply("No ID found.");

    const data = await res.json();

    const card = new EmbedBuilder()
      .setTitle("UOI IDENTIFICATION CARD")
      .addFields(
        { name: "UOI ID", value: data.user_id, inline: true },
        { name: "Username", value: data.username, inline: true },
        { name: "Role", value: data.role, inline: true },
        { name: "Status", value: data.status, inline: true }
      );

    return interaction.reply({ embeds: [card] });
  }

});

client.login(process.env.DISCORD_TOKEN);
