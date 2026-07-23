"use server";

import { Telegraf } from "telegraf";
import { writeFile } from "fs/promises";
import path from "path";
import { AIDolekGenerator } from "../../mini-services/ai-dolek";

// Konfiguracja bota
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const AVATAR_DIR = path.join(process.cwd(), "avatars");

// Obsługa komendy /start
bot.start((ctx) => {
  ctx.reply(
    "👋 Witaj w AIDolek!\n" +
    "Dostępne komendy:\n" +
    "/set_avatar - Ustaw awatar AI (wyślij zdjęcie)\n" +
    "/generate - Wygeneruj treść z wybranym awatarem"
  );
});

// Obsługa komendy /set_avatar
bot.command("set_avatar", async (ctx) => {
  ctx.reply("📸 Wyślij zdjęcie, które chcesz ustawić jako awatar AI.");
});

// Obsługa wysyłanych zdjęć (po /set_avatar)
bot.on("photo", async (ctx) => {
  const photo = ctx.message.photo.pop(); // Największe zdjęcie
  if (!photo) return;

  try {
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    // Zapis zdjęcia jako awatar
    const fileName = `avatar_${ctx.from.id}.jpg`;
    const filePath = path.join(AVATAR_DIR, fileName);
    await writeFile(filePath, Buffer.from(buffer));

    ctx.reply(`✅ Awatar zapisany jako: ${fileName}`);
  } catch (err) {
    console.error("Błąd podczas zapisywania awatara:", err);
    ctx.reply("❌ Nie udało się zapisać awatara.");
  }
});

// Obsługa komendy /generate
bot.command("generate", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const prompt = args.join(" ");

  if (!prompt) {
    ctx.reply("❌ Podaj prompt, np. /generate Napisz post o AI");
    return;
  }

  try {
    // Ścieżka do awatara (domyślnie: avatar_{user_id}.jpg)
    const fileName = `avatar_${ctx.from.id}.jpg`;
    const filePath = path.join(AVATAR_DIR, fileName);

    // Generowanie treści z awatarem
    const content = await AIDolekGenerator.generateContent(
      prompt,
      "linkedin", // Domyślnie LinkedIn
      `[Awatar: ${fileName}]` // Informacja o awatarze w promptcie
    );

    ctx.reply(`🤖 Wygenerowana treść:\n\n${content}`);
  } catch (err) {
    console.error("Błąd podczas generowania treści:", err);
    ctx.reply("❌ Nie udało się wygenerować treści.");
  }
});

// Uruchomienie bota
bot.launch().then(() => {
  console.log("🚀 Telegram Bot uruchomiony");
});

// Obsługa błędów
bot.catch((err, ctx) => {
  console.error("Błąd w Telegram Bot:", err);
  ctx.reply("❌ Wystąpił błąd. Spróbuj ponownie.");
});

// Eksport dla Next.js API
export default bot;