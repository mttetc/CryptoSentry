export const APIFY_BASE_URL = 'https://api.apify.com/v2';

export function requireApifyToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN environment variable is required');
  }
  return token;
}
