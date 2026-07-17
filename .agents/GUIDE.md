# Financial Advisor Bot Decisions

## Confirmed Constraints

- The bot is a separate repository under `C:\PROJECTS\wemamcp-projects\`.
- The implementation language is Node.js with TypeScript.
- The deployed MCP uses Streamable HTTP at `/mcp`.
- `MCP_SERVER_URL` stores the raw service URL. The client appends `/mcp` exactly once.
- Users authenticate with an account number and PIN through `verify_account_pin`.
- PIN messages are deleted before dispatch and never enter model context or long-lived session history.
- Account switching requires a new successful PIN verification. A failed switch does not replace the current verified account.
- Sessions are in-memory for the first version.
- Electron Hub is the primary advisor provider and Gemini is the fallback.
- The bot uses bot-side account binding only. MCP server hardening is documented as a remaining deployment concern.
- Cloud Run runs the Telegram bot as a regular service with a fixed same-process health listener on `0.0.0.0:8080`.

## Architectural Decisions

- Authentication, MCP retrieval, and account selection stay in native bot code rather than model tool calling.
- The advisor is read-only and receives normalized balance and transfer data after MCP retrieval.
- Provider calls share one advisor interface so Electron Hub failure can fall back to Gemini without changing Telegram behavior.
- The transaction history is treated as transfer activity, not a complete expense ledger.

To find the account binding logic visit [src/telegram-bot.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/telegram-bot.ts).

The MCP connection can be found in [src/mcp-client.ts](file:///C:/PROJECTS/wemamcp-projects/financial-advisor-telegram-bot/src/mcp-client.ts).
