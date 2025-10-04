// Only keep types that are actually used
export interface CallOptions {
  userId: string;
  phone: string;
  message: string;
  recipientType?: 'human_residence' | 'human_business' | 'machine';
}

export interface SMSOptions {
  userId: string;
  phone: string;
  message: string;
}

export interface CallResponse {
  success?: boolean;
  callId?: string;
  error?: string;
}

export interface SMSResponse {
  success?: boolean;
  messageId?: string;
  error?: string;
}

export interface TelnyxWebhookPayload {
  call_control_id: string;
  call_leg_id: string;
  event_type: string;
  payload: {
    from: string;
    to: string;
    direction: 'inbound' | 'outbound';
    state: string;
    duration?: number;
    cost?: number;
    custom_headers?: {
      'X-User-Id'?: string;
      [key: string]: string | undefined;
    };
  };
}
