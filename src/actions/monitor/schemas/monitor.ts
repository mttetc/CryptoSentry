export interface MonitorState {
  error?: string;
  success: boolean;
  message?: string;
}

export interface MonitorEvent {
  type: 'social';
  data: {
    account?: string;
    content?: string;
  };
}
