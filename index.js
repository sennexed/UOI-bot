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

const INDIAN_ROLE = "1468475916656181338";
const FOREIGN_ROLE = "1467589863690862834";

let REQUEST_CHANNEL_ID = null;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

//
// 🔹 Register Guild Commands ONLY (no global)
//
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("register")
      .setDescription("Apply for UOI ID"),

    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Check your registration status"),

    new SlashCommandBuilder()
      .setName("card")
      .setDescription("Get your UOI ID card"),

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

  // 🔥 Clear ONLY guild commands
  await rest.put(
    Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
    { body: [] }
  );

  // 🔥 Register fresh commands
  await rest.put(
    Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Commands registered cleanly.");
}

client.once("ready", async () => {
  console.log("🤖 Bot Online");
  await registerCommands();
});

//
// 🔹 Interaction Handler
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
      .setLabel("Password (6 characters)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(nationalityInput),
      new ActionRowBuilder().addComponents(passwordInput)
    );

    return interaction.showModal(modal);
  }

  // ---------------- STATUS ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "status") {

    await interaction.deferReply({ ephemeral: true });

    const response = await fetch(
      `${process.env.BACKEND_URL}/status/${interaction.user.id}`
    );

    if (!response.ok) {
      return interaction.editReply("Not registered.");
    }

    const data = await response.json();
    return interaction.editReply(`Your status: **${data.status}**`);
  }

  // ---------------- CARD ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "card") {

    await interaction.deferReply();

    const response = await fetch(
      `${process.env.BACKEND_URL}/card/${interaction.user.id}?avatar=${interaction.user.displayAvatarURL({ extension: "png", size: 256 })}`
    );

    if (!response.ok) {
      return interaction.editReply("Card not available.");
    }

    const buffer = await response.arrayBuffer();

    return interaction.editReply({
      files: [{ attachment: Buffer.from(buffer), name: "uoi-card.png" }]
    });
  }

  // ---------------- SET REQUEST CHANNEL ----------------
  if (interaction.isChatInputCommand() && interaction.commandName === "requests") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "Admin only.", ephemeral: true });
    }

    REQUEST_CHANNEL_ID = interaction.options.getChannel("channel").id;

    return interaction.reply({ content: "Request channel set.", ephemeral: true });
  }

  // ---------------- MODAL SUBMIT ----------------
  if (interaction.isModalSubmit() && interaction.customId === "register_modal") {

    const full_name = interaction.fields.getTextInputValue("full_name");
    const nationality = interaction.fields.getTextInputValue("nationality");
    const password = interaction.fields.getTextInputValue("password");

    if (password.length !== 6) {
      return interaction.reply({ content: "Password must be exactly 6 characters.", ephemeral: true });
    }

    await fetch(`${process.env.BACKEND_URL}/register`, {
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
      content: "Request submitted.",
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

    requestChannel.send({ embeds: [embed], components: [row] });
  }

  // ---------------- BUTTONS ----------------
  if (interaction.isButton()) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "Admin only.", ephemeral: true });
    }

    const [action, discordId] = interaction.customId.split("_");

    if (action === "approve") {

      const response = await fetch(`${process.env.BACKEND_URL}/approve/${discordId}`, {
        method: "POST"
      });

      const data = await response.json();
      const member = await interaction.guild.members.fetch(discordId);

      await member.roles.add(INDIAN_ROLE);
      await member.send(`Your UOI ID has been approved.\nID: ${data.user_id}`);

      return interaction.update({ content: "Approved.", components: [] });
    }

    if (action === "reject") {
      return interaction.update({ content: "Rejected.", components: [] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
