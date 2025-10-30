const API_BASE = {
  auth: 'https://functions.poehali.dev/0cbcdd25-90f0-46ac-bcba-9a37d4ed9cc7',
  stats: 'https://functions.poehali.dev/f647def3-c1d0-4028-bf87-d442f4cd51c8',
};

export interface User {
  id: number;
  email: string;
  username: string;
  balance: number;
  ad_balance: number;
  total_clicks: number;
}

export interface AuthResponse {
  success: boolean;
  session_token?: string;
  user?: User;
  error?: string;
}

export interface StatsResponse {
  total_users: number;
  active_campaigns: number;
  total_payouts: number;
  avg_earnings: number;
}

export const authAPI = {
  register: async (email: string, password: string, username: string): Promise<AuthResponse> => {
    const response = await fetch(API_BASE.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, username }),
    });
    return response.json();
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(API_BASE.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    return response.json();
  },

  verify: async (session_token: string): Promise<AuthResponse> => {
    const response = await fetch(API_BASE.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', session_token }),
    });
    return response.json();
  },
};

export const statsAPI = {
  getStats: async (): Promise<StatsResponse> => {
    const response = await fetch(API_BASE.stats);
    return response.json();
  },
};
