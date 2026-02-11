import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const IDENTITY_ROLE_ID = "PUT_ROLE_ID_HERE";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function hasIdentityRole(member) {
  return member.roles.cache.has(IDENTITY_ROLE_ID);
}

client.once("ready", () => {
  console.log("UOI Identity Bot Online");
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "login") {
      if (!hasIdentityRole(interaction.member)) {
        return interaction.reply({ content: "Unauthorized", ephemeral: true });
      }

      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: interaction.options.getString("username"),
          password: interaction.options.getString("password")
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return interaction.reply({ content: "Login failed", ephemeral: true });
      }

      await fetch("http://localhost:5000/link-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: interaction.options.getString("username"),
          discord_id: interaction.user.id
        })
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("myid").setLabel("My ID").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("logout").setLabel("Logout").setStyle(ButtonStyle.Danger)
      );

      interaction.reply({ content: "Logged in", components: [row], ephemeral: true });
    }

    if (interaction.commandName === "info") {
      if (!hasIdentityRole(interaction.member)) {
        return interaction.reply({ content: "Unauthorized", ephemeral: true });
      }

      const user = interaction.options.getUser("user");

      const res = await fetch("http://localhost:5000/myid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_id: user.id })
      });

      const data = await res.json();
      if (!res.ok) return interaction.reply("No ID");

      const card = new EmbedBuilder()
        .setTitle("UOI IDENTIFICATION CARD")
        .addFields(
          { name: "UOI ID", value: data.user_id, inline: true },
          { name: "Username", value: data.username, inline: true },
          { name: "Role", value: data.role, inline: true },
          { name: "Status", value: data.status, inline: true }
        );

      interaction.reply({ embeds: [card] });
    }
  }

  if (interaction.isButton()) {
    if (!hasIdentityRole(interaction.member)) {
      return interaction.reply({ content: "Unauthorized", ephemeral: true });
    }

    if (interaction.customId === "myid") {
      const res = await fetch("http://localhost:5000/myid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_id: interaction.user.id })
      });

      const data = await res.json();
      if (!res.ok) return interaction.reply("No ID");

      const card = new EmbedBuilder()
        .setTitle("UOI IDENTIFICATION CARD")
        .addFields(
          { name: "UOI ID", value: data.user_id, inline: true },
          { name: "Username", value: data.username, inline: true },
          { name: "Role", value: data.role, inline: true },
          { name: "Status", value: data.status, inline: true }
        );

      interaction.reply({ embeds: [card], ephemeral: true });
    }

    if (interaction.customId === "logout") {
      interaction.reply({ content: "Logged out", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
