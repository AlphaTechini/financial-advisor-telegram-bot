import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const promptUrl = new URL('../../prompts/financial-advisor.md', import.meta.url);

export function loadAdvisorInstructions(): string {
  return readFileSync(fileURLToPath(promptUrl), 'utf8');
}
