'use client';

import { useState, useDeferredValue } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  MessageSquare,
  Twitter,
  Hash,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSSE } from '@/hooks/use-sse';
import { formatDistanceToNow } from 'date-fns';
import type { SocialAlertWithStats, AlertTweet } from '@/types/alerts';

interface ActiveConversationsProps {
  userId: string;
  initialAlerts?: SocialAlertWithStats[];
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Wifi className="h-3 w-3 text-green-500" />
        <span>Connected — updates arrive in real-time</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <WifiOff className="h-3 w-3 text-red-500" />
      <span>Disconnected — use refresh to update</span>
    </div>
  );
}

function StatsCards({
  conversations,
  sseConnected,
}: {
  conversations: SocialAlertWithStats[];
  sseConnected: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversations.length}</div>
          <p className="text-xs text-muted-foreground">Monitoring accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tweets</CardTitle>
          <Twitter className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {conversations.reduce((sum, conv) => sum + conv.tweetCount, 0)}
          </div>
          <p className="text-xs text-muted-foreground">Captured today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Keywords</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {conversations.reduce((sum, conv) => sum + conv.keywords.length, 0)}
          </div>
          <p className="text-xs text-muted-foreground">Being monitored</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connection</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sseConnected ? 'Live' : 'Offline'}</div>
          <p className="text-xs text-muted-foreground">
            {sseConnected ? 'SSE connected' : 'Reconnecting...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TweetCard({ tweet }: { tweet: AlertTweet }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">@{tweet.author}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(tweet.timestamp), { addSuffix: true })}
          </span>
        </div>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600"
        >
          <Twitter className="h-4 w-4" />
        </a>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        {tweet.text.length > 100 ? `${tweet.text.slice(0, 100)}...` : tweet.text}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span>❤️</span>
          {tweet.engagement.likes}
        </span>
        <span className="flex items-center gap-1">
          <span>🔄</span>
          {tweet.engagement.retweets}
        </span>
        <span className="flex items-center gap-1">
          <span>💬</span>
          {tweet.engagement.replies}
        </span>
      </div>
    </div>
  );
}

function ConversationCard({
  conversation,
  sseConnected,
}: {
  conversation: SocialAlertWithStats;
  sseConnected: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Twitter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">@{conversation.account}</CardTitle>
              <CardDescription>
                Monitoring {conversation.keywords.length} keywords
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={conversation.is_active ? 'default' : 'secondary'}>
              {conversation.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {conversation.is_active && sseConnected && (
              <div className="flex items-center gap-1 text-green-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Hash className="h-4 w-4" />
            Keywords
          </h4>
          <div className="flex flex-wrap gap-2">
            {conversation.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{conversation.tweetCount}</div>
            <p className="text-xs text-muted-foreground">Tweets Today</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {conversation.recentTweets.length}
            </div>
            <p className="text-xs text-muted-foreground">Recent Matches</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {conversation.recentTweets.reduce((sum, tweet) => sum + tweet.engagement.likes, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Likes</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {conversation.recentTweets.reduce(
                (sum, tweet) => sum + tweet.engagement.retweets,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total Retweets</p>
          </div>
        </div>

        {conversation.recentTweets.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Recent Matches
              </h4>
              <div className="space-y-3">
                {conversation.recentTweets.slice(0, 3).map((tweet) => (
                  <TweetCard key={tweet.id} tweet={tweet} />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No Active Conversations</h3>
        <p className="mb-4 text-muted-foreground">
          You haven&apos;t created any alerts yet. Start monitoring by creating your first alert.
        </p>
        <Button
          onClick={() => {
            globalThis.location.href = '/dashboard?tab=alerts';
          }}
        >
          Create Your First Alert
        </Button>
      </CardContent>
    </Card>
  );
}

export function ActiveConversations({ initialAlerts }: ActiveConversationsProps) {
  const [conversations, setConversations] = useState<SocialAlertWithStats[]>(
    initialAlerts ?? []
  );
  const [refreshing, setRefreshing] = useState(false);
  const deferredConversations = useDeferredValue(conversations);
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/alerts/social');
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setConversations(data.alerts || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const { isConnected: sseConnected } = useSSE('/api/sse', {
    onSocialUpdate: () => {
      fetchConversations();
    },
  });

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    toast({ title: 'Data refreshed' });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Activity className="h-8 w-8 text-green-500" />
          <h2 className="text-3xl font-bold">Live Monitoring</h2>
        </div>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Real-time tracking of your X accounts and keyword mentions
        </p>
        <ConnectionStatus connected={sseConnected} />
      </div>

      <StatsCards conversations={deferredConversations} sseConnected={sseConnected} />

      <div className="flex justify-center">
        <Button variant="outline" onClick={handleManualRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {deferredConversations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6">
          {deferredConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              sseConnected={sseConnected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
