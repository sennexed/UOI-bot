import {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField
} from "discord.js";

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const APPLICATION_ID = process.env.APPLICATION_ID;
const GUILD_ID = process.env.GUILD_ID;
const BACKEND_URL = process.env.BACKEND_URL;

const INDIAN_ROLE = "1468475916656181338";
const FOREIGN_ROLE = "1467589863690862834";

let REQUEST_CHANNEL_ID = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

//
// 🔥 REGISTER COMMANDS CLEANLY
//
async function registerCommands() {

  const commands = [
    new SlashCommandBuilder()
      .setName("register")
      .setDescription("Apply for UOI ID"),

    new SlashCommandBuilder()
      .setName("requests")
      .setDescription("Set registration request channel")
      .addChannelOption(option =>
        option.setName("channel")
          .setDescription("Channel for requests")
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  // 🔥 Clear GLOBAL commands
  await rest.put(
    Routes.applicationCommands(APPLICATION_ID),
    { body: [] }
  );

  // 🔥 Clear GUILD commands
  await rest.put(
    Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
    { body: [] }
  );

  // 🔥 Register fresh GUILD commands
  await rest.put(
    Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands refreshed cleanly");
}

//
// 🚀 READY
//
client.once("clientReady", async () => {
  console.log("🤖 UOI Bot Online");
  await registerCommands();
});

//
// 🔹 INTERACTIONS
//
client.on("interactionCreate", async interaction => {

  // ---------------- REGISTER ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "register") {

    const modal = new ModalBuilder()
      .setCustomId("register_modal")
      .setTitle("UOI Registration");

    const nameInput = new TextInputBuilder()
      .setCustomId("full_name")
      .setLabel("Full Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const nationalityInput = new TextInputBuilder()
      .setCustomId("nationality")
      .setLabel("Nationality (Indian / NRI)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const passwordInput = new TextInputBuilder()
      .setCustomId("password")
      .setLabel("Password (exactly 6 characters)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(nationalityInput),
      new ActionRowBuilder().addComponents(passwordInput)
    );

    return interaction.showModal(modal);
  }

  // ---------------- SET REQUEST CHANNEL ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "requests") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "Admin only.", ephemeral: true });
    }

    REQUEST_CHANNEL_ID = interaction.options.getChannel("channel").id;

    return interaction.reply({ content: "✅ Request channel set.", ephemeral: true });
  }

  // ---------------- MODAL SUBMIT ----------------
  if (interaction.isModalSubmit() && interaction.customId === "register_modal") {

    const full_name = interaction.fields.getTextInputValue("full_name");
    const nationality = interaction.fields.getTextInputValue("nationality");
    const password = interaction.fields.getTextInputValue("password");

    if (password.length !== 6) {
      return interaction.reply({
        content: "Password must be exactly 6 characters.",
        ephemeral: true
      });
    }

    await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_id: interaction.user.id,
        full_name,
        nationality,
        password
      })
    });

    await interaction.reply({
      content: "Your request has been submitted. Please wait 1–2 business days.",
      ephemeral: true
    });

    if (!REQUEST_CHANNEL_ID) return;

    const requestChannel = interaction.guild.channels.cache.get(REQUEST_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("New Registration Request")
      .addFields(
        { name: "User", value: `<@${interaction.user.id}>` },
        { name: "Name", value: full_name },
        { name: "Nationality", value: nationality }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${interaction.user.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${interaction.user.id}`)
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger)
    );

    await requestChannel.send({ embeds: [embed], components: [row] });
  }

  // ---------------- BUTTON HANDLER ----------------
  if (interaction.isButton()) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "Admin only.", ephemeral: true });
    }

    const [action, discordId] = interaction.customId.split("_");

    if (action === "approve") {

      const response = await fetch(`${BACKEND_URL}/approve/${discordId}`, {
        method: "POST"
      });

      const data = await response.json();
      const member = await interaction.guild.members.fetch(discordId);

      const nationality = interaction.message.embeds[0].data.fields[2].value;

      if (nationality.toLowerCase() === "indian") {
        await member.roles.add(INDIAN_ROLE);
      } else {
        await member.roles.add(FOREIGN_ROLE);
      }

      await member.send(
        `Welcome to UOI!\nYour ID has been approved.\nYour UOI ID: ${data.user_id}`
      );

      await interaction.update({ content: "✅ Approved.", components: [] });
    }

    if (action === "reject") {
      await interaction.update({ content: "❌ Rejected.", components: [] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
