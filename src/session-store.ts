export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type AuthenticatedSession = {
  telegramUserId: string;
  accountNumber: number;
  firstName: string;
  lastName: string;
  authenticatedAt: string;
  history: ChatTurn[];
};

export class SessionStore {
  private readonly sessions = new Map<string, AuthenticatedSession>();

  get(telegramUserId: string): AuthenticatedSession | undefined {
    return this.sessions.get(telegramUserId);
  }

  bind(input: Omit<AuthenticatedSession, 'authenticatedAt' | 'history'>): AuthenticatedSession {
    const session: AuthenticatedSession = {
      ...input,
      authenticatedAt: new Date().toISOString(),
      history: [],
    };
    this.sessions.set(input.telegramUserId, session);
    return session;
  }

  clear(telegramUserId: string): void {
    this.sessions.delete(telegramUserId);
  }

  appendHistory(telegramUserId: string, turns: ChatTurn[], maxTurns: number): void {
    const session = this.sessions.get(telegramUserId);
    if (!session) return;
    session.history.push(...turns);
    session.history.splice(0, Math.max(0, session.history.length - maxTurns));
  }
}
