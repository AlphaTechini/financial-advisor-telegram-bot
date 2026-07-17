import { loadAdvisorInstructions } from './prompt.js';
import type { AdviceRequest, AdvisorProvider } from './types.js';

export class AdvisorService {
  private readonly systemInstructions = loadAdvisorInstructions();

  constructor(private readonly provider: AdvisorProvider) {}

  generate(request: Omit<AdviceRequest, 'systemInstructions'>): Promise<string> {
    return this.provider.generate({
      ...request,
      systemInstructions: this.systemInstructions,
    });
  }
}
