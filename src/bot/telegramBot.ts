import { Telegraf } from "telegraf";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { AIDolekGenerator } from "../../mini-services/ai-dolek";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Brak TELEGRAM_BOT_TOKEN — bot nie wystartuje.");
  process.exit(1);
}

const bot = new Telegraf(token);
const AVATAR_DIR = path.join(process.cwd(), "avatars");

// Oczekiwanie na zdjęcie po /set_avatar
const awaitingAvatar = new Set<number>();

async function ensureAvatarDir() {
  await mkdir(AVATAR_DIR, { recursive: true });
}

function avatarPath(userId: number) {
  return path.join(AVATAR_DIR, `avatar_${userId}.jpg`);
}

bot.start(async (ctx) => {
  await ensureAvatarDir();
  await ctx.reply(
    [
      "Witaj w AIDolek (Telegram).",
      "",
      "Komendy:",
      "/set_avatar — wyślij potem zdjęcie awatara AI",
      "/generate <prompt> — wygeneruj post LinkedIn",
      "/avatar — status awatara",
    ].join("\n")
  );
});

bot.command("set_avatar", async (ctx) => {
  awaitingAvatar.add(ctx.from.id);
  await ctx.reply("Wyślij teraz zdjęcie — zapiszę je jako awatar AI.");
});

bot.command("avatar", async (ctx) => {
  const filePath = avatarPath(ctx.from.id);
  try {
    await access(filePath);
    await ctx.reply(`Awatar ustawiony: avatar_${ctx.from.id}.jpg`);
  } catch {
    await ctx.reply("Brak awatara. Użyj /set_avatar i wyślij zdjęcie.");
  }
});

bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;
  if (!awaitingAvatar.has(userId)) {
    await ctx.reply("Aby zapisać awatar, najpierw użyj /set_avatar.");
    return;
  }

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  if (!photo) return;

  try {
    await ensureAvatarDir();
    const file = await ctx.telegram.getFile(photo.file_id);
    if (!file.file_path) throw new Error("Brak file_path z Telegram API");

    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Pobranie pliku: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = avatarPath(userId);
    await writeFile(filePath, buffer);

    awaitingAvatar.delete(userId);
    await ctx.reply(`Awatar zapisany: avatar_${userId}.jpg`);
  } catch (err) {
    console.error("Błąd zapisu awatara:", err);
    await ctx.reply("Nie udało się zapisać awatara.");
  }
});

bot.command("generate", async (ctx) => {
  const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!prompt) {
    await ctx.reply("Podaj prompt, np. /generate Napisz post o lokalnym AI");
    return;
  }

  try {
    await ensureAvatarDir();
    const fileName = `avatar_${ctx.from.id}.jpg`;
    const filePath = avatarPath(ctx.from.id);

    let avatarContext: string | undefined;
    try {
      await access(filePath);
      avatarContext = `[Awatar AI ustawiony przez użytkownika: ${fileName}]`;
    } catch {
      avatarContext = undefined;
      await ctx.reply(
        "Uwaga: brak awatara (/set_avatar). Generuję treść bez awatara."
      );
    }

    await ctx.reply("Generuję treść…");
    const content = await AIDolekGenerator.generateContent(
      prompt,
      "linkedin",
      avatarContext,
      "casual"
    );

    await ctx.reply(`Wygenerowana treść:\n\n${content}`);
  } catch (err) {
    console.error("Błąd generowania:", err);
    await ctx.reply("Nie udało się wygenerować treści (sprawdź Ollamę).");
  }
});

bot.catch((err, ctx) => {
  console.error("Telegram Bot error:", err);
  ctx.reply("Wystąpił błąd. Spróbuj ponownie.").catch(() => undefined);
});

// Start tylko gdy plik uruchamiany bezpośrednio (nie przy imporcie z Next)
const isMain =
  typeof require !== "undefined" &&
  typeof module !== "undefined" &&
  require.main === module;

if (isMain || process.env.RUN_TELEGRAM_BOT === "1") {
  ensureAvatarDir()
    .then(() => bot.launch())
    .then(() => console.log("Telegram Bot uruchomiony"))
    .catch((err) => {
      console.error("Nie udało się uruchomić bota:", err);
      process.exit(1);
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

export default bot;
