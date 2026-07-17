import OpenAI from 'openai';
import { buildAdvisorContext } from './context.js';
import type { AdviceRequest, AdvisorProvider } from './types.js';

export class ElectronHubProvider implements AdvisorProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    baseUrl: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  async generate(request: AdviceRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: request.systemInstructions },
        { role: 'user', content: buildAdvisorContext(request) },
      ],
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Electron Hub returned an empty response.');
    return content;
  }
}

export class GeminiProvider implements AdvisorProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(request: AdviceRequest): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: request.systemInstructions }],
          },
          contents: [{
            role: 'user',
            parts: [{ text: buildAdvisorContext(request) }],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}.`);

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!content) throw new Error('Gemini returned an empty response.');
    return content;
  }
}

export class FallbackAdvisorProvider implements AdvisorProvider {
  constructor(
    private readonly primary: AdvisorProvider,
    private readonly fallback: AdvisorProvider,
  ) {}

  async generate(request: AdviceRequest): Promise<string> {
    try {
      return await this.primary.generate(request);
    } catch (error) {
      console.warn('Primary advisor provider failed; using Gemini fallback.', error instanceof Error ? error.message : 'unknown error');
      return this.fallback.generate(request);
    }
  }
}
