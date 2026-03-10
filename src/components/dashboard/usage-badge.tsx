'use client';

import { Badge } from '@/components/ui/badge';

interface UsageBadgeProps {
  usage: number;
  limit: number;
  plan: string;
}

export function UsageBadge({ usage, limit, plan }: UsageBadgeProps) {
  const atLimit = usage >= limit;

  return (
    <Badge variant={atLimit ? 'destructive' : 'outline'}>
      {usage}/{limit} alerts ({plan})
    </Badge>
  );
}
