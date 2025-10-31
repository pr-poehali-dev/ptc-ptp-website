import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { 
  authAPI, 
  statsAPI, 
  campaignsAPI, 
  adminAPI,
  type User, 
  type Campaign,
  type WithdrawalMethod,
  type WithdrawalHistory
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"user" | "advertiser">("user");
  const [stats, setStats] = useState({ total_users: 0, active_campaigns: 0, total_payouts: 0, avg_earnings: 0 });
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [campaignFormData, setCampaignFormData] = useState({ title: '', url: '', required_views: 1000 });
  const [voucherCode, setVoucherCode] = useState('');
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [withdrawalFormData, setWithdrawalFormData] = useState({
    credits: '',
    methodId: '',
    walletAddress: ''
  });
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      authAPI.verify(sessionToken).then((response) => {
        if (response.success && response.user) {
          setUser(response.user);
          setIsLoggedIn(true);
          loadAvailableCampaigns(sessionToken);
          loadWithdrawalInfo();
          loadWithdrawalHistory(response.user.id);
        } else {
          localStorage.removeItem('session_token');
        }
      });
    }
    
    statsAPI.getStats().then(setStats);
  }, []);

  const loadAvailableCampaigns = async (sessionToken: string) => {
    const response = await campaignsAPI.getAvailable(sessionToken);
    if (response.campaigns) {
      setAvailableCampaigns(response.campaigns);
    }
  };

  const loadWithdrawalInfo = async () => {
    try {
      const info = await adminAPI.getWithdrawalInfo();
      setWithdrawalMethods(info.methods);
      setConversionRate(info.conversion_rate);
    } catch (error) {
      console.error('Failed to load withdrawal info:', error);
    }
  };

  const loadWithdrawalHistory = async (userId: number) => {
    try {
      const response = await adminAPI.getWithdrawalHistory(userId);
      setWithdrawalHistory(response.history || []);
    } catch (error) {
      console.error('Failed to load withdrawal history:', error);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return;

    // 1 credit per view
    const cost = campaignFormData.required_views;
    
    if (user && user.ad_balance < cost) {
      toast({ title: "Недостаточно средств", description: "Пополните рекламный баланс", variant: "destructive" });
      return;
    }

    try {
      const response = await campaignsAPI.create(
        sessionToken,
        campaignFormData.title,
        campaignFormData.url,
        campaignFormData.required_views
      );

      if (response.success) {
        toast({ title: "Успешно!", description: response.message || "Кампания создана" });
        setCampaignFormData({ title: '', url: '', required_views: 1000 });
        
        const updatedUser = await authAPI.verify(sessionToken);
        if (updatedUser.user) setUser(updatedUser.user);
      } else {
        toast({ title: "Ошибка", description: response.error || "Не удалось создать кампанию", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Проблема с подключением", variant: "destructive" });
    }
  };

  const handleStartPTC = () => {
    if (availableCampaigns.length === 0) {
      toast({ title: "Нет кампаний", description: "Пока нет доступных рекламных кампаний" });
      return;
    }
    navigate('/ptc-view');
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;
    const referralCode = formData.get('referralCode') as string;

    try {
      const response = isRegistering
        ? await authAPI.register(email, password, username, referralCode || undefined)
        : await authAPI.login(email, password);

      if (response.success && response.session_token && response.user) {
        localStorage.setItem('session_token', response.session_token);
        setUser(response.user);
        setIsLoggedIn(true);
        setShowAuthForm(false);
        loadAvailableCampaigns(response.session_token);
        loadWithdrawalInfo();
        loadWithdrawalHistory(response.user.id);
        toast({ title: "Успешно!", description: isRegistering ? "Регистрация завершена" : "Вы вошли в систему" });
      } else {
        toast({ title: "Ошибка", description: response.error || "Не удалось войти", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Проблема с подключением", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    setIsLoggedIn(false);
    setUser(null);
  };

  const handleActivateVoucher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !voucherCode.trim()) return;

    try {
      const response = await adminAPI.activateVoucher(user.id, voucherCode.trim());
      
      if (response.success) {
        toast({ 
          title: "Успешно!", 
          description: `Активировано ${response.credits_added} кредитов. Новый баланс: ${response.new_balance}` 
        });
        setVoucherCode('');
        
        // Refresh user data
        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
          const updatedUser = await authAPI.verify(sessionToken);
          if (updatedUser.user) setUser(updatedUser.user);
        }
      } else {
        toast({ 
          title: "Ошибка", 
          description: response.error || "Не удалось активировать ваучер", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Проблема с подключением", variant: "destructive" });
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const credits = parseInt(withdrawalFormData.credits);
    const methodId = parseInt(withdrawalFormData.methodId);
    const walletAddress = withdrawalFormData.walletAddress.trim();

    if (!credits || credits <= 0) {
      toast({ title: "Ошибка", description: "Введите корректное количество кредитов", variant: "destructive" });
      return;
    }

    if (credits > user.credits) {
      toast({ title: "Ошибка", description: "Недостаточно кредитов", variant: "destructive" });
      return;
    }

    if (!methodId || !walletAddress) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    try {
      const response = await adminAPI.requestWithdrawal(user.id, credits, methodId, walletAddress);
      
      if (response.success) {
        toast({ 
          title: "Успешно!", 
          description: `Запрос на вывод создан. Сумма: $${response.usd_amount?.toFixed(2)}` 
        });
        setWithdrawalFormData({ credits: '', methodId: '', walletAddress: '' });
        
        // Refresh user data and withdrawal history
        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
          const updatedUser = await authAPI.verify(sessionToken);
          if (updatedUser.user) setUser(updatedUser.user);
        }
        loadWithdrawalHistory(user.id);
      } else {
        toast({ 
          title: "Ошибка", 
          description: response.error || "Не удалось создать запрос на вывод", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Проблема с подключением", variant: "destructive" });
    }
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      const fullUrl = `${window.location.origin}?ref=${user.referral_code}`;
      navigator.clipboard.writeText(fullUrl);
      toast({ title: "Скопировано!", description: "Реферальная ссылка скопирована в буфер обмена" });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'В обработке';
      case 'completed':
        return 'Завершено';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  const statsData = [
    { label: "Активных пользователей", value: stats.total_users.toLocaleString(), icon: "Users" },
    { label: "Выплачено", value: `$${stats.total_payouts.toFixed(2)}`, icon: "DollarSign" },
    { label: "Активных кампаний", value: stats.active_campaigns.toString(), icon: "TrendingUp" },
    { label: "Средний заработок", value: `$${stats.avg_earnings.toFixed(2)}`, icon: "Award" },
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <nav className="border-b border-border/50 backdrop-blur-xl bg-background/50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Icon name="Zap" className="text-white" size={24} />
              </div>
              <span className="text-2xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ClickProfit
              </span>
            </div>
            <Button onClick={() => setShowAuthForm(true)} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              Войти
            </Button>
          </div>
        </nav>

        {showAuthForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-8 bg-gradient-to-br from-card to-muted/30 border-border/50 animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {isRegistering ? 'Регистрация' : 'Вход'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAuthForm(false)}>
                  <Icon name="X" size={20} />
                </Button>
              </div>
              
              <form onSubmit={handleAuth} className="space-y-4">
                {isRegistering && (
                  <div>
                    <Label htmlFor="username">Имя пользователя</Label>
                    <Input id="username" name="username" required className="mt-2" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" name="password" type="password" required className="mt-2" />
                </div>
                {isRegistering && (
                  <div>
                    <Label htmlFor="referralCode">Реферальный код (необязательно)</Label>
                    <Input id="referralCode" name="referralCode" className="mt-2" placeholder="Введите код реферала" />
                  </div>
                )}
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  {isRegistering ? 'Зарегистрироваться' : 'Войти'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>
            </Card>
          </div>
        )}

        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-7xl font-heading font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              Зарабатывай на кликах
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Просматривай рекламу, выполняй задания и получай реальные деньги. Начни зарабатывать прямо сейчас!
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                onClick={() => setShowAuthForm(true)}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8"
              >
                <Icon name="Zap" className="mr-2" />
                Начать зарабатывать
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="text-lg px-8"
              >
                Узнать больше
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsData.map((stat, index) => (
              <Card 
                key={index} 
                className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Icon name={stat.icon as any} className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Как это работает?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: "UserPlus", title: "Регистрация", desc: "Создай аккаунт за 30 секунд" },
                { icon: "MousePointerClick", title: "Просмотр рекламы", desc: "Смотри объявления и зарабатывай" },
                { icon: "Wallet", title: "Получи деньги", desc: "Выводи средства удобным способом" },
              ].map((step, index) => (
                <Card 
                  key={index}
                  className="p-8 text-center bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/50 transition-all duration-300"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Icon name={step.icon as any} className="text-primary" size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Icon name="Zap" className="text-white" size={24} />
            </div>
            <span className="text-2xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ClickProfit
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Card className="px-4 py-2 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="flex items-center gap-2">
                <Icon name="Coins" className="text-primary" size={20} />
                <span className="font-bold">{user?.credits.toFixed(2)} кредитов</span>
              </div>
            </Card>
            <Button variant="ghost" onClick={handleLogout}>
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Icon name="Coins" className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Баланс кредитов</p>
                <p className="text-2xl font-bold">{user?.credits.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                <Icon name="Users" className="text-secondary" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Заработано с рефералов</p>
                <p className="text-2xl font-bold">{user?.total_referral_earnings.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <Icon name="DollarSign" className="text-accent" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего выплачено</p>
                <p className="text-2xl font-bold">${user?.total_payouts.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {user?.referral_code && (
          <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground mb-2 block">Ваша реферальная ссылка</Label>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-3 py-2 rounded-lg">
                    {window.location.origin}?ref={user.referral_code}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyReferralCode}>
                    <Icon name="Copy" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="earn" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-card/50 p-1">
            <TabsTrigger value="earn" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="MousePointerClick" className="mr-2" size={16} />
              Заработать
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="Ticket" className="mr-2" size={16} />
              Пополнение
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="Wallet" className="mr-2" size={16} />
              Вывод средств
            </TabsTrigger>
            <TabsTrigger value="advertise" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="TrendingUp" className="mr-2" size={16} />
              Рекламировать
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="Shield" className="mr-2" size={16} />
              Админ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earn" className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Icon name="MousePointerClick" className="text-primary" size={40} />
                </div>
                <div>
                  <h2 className="text-3xl font-heading font-bold mb-2">Начни зарабатывать</h2>
                  <p className="text-muted-foreground">
                    Доступно кампаний: <span className="font-bold text-primary">{availableCampaigns.length}</span>
                  </p>
                </div>
                <Button 
                  size="lg"
                  onClick={handleStartPTC}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={availableCampaigns.length === 0}
                >
                  <Icon name="Play" className="mr-2" />
                  Начать просмотр
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h3 className="text-xl font-bold mb-4">Статистика</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <Icon name="MousePointerClick" className="text-primary" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground">Всего кликов</p>
                    <p className="text-xl font-bold">{user?.total_clicks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                  <Icon name="TrendingUp" className="text-secondary" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground">Активных кампаний</p>
                    <p className="text-xl font-bold">{availableCampaigns.length}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="vouchers" className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                    <Icon name="Ticket" className="text-primary" size={40} />
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-2">Активировать ваучер</h2>
                  <p className="text-muted-foreground">
                    Введите код ваучера для пополнения баланса кредитов
                  </p>
                </div>

                <form onSubmit={handleActivateVoucher} className="space-y-4">
                  <div>
                    <Label htmlFor="voucherCode">Код ваучера</Label>
                    <Input
                      id="voucherCode"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Введите код ваучера"
                      className="mt-2"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    disabled={!voucherCode.trim()}
                  >
                    <Icon name="Check" className="mr-2" />
                    Активировать
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawal" className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                    <Icon name="Wallet" className="text-primary" size={40} />
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-2">Вывод средств</h2>
                  <p className="text-muted-foreground">
                    Курс конвертации: <span className="font-bold text-primary">{conversionRate} кредитов = $1</span>
                  </p>
                </div>

                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div>
                    <Label htmlFor="credits">Количество кредитов</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={withdrawalFormData.credits}
                      onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, credits: e.target.value })}
                      placeholder="Введите количество кредитов"
                      className="mt-2"
                      min="1"
                      required
                    />
                    {withdrawalFormData.credits && conversionRate > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Вы получите: <span className="font-bold text-primary">
                          ${(parseInt(withdrawalFormData.credits) / conversionRate).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="method">Метод вывода</Label>
                    <Select
                      value={withdrawalFormData.methodId}
                      onValueChange={(value) => setWithdrawalFormData({ ...withdrawalFormData, methodId: value })}
                      required
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Выберите метод вывода" />
                      </SelectTrigger>
                      <SelectContent>
                        {withdrawalMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="walletAddress">Адрес кошелька</Label>
                    <Input
                      id="walletAddress"
                      value={withdrawalFormData.walletAddress}
                      onChange={(e) => setWithdrawalFormData({ ...withdrawalFormData, walletAddress: e.target.value })}
                      placeholder="Введите адрес кошелька"
                      className="mt-2"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    <Icon name="Send" className="mr-2" />
                    Запросить вывод
                  </Button>
                </form>
              </div>
            </Card>

            {withdrawalHistory.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <h3 className="text-xl font-bold mb-4">История выводов</h3>
                <div className="space-y-3">
                  {withdrawalHistory.map((withdrawal) => (
                    <div 
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{withdrawal.credits} кредитов</span>
                          <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
                          <span className="font-bold text-primary">${withdrawal.usd_amount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.method_name} • {withdrawal.wallet_address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(withdrawal.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(withdrawal.status)}`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="advertise" className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                    <Icon name="TrendingUp" className="text-primary" size={40} />
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-2">Создать кампанию</h2>
                  <p className="text-muted-foreground">
                    Рекламный баланс: <span className="font-bold text-primary">{user?.ad_balance.toFixed(2)} кредитов</span>
                  </p>
                </div>

                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Название кампании</Label>
                    <Input
                      id="title"
                      value={campaignFormData.title}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                      placeholder="Введите название"
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="url">URL сайта</Label>
                    <Input
                      id="url"
                      type="url"
                      value={campaignFormData.url}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, url: e.target.value })}
                      placeholder="https://example.com"
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="views">Количество просмотров</Label>
                    <Input
                      id="views"
                      type="number"
                      value={campaignFormData.required_views}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, required_views: parseInt(e.target.value) })}
                      placeholder="1000"
                      className="mt-2"
                      min="100"
                      step="100"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Стоимость: <span className="font-bold text-primary">
                        {campaignFormData.required_views} кредитов (1 кредит за просмотр)
                      </span>
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    <Icon name="Rocket" className="mr-2" />
                    Создать кампанию
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Icon name="Shield" className="text-primary" size={40} />
                </div>
                <h2 className="text-3xl font-heading font-bold">Административная панель</h2>
                <p className="text-muted-foreground">Управление системой и пользователями</p>
                <Button 
                  size="lg"
                  onClick={() => navigate('/admin')}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  <Icon name="Settings" className="mr-2" />
                  Открыть админ-панель
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
