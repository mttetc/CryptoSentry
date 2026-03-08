'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, MessageSquare, Activity, CheckCircle, Plus } from 'lucide-react';
import { TelegramTutorial } from './telegram-tutorial';
import { CreateAlertForm } from './create-alert-form';
import { ActiveConversations } from './active-conversations';
import type { SocialAlertWithStats } from '@/types/alerts';

interface ModernDashboardProps {
  userId: string;
  initialAlerts?: SocialAlertWithStats[];
}

export function ModernDashboard({ userId, initialAlerts }: ModernDashboardProps) {
  const [activeTab, setActiveTab] = useState('tutorial');

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">CryptoSentry Dashboard</h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Monitor crypto influencers and get instant Telegram alerts when they mention your keywords
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Telegram Status</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ready to receive alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Monitoring accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Alerts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Keywords triggered</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tutorial" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Setup Guide
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Alert
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutorial" className="space-y-6">
          <TelegramTutorial />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <CreateAlertForm userId={userId} />
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <ActiveConversations userId={userId} initialAlerts={initialAlerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
