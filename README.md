# WEMA Financial Advisor Telegram Bot

This standalone TypeScript service provides a read-only Telegram financial advisor backed by the deployed WEMA MCP. A user authenticates an account with an account number and PIN, states a goal or planned purchase, and receives advice based on the verified balance and recent transfer history.

## Architecture

- Telegram updates and the authentication state machine are implemented in [src/telegram-bot.ts](src/telegram-bot.ts).
- The Streamable HTTP MCP client and `/mcp` endpoint normalization are implemented in [src/mcp-client.ts](src/mcp-client.ts) and [src/config.ts](src/config.ts).
- Balance and statement responses are normalized into an advisor snapshot in [src/financial-data.ts](src/financial-data.ts).
- In-memory verified account sessions are managed in [src/session-store.ts](src/session-store.ts).
- Electron Hub and Gemini `generateContent` fallback providers are implemented in [src/advisor/providers.ts](src/advisor/providers.ts).
- The financial advisor instructions can be found in [prompts/financial-advisor.md](prompts/financial-advisor.md).

The bot accepts `MCP_SERVER_URL` as the raw deployed service URL and appends `/mcp` exactly once. The current MCP is stateless, so every tool operation uses a fresh MCP client connection. The bot binds a verified account to the Telegram user session and does not allow the model to choose an account number.

## Authentication Flow

1. `/login` or `/switch` checks the Telegram security status through MCP.
2. The user enters an account number.
3. The bot asks for the PIN in a separate message and deletes that message before dispatching the verification call.
4. `verify_account_pin` verifies the account and Telegram user ID through the deployed MCP.
5. A successful verification replaces the in-memory account binding and clears previous advice history.
6. Failed verification preserves the previous account binding during a switch attempt. A banned result clears the session.

PINs are never sent to an AI provider, stored in session history, or written to logs. The first version intentionally uses in-memory sessions; a process restart requires users to authenticate again.

## Configuration

Copy [.env.example](.env.example) to `.env` and set the provider credentials and Telegram token. The deployed MCP URL is already present as the raw base URL. Use Cloud Run environment configuration or Secret Manager for real values.

## Development

```text
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```

The bot uses Telegram long polling. It should run as a single Cloud Run instance when deployed unless polling ownership is moved to a separate worker design.

## Limitations

The current MCP read tools accept an account number and do not enforce application-level caller authentication. This bot mitigates account switching at the Telegram session boundary, but direct callers of a publicly reachable MCP endpoint could bypass that bot-side boundary. Protect the MCP service with deployment-level authentication or add server-side caller authorization before treating the endpoint as production-ready.

The MCP statement currently represents transfers, not a complete ledger of cash spending, recurring bills, debt, or external accounts. The advisor instructions require those limitations to be disclosed.

## Project Documentation

- [Project structure](structure.md)
- [Prompt documentation](prompts/README.md)
- [Decision memory](.agents/GUIDE.md)

To find the Telegram orchestration logic visit [src/telegram-bot.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/telegram-bot.ts).

The MCP connection can be found in [src/mcp-client.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/mcp-client.ts).
