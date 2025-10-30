import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"user" | "advertiser">("user");
  const [balance, setBalance] = useState(12.45);
  const [adBalance, setAdBalance] = useState(250.0);
  const [timer, setTimer] = useState(15);
  const [isWatching, setIsWatching] = useState(false);

  const stats = [
    { label: "Активных пользователей", value: "12,547", icon: "Users" },
    { label: "Выплачено", value: "$48,920", icon: "DollarSign" },
    { label: "Активных кампаний", value: "324", icon: "TrendingUp" },
    { label: "Средний заработок", value: "$3.89", icon: "Award" },
  ];

  const ptcAds = [
    { id: 1, title: "Онлайн курс по программированию", reward: 0.05, duration: 15 },
    { id: 2, title: "Новый крипто-кошелек", reward: 0.08, duration: 20 },
    { id: 3, title: "Маркетплейс товаров", reward: 0.03, duration: 10 },
    { id: 4, title: "Образовательная платформа", reward: 0.06, duration: 15 },
  ];

  const earningsData = [
    { date: "26 Окт", amount: 2.45 },
    { date: "27 Окт", amount: 3.12 },
    { date: "28 Окт", amount: 1.89 },
    { date: "29 Окт", amount: 4.56 },
    { date: "30 Окт", amount: 0.43 },
  ];

  const handleStartWatch = () => {
    setIsWatching(true);
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setIsWatching(false);
          setBalance((prevBalance) => prevBalance + 0.05);
          setTimer(15);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
            <Button onClick={() => setIsLoggedIn(true)} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              Войти
            </Button>
          </div>
        </nav>

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
                onClick={() => setIsLoggedIn(true)}
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
            {stats.map((stat, index) => (
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
                <span className="font-bold text-lg">${balance.toFixed(2)}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Icon name="User" size={20} />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
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
                  ${balance.toFixed(2)}
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Сегодня</div>
                  <Icon name="TrendingUp" className="text-secondary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">$0.43</div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Всего кликов</div>
                  <Icon name="MousePointerClick" className="text-accent" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">247</div>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <Icon name="MousePointerClick" className="text-primary" size={28} />
                Смотри и зарабатывай
              </h2>

              <div className="grid gap-4">
                {ptcAds.map((ad) => (
                  <Card key={ad.id} className="p-6 bg-gradient-to-r from-muted/50 to-muted/30 border-border/50 hover:border-primary/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-heading font-semibold mb-2">{ad.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" size={16} />
                            {ad.duration} сек
                          </span>
                          <span className="flex items-center gap-1 text-primary font-semibold">
                            <Icon name="DollarSign" size={16} />
                            {ad.reward.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={handleStartWatch}
                        disabled={isWatching}
                        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      >
                        {isWatching ? `${timer}s` : "Смотреть"}
                      </Button>
                    </div>
                    {isWatching && (
                      <div className="mt-4">
                        <Progress value={(1 - timer / 15) * 100} className="h-2" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <Icon name="BarChart3" className="text-primary" size={28} />
                Статистика заработка
              </h2>

              <div className="space-y-4">
                {earningsData.map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <span className="font-medium">{day.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                          style={{ width: `${(day.amount / 5) * 100}%` }}
                        />
                      </div>
                      <span className="font-bold w-16 text-right">${day.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                  ${adBalance.toFixed(2)}
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">Активных кампаний</div>
                  <Icon name="TrendingUp" className="text-secondary" size={20} />
                </div>
                <div className="text-4xl font-heading font-bold">3</div>
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
