import type { McpClient } from './mcp-client.js';

type RawTransaction = {
  sender_acc?: number;
  receiver_acc?: number;
  amount?: number;
  comment?: string | null;
  created_at?: string;
};

export type FinancialTransaction = {
  direction: 'inflow' | 'outflow' | 'unknown';
  amount: number;
  comment: string | null;
  occurredAt: string | null;
};

export type FinancialSnapshot = {
  balance: number;
  currency: string;
  transactions: FinancialTransaction[];
  inflowTotal: number;
  outflowTotal: number;
};

function unwrapData(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function readBalance(payload: unknown): number {
  const value = unwrapData(payload);
  if (typeof value === 'object' && value !== null && 'acc_balance' in value) {
    const balance = value.acc_balance;
    if (typeof balance === 'number' && Number.isFinite(balance)) return balance;
  }
  throw new Error('The banking service returned an invalid balance.');
}

function readTransactions(payload: unknown, accountNumber: number): FinancialTransaction[] {
  const value = unwrapData(payload);
  if (!Array.isArray(value)) throw new Error('The banking service returned an invalid statement.');

  return value.flatMap((item: RawTransaction) => {
    if (typeof item.amount !== 'number' || !Number.isFinite(item.amount)) return [];
    const direction = item.sender_acc === accountNumber
      ? 'outflow'
      : item.receiver_acc === accountNumber
        ? 'inflow'
        : 'unknown';

    return [{
      direction,
      amount: item.amount,
      comment: typeof item.comment === 'string' ? item.comment : null,
      occurredAt: typeof item.created_at === 'string' ? item.created_at : null,
    }];
  });
}

export async function fetchFinancialSnapshot(
  mcp: McpClient,
  accountNumber: number,
  currency: string,
  statementLimit: number,
): Promise<FinancialSnapshot> {
  const [balancePayload, statementPayload] = await Promise.all([
    mcp.callTool('get_balance', { account_number: accountNumber }),
    mcp.callTool('get_statement', { account_number: accountNumber, limit: statementLimit }),
  ]);
  const transactions = readTransactions(statementPayload, accountNumber);

  return {
    balance: readBalance(balancePayload),
    currency,
    transactions,
    inflowTotal: transactions
      .filter((transaction) => transaction.direction === 'inflow')
      .reduce((total, transaction) => total + transaction.amount, 0),
    outflowTotal: transactions
      .filter((transaction) => transaction.direction === 'outflow')
      .reduce((total, transaction) => total + transaction.amount, 0),
  };
}
