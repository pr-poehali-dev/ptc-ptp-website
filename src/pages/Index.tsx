import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { authAPI, statsAPI, type User } from "@/lib/api";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"user" | "advertiser">("user");
  const [stats, setStats] = useState({ total_users: 0, active_campaigns: 0, total_payouts: 0, avg_earnings: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      authAPI.verify(sessionToken).then((response) => {
        if (response.success && response.user) {
          setUser(response.user);
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('session_token');
        }
      });
    }
    
    statsAPI.getStats().then(setStats);
  }, []);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    try {
      const response = isRegistering
        ? await authAPI.register(email, password, username)
        : await authAPI.login(email, password);

      if (response.success && response.session_token && response.user) {
        localStorage.setItem('session_token', response.session_token);
        setUser(response.user);
        setIsLoggedIn(true);
        setShowAuthForm(false);
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
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Монетизируй своё время! Смотри рекламу, получай деньги. Рекламодатели — привлекай целевую аудиторию.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => { setShowAuthForm(true); setIsRegistering(true); }}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6 rounded-2xl"
              >
                <Icon name="Rocket" className="mr-2" size={20} />
                Начать зарабатывать
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary/50 hover:bg-primary/10 text-lg px-8 py-6 rounded-2xl"
              >
                <Icon name="Play" className="mr-2" size={20} />
                Как это работает
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statsData.map((stat, index) => (
              <Card
                key={index}
                className="p-6 bg-gradient-to-br from-card to-muted/50 border-border/50 backdrop-blur-sm animate-scale-in hover:scale-105 transition-transform"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Icon name={stat.icon} className="text-primary" size={24} />
                  </div>
                  <div className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "MousePointerClick",
                title: "Смотри и зарабатывай",
                description: "Переходи по ссылкам рекламодателей и получай вознаграждение за каждый просмотр",
              },
              {
                icon: "BarChart3",
                title: "Отслеживай прогресс",
                description: "Детальная статистика заработка и аналитика в реальном времени",
              },
              {
                icon: "Wallet",
                title: "Выводи деньги",
                description: "Быстрый вывод средств на удобный для тебя способ оплаты",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50 hover:border-primary/50 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6">
                  <Icon name={feature.icon} className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-50">
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
            <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
              <div className="flex items-center gap-2">
                <Icon name="Wallet" className="text-primary" size={20} />
                <span className="font-bold text-lg">${user?.balance.toFixed(2)}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-heading font-bold mb-2">
            Добро пожаловать, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.username}</span>!
          </h2>
          <p className="text-muted-foreground">Выбери роль для продолжения</p>
        </div>

        <Tabs defaultValue={userRole} onValueChange={(v) => setUserRole(v as "user" | "advertiser")}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-muted/50 p-1">
            <TabsTrigger value="user" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="Eye" className="mr-2" size={16} />
              Пользователь
            </TabsTrigger>
            <TabsTrigger value="advertiser" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary">
              <Icon name="Megaphone" className="mr-2" size={16} />
              Рекламодатель
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Баланс</div>
                  <Icon name="Wallet" className="text-primary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ${user?.balance.toFixed(2)}
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Всего кликов</div>
                  <Icon name="MousePointerClick" className="text-accent" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">{user?.total_clicks}</div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Сегодня</div>
                  <Icon name="TrendingUp" className="text-secondary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">$0.00</div>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <Icon name="MousePointerClick" className="text-primary" size={28} />
                Смотри и зарабатывай
              </h2>
              <p className="text-muted-foreground text-center py-12">Пока нет активных кампаний. Загляни позже!</p>
            </Card>
          </TabsContent>

          <TabsContent value="advertiser" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Рекламный баланс</div>
                  <Icon name="Wallet" className="text-primary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ${user?.ad_balance.toFixed(2)}
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Активных кампаний</div>
                  <Icon name="TrendingUp" className="text-secondary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">0</div>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <Icon name="Link" className="text-primary" size={28} />
                Добавить ссылку PTC
              </h2>

              <div className="space-y-4 max-w-2xl">
                <div>
                  <Label htmlFor="url">URL рекламы</Label>
                  <Input id="url" placeholder="https://example.com" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input id="title" placeholder="Название вашей кампании" className="mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Длительность (сек)</Label>
                    <Input id="duration" type="number" placeholder="15" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="reward">Награда ($)</Label>
                    <Input id="reward" type="number" step="0.01" placeholder="0.05" className="mt-2" />
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  <Icon name="Plus" className="mr-2" size={20} />
                  Создать кампанию
                </Button>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <Icon name="CreditCard" className="text-primary" size={28} />
                Пополнить баланс
              </h2>

              <div className="grid md:grid-cols-3 gap-4 max-w-2xl">
                {[50, 100, 250].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-24 text-2xl font-heading font-bold border-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>

              <div className="mt-6 max-w-2xl">
                <Label htmlFor="custom">Своя сумма</Label>
                <div className="flex gap-2 mt-2">
                  <Input id="custom" type="number" placeholder="Введите сумму" />
                  <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">Пополнить</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
