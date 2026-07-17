import { Bot, type Context } from 'grammy';
import type { AdvisorService } from './advisor/service.js';
import type { Config } from './config.js';
import { fetchFinancialSnapshot } from './financial-data.js';
import { McpToolError, type McpClient } from './mcp-client.js';
import { SessionStore } from './session-store.js';

type PendingLogin = {
  accountNumber?: number;
};

function payloadData(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function objectValue(payload: unknown): Record<string, unknown> {
  return typeof payload === 'object' && payload !== null
    ? payload as Record<string, unknown>
    : {};
}

function userId(ctx: Context): string {
  if (!ctx.from) throw new Error('Telegram update has no sender.');
  return String(ctx.from.id);
}

function chatId(ctx: Context): number {
  if (!ctx.chat) throw new Error('Telegram update has no chat.');
  return ctx.chat.id;
}

async function deleteSensitiveMessage(ctx: Context): Promise<void> {
  if (!ctx.message) return;
  await ctx.api.deleteMessage(chatId(ctx), ctx.message.message_id).catch(() => undefined);
}

async function replyInChunks(ctx: Context, text: string): Promise<void> {
  const chunks = text.match(/[\s\S]{1,3900}/g) ?? [''];
  for (const chunk of chunks) await ctx.reply(chunk);
}

function accountLabel(session: { firstName: string; lastName: string; accountNumber: number }): string {
  return `${session.firstName} ${session.lastName} (account ${session.accountNumber})`;
}

export type TelegramBotDependencies = {
  config: Config;
  mcp: McpClient;
  sessions: SessionStore;
  advisor: AdvisorService;
};

export function createTelegramBot({ config, mcp, sessions, advisor }: TelegramBotDependencies): Bot {
  const bot = new Bot(config.telegramBotToken);
  const pendingLogins = new Map<string, PendingLogin>();

  async function beginLogin(ctx: Context): Promise<void> {
    const telegramUserId = userId(ctx);
    const statusPayload = await mcp.callTool('check_telegram_ban', {
      telegram_user_id: telegramUserId,
    });
    const status = objectValue(payloadData(statusPayload));
    if (status.banned === true) {
      pendingLogins.delete(telegramUserId);
      sessions.clear(telegramUserId);
      await ctx.reply('This Telegram account is blocked from account verification.');
      return;
    }

    pendingLogins.set(telegramUserId, {});
    await ctx.reply('Enter the account number you want to connect.');
  }

  async function verifyPendingLogin(ctx: Context, pending: PendingLogin, pin: string): Promise<void> {
    const telegramUserId = userId(ctx);
    const accountNumber = pending.accountNumber;
    if (accountNumber === undefined) {
      pendingLogins.set(telegramUserId, {});
      await ctx.reply('Enter the account number first.');
      return;
    }

    pendingLogins.delete(telegramUserId);
    const resultPayload = await mcp.callTool('verify_account_pin', {
      account_number: accountNumber,
      telegram_user_id: telegramUserId,
      pin,
    });
    const result = objectValue(payloadData(resultPayload));
    const status = result.status;

    if (status === 'verified') {
      const session = sessions.bind({
        telegramUserId,
        accountNumber: typeof result.account_number === 'number' ? result.account_number : accountNumber,
        firstName: String(result.first_name ?? ''),
        lastName: String(result.last_name ?? ''),
      });
      await ctx.reply(`Account verified for ${accountLabel(session)}. Tell me your financial goal or planned purchase.`);
      return;
    }

    if (status === 'banned') {
      sessions.clear(telegramUserId);
      await ctx.reply('Verification failed too many times. This Telegram account is now blocked.');
      return;
    }

    const attempts = typeof result.attempts_remaining === 'number'
      ? ` Attempts remaining: ${result.attempts_remaining}.`
      : '';
    await ctx.reply(`The account number and PIN did not match.${attempts} Use /login to try again.`);
  }

  bot.command('start', async (ctx) => {
    const session = sessions.get(userId(ctx));
    if (session) {
      await ctx.reply(`You are connected to ${accountLabel(session)}. Send your financial goal, or use /switch to connect another account.`);
      return;
    }
    await ctx.reply('I can review your WEMA balance and transfer history against a financial goal. Use /login to connect an account.');
  });

  bot.command('login', async (ctx) => {
    await beginLogin(ctx);
  });

  bot.command('switch', async (ctx) => {
    await beginLogin(ctx);
  });

  bot.command('logout', async (ctx) => {
    const telegramUserId = userId(ctx);
    pendingLogins.delete(telegramUserId);
    sessions.clear(telegramUserId);
    await ctx.reply('Your Telegram session has been cleared.');
  });

  bot.command('cancel', async (ctx) => {
    pendingLogins.delete(userId(ctx));
    await ctx.reply('The current action has been cancelled.');
  });

  bot.command('status', async (ctx) => {
    const session = sessions.get(userId(ctx));
    await ctx.reply(session ? `Connected to ${accountLabel(session)}.` : 'No account is connected. Use /login to begin.');
  });

  bot.on('message:text', async (ctx) => {
    const telegramUserId = userId(ctx);
    const text = ctx.message.text.trim();
    const pending = pendingLogins.get(telegramUserId);

    if (pending) {
      if (pending.accountNumber === undefined) {
        if (!/^\d+$/.test(text)) {
          await ctx.reply('Enter a numeric account number, or use /cancel.');
          return;
        }
        const accountNumber = Number(text);
        if (!Number.isSafeInteger(accountNumber) || accountNumber <= 0) {
          await ctx.reply('That account number is not valid. Try again.');
          return;
        }
        pendingLogins.set(telegramUserId, { accountNumber });
        await ctx.reply('Now send only the account PIN. The message will be deleted immediately.');
        return;
      }

      await deleteSensitiveMessage(ctx);
      if (text.length < 4 || text.length > 20) {
        pendingLogins.set(telegramUserId, pending);
        await ctx.reply('The PIN must be between 4 and 20 characters. Send it again, or use /cancel.');
        return;
      }
      await verifyPendingLogin(ctx, pending, text);
      return;
    }

    const session = sessions.get(telegramUserId);
    if (!session) {
      await ctx.reply('Connect an account first with /login.');
      return;
    }

    try {
      await ctx.reply('Reviewing your verified balance and recent transfer history...');
      const snapshot = await fetchFinancialSnapshot(
        mcp,
        session.accountNumber,
        config.advisorCurrency,
        config.statementLimit,
      );
      const advice = await advisor.generate({
        snapshot,
        goalMessage: text,
        history: session.history,
      });
      sessions.appendHistory(telegramUserId, [
        { role: 'user', content: text },
        { role: 'assistant', content: advice },
      ], config.sessionHistoryLimit * 2);
      await replyInChunks(ctx, advice);
    } catch (error) {
      if (error instanceof McpToolError) {
        await ctx.reply('I could not retrieve the verified account data right now. Please try again later.');
        return;
      }
      console.error('Advisor request failed.', error instanceof Error ? error.message : error);
      await ctx.reply('I could not complete that financial review right now. Please try again later.');
    }
  });

  bot.catch((error) => {
    console.error('Telegram update failed.', error.error instanceof Error ? error.error.message : error.error);
  });

  return bot;
}
