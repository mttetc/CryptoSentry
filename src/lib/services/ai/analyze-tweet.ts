const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = [
  'You are a crypto market analyst.',
  'Given a tweet, respond with JSON only:',
  '{"sentiment": "bullish"|"bearish"|"neutral",',
  '"summary": "one sentence describing what was said and its market relevance"}.',
  'If the tweet has no clear market sentiment, use "neutral".',
].join(' ');

interface TweetAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
}

const DEFAULT_ANALYSIS: TweetAnalysis = { sentiment: 'neutral', summary: '' };

function isValidSentiment(value: unknown): value is TweetAnalysis['sentiment'] {
  return value === 'bullish' || value === 'bearish' || value === 'neutral';
}

function parseAnalysis(raw: string): TweetAnalysis {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'sentiment' in parsed &&
      'summary' in parsed
    ) {
      const obj = parsed as Record<string, unknown>;

      if (isValidSentiment(obj.sentiment) && typeof obj.summary === 'string') {
        return { sentiment: obj.sentiment, summary: obj.summary };
      }
    }
  } catch {
    // Parse failure falls through to default
  }

  return DEFAULT_ANALYSIS;
}

export async function analyzeTweet(tweetText: string): Promise<TweetAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return DEFAULT_ANALYSIS;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: tweetText },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return DEFAULT_ANALYSIS;
    }

    const data: unknown = await response.json();

    if (
      typeof data === 'object' &&
      data !== null &&
      'choices' in data &&
      Array.isArray((data as Record<string, unknown>).choices)
    ) {
      const choices = (data as Record<string, unknown>).choices as unknown[];
      const firstChoice = choices[0];

      if (
        typeof firstChoice === 'object' &&
        firstChoice !== null &&
        'message' in firstChoice
      ) {
        const message = (firstChoice as Record<string, unknown>).message;

        if (typeof message === 'object' && message !== null && 'content' in message) {
          const content = (message as Record<string, unknown>).content;

          if (typeof content === 'string') {
            return parseAnalysis(content);
          }
        }
      }
    }

    return DEFAULT_ANALYSIS;
  } catch {
    // Network error, timeout, or unexpected failure
    return DEFAULT_ANALYSIS;
  } finally {
    clearTimeout(timeout);
  }
}
