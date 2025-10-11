'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  account: string;
  keywords: string[];
  telegramConversationId: string;
  isActive: boolean;
  tweetCount: number;
  lastActivity: string;
  recentTweets: Tweet[];
}

interface Tweet {
  id: string;
  text: string;
  author: string;
  url: string;
  timestamp: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface ActiveConversationsProps {
  userId: string;
}

export function ActiveConversations({ userId }: ActiveConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/social');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.alerts || []);
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load conversations',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const refreshData = async () => {
    setRefreshing(true);
    await fetchConversations();
  };

  useEffect(() => {
    fetchConversations();

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchConversations]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4 text-center">
          <Activity className="mx-auto h-8 w-8 text-green-500" />
          <h2 className="text-3xl font-bold">Live Monitoring</h2>
          <p className="text-muted-foreground">Loading your active conversations...</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 w-3/4 rounded bg-muted"></div>
                  <div className="h-4 w-1/2 rounded bg-muted"></div>
                  <div className="h-4 w-1/4 rounded bg-muted"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Activity className="h-8 w-8 text-green-500" />
          <h2 className="text-3xl font-bold">Live Monitoring</h2>
        </div>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Real-time tracking of your X accounts and keyword mentions
        </p>
      </div>

      {/* Stats */}
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
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length > 0 ? 'Live' : '--'}</div>
            <p className="text-xs text-muted-foreground">Real-time updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Active Conversations</h3>
            <p className="mb-4 text-muted-foreground">
              You haven&apos;t created any alerts yet. Start monitoring by creating your first
              alert.
            </p>
            <Button onClick={() => (window.location.href = '/dashboard?tab=alerts')}>
              Create Your First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {conversations.map((conversation) => (
            <Card key={conversation.id}>
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
                    <Badge variant={conversation.isActive ? 'default' : 'secondary'}>
                      {conversation.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {conversation.isActive && (
                      <div className="flex items-center gap-1 text-green-500">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        <span className="text-xs">Live</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Keywords */}
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

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {conversation.tweetCount}
                    </div>
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
                      {conversation.recentTweets.reduce(
                        (sum, tweet) => sum + tweet.engagement.likes,
                        0
                      )}
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

                {/* Recent Tweets */}
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
                          <div key={tweet.id} className="rounded-lg bg-muted p-3">
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">@{tweet.author}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(tweet.timestamp), {
                                    addSuffix: true,
                                  })}
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
                              {tweet.text.length > 100
                                ? `${tweet.text.substring(0, 100)}...`
                                : tweet.text}
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
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
