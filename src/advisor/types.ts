import type { ChatTurn } from '../session-store.js';
import type { FinancialSnapshot } from '../financial-data.js';

export type AdviceRequest = {
  snapshot: FinancialSnapshot;
  goalMessage: string;
  history: ChatTurn[];
  systemInstructions: string;
};

export interface AdvisorProvider {
  generate(request: AdviceRequest): Promise<string>;
}
