const API_BASE = {
  auth: 'https://functions.poehali.dev/0cbcdd25-90f0-46ac-bcba-9a37d4ed9cc7',
  stats: 'https://functions.poehali.dev/f647def3-c1d0-4028-bf87-d442f4cd51c8',
  campaigns: 'https://functions.poehali.dev/5d3fe984-91b1-447a-8917-513c86737028',
  ptcView: 'https://functions.poehali.dev/7a0045db-5dff-49bf-a330-384a7c2ad155',
  admin: 'https://functions.poehali.dev/6a1dc141-0dd3-4944-b24a-072bdd7c2393',
};

export interface User {
  id: number;
  email: string;
  username: string;
  credits: number;
  ad_balance: number;
  total_clicks: number;
  total_payouts: number;
  referral_code: string;
  total_referral_earnings: number;
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

export interface Campaign {
  id: number;
  title: string;
  url: string;
  reward?: number;
  cost_per_view?: number;
  duration: number;
  total_views?: number;
  required_views?: number;
  status?: string;
}

export interface CampaignResponse {
  success?: boolean;
  campaigns?: Campaign[];
  campaign_id?: number;
  total_cost?: number;
  message?: string;
  error?: string;
}

export interface PTCViewResponse {
  success: boolean;
  reward?: number;
  new_balance?: number;
  error?: string;
}

export interface WithdrawalMethod {
  id: number;
  name: string;
}

export interface WithdrawalInfo {
  methods: WithdrawalMethod[];
  conversion_rate: number;
}

export interface WithdrawalRequest {
  success: boolean;
  request_id?: number;
  usd_amount?: number;
  error?: string;
}

export interface WithdrawalHistory {
  id: number;
  credits: number;
  usd_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
  method_name: string;
}

export interface VoucherResponse {
  success: boolean;
  credits_added?: number;
  new_balance?: number;
  error?: string;
}

export const authAPI = {
  register: async (email: string, password: string, username: string, referralCode?: string): Promise<AuthResponse> => {
    const response = await fetch(API_BASE.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, username, referral_code: referralCode }),
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

export const campaignsAPI = {
  create: async (sessionToken: string, title: string, url: string, required_views: number): Promise<CampaignResponse> => {
    const response = await fetch(API_BASE.campaigns, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({ title, url, required_views }),
    });
    return response.json();
  },

  getAvailable: async (sessionToken: string): Promise<CampaignResponse> => {
    const response = await fetch(`${API_BASE.campaigns}?action=available`, {
      headers: { 'X-Session-Token': sessionToken },
    });
    return response.json();
  },

  getList: async (): Promise<CampaignResponse> => {
    const response = await fetch(API_BASE.campaigns);
    return response.json();
  },
};

export const ptcViewAPI = {
  complete: async (sessionToken: string, campaignId: number, captchaCorrect: boolean): Promise<PTCViewResponse> => {
    const response = await fetch(API_BASE.ptcView, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({ campaign_id: campaignId, captcha_correct: captchaCorrect }),
    });
    return response.json();
  },
};

export const adminAPI = {
  activateVoucher: async (userId: number, voucherCode: string): Promise<VoucherResponse> => {
    const response = await fetch(API_BASE.admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate_voucher', user_id: userId, voucher_code: voucherCode }),
    });
    return response.json();
  },

  getWithdrawalInfo: async (): Promise<WithdrawalInfo> => {
    const response = await fetch(`${API_BASE.admin}?action=withdrawal_methods`);
    return response.json();
  },

  requestWithdrawal: async (
    userId: number,
    credits: number,
    methodId: number,
    walletAddress: string
  ): Promise<WithdrawalRequest> => {
    const response = await fetch(API_BASE.admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_withdrawal',
        user_id: userId,
        credits,
        method_id: methodId,
        wallet_address: walletAddress,
      }),
    });
    return response.json();
  },

  getWithdrawalHistory: async (userId: number): Promise<{ history: WithdrawalHistory[] }> => {
    const response = await fetch(`${API_BASE.admin}?action=withdrawal_history&user_id=${userId}`);
    return response.json();
  },

  generateVouchers: async (credits: number, count: number): Promise<Response> => {
    return fetch(API_BASE.admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_vouchers', credits, count }),
    });
  },

  getVouchers: async (): Promise<any> => {
    const response = await fetch(`${API_BASE.admin}?action=vouchers`);
    return response.json();
  },

  getWithdrawals: async (): Promise<any> => {
    const response = await fetch(`${API_BASE.admin}?action=withdrawals`);
    return response.json();
  },

  processWithdrawal: async (requestId: number, status: 'completed' | 'rejected'): Promise<{ success: boolean }> => {
    const response = await fetch(API_BASE.admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'process_withdrawal', request_id: requestId, status }),
    });
    return response.json();
  },

  updateRate: async (rate: number): Promise<{ success: boolean; rate: number }> => {
    const response = await fetch(API_BASE.admin, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_rate', rate }),
    });
    return response.json();
  },
};
