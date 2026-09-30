export { processTweets } from './pipeline';
export { socialMonitor } from './social-monitor';
export { findMatches, buildStreamRules, normalizeAccount, keywordMatches } from './matching';
export type {
  TweetData,
  TweetType,
  SocialAlertRow,
  ProcessingResult,
  PipelineDeps,
  TweetProvider,
} from './types';
