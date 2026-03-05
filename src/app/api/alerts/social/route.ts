import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createAlertSchema = z.object({
  userId: z.string().uuid(),
  platform: z.string().default('twitter'),
  account: z.string().min(1).max(50),
  keywords: z.array(z.string().min(1)).min(1),
  telegramConversationId: z.string().min(1),
});

const updateAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  keywords: z.array(z.string().min(1)).optional(),
  telegramConversationId: z.string().min(1).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all social alerts for the user
    const { data: alerts, error } = await supabase
      .from('social_alerts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Get recent tweet counts and activity for each alert
    const alertsWithStats = await Promise.all(
      (alerts || []).map(async (alert) => {
        // Get recent triggers for this alert
        const { data: triggers } = await supabase
          .from('alert_triggers')
          .select('*')
          .eq('alert_id', alert.id)
          .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .order('triggered_at', { ascending: false })
          .limit(10);

        return {
          ...alert,
          tweetCount: triggers?.length || 0,
          lastActivity: triggers?.[0]?.triggered_at || alert.created_at,
          recentTweets: (triggers || []).map((trigger) => ({
            id: trigger.id,
            text: trigger.data.content || '',
            author: trigger.data.author || alert.account,
            url: trigger.data.tweet_url || '',
            timestamp: trigger.triggered_at,
            engagement: trigger.data.engagement || {
              likes: 0,
              retweets: 0,
              replies: 0,
            },
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      alerts: alertsWithStats,
    });
  } catch (error) {
    console.error('Error in GET /api/alerts/social:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createAlertSchema.parse(body);

    // Verify the user ID matches the session
    if (validatedData.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if user already has an alert for this account
    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('account', validatedData.account)
      .single();

    if (existingAlert) {
      return NextResponse.json(
        { error: 'You already have an alert for this account' },
        { status: 400 }
      );
    }

    // Create the alert
    const { data: alert, error } = await supabase
      .from('social_alerts')
      .insert({
        user_id: session.user.id,
        platform: validatedData.platform,
        account: validatedData.account,
        keywords: validatedData.keywords,
        telegram_conversation_id: validatedData.telegramConversationId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alert,
      message: `Alert created for @${validatedData.account}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }

    console.error('Error in POST /api/alerts/social:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateAlertSchema.parse(body);

    // Verify the alert belongs to the user
    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('user_id')
      .eq('id', validatedData.id)
      .single();

    if (!existingAlert || existingAlert.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Update the alert
    const updateData: any = {};
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;
    if (validatedData.keywords) updateData.keywords = validatedData.keywords;
    if (validatedData.telegramConversationId)
      updateData.telegram_conversation_id = validatedData.telegramConversationId;

    const { data: alert, error } = await supabase
      .from('social_alerts')
      .update(updateData)
      .eq('id', validatedData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alert,
      message: 'Alert updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }

    console.error('Error in PUT /api/alerts/social:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    // Verify the alert belongs to the user
    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (!existingAlert || existingAlert.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Delete the alert
    const { error } = await supabase.from('social_alerts').delete().eq('id', alertId);

    if (error) {
      console.error('Error deleting alert:', error);
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/alerts/social:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
