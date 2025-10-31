import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { adminAPI } from "@/lib/api";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ credits_to_usd_rate: "100" });
  const [voucherForm, setVoucherForm] = useState({ credits: 100, count: 10 });
  const [newRate, setNewRate] = useState(100);

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [vouchersRes, withdrawalsRes, settingsRes] = await Promise.all([
        adminAPI.getVouchers(),
        adminAPI.getWithdrawals(),
        fetch(`https://functions.poehali.dev/6a1dc141-0dd3-4944-b24a-072bdd7c2393?action=settings`).then(r => r.json())
      ]);

      if (vouchersRes.vouchers) setVouchers(vouchersRes.vouchers);
      if (withdrawalsRes.withdrawals) setWithdrawals(withdrawalsRes.withdrawals);
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
        setNewRate(parseFloat(settingsRes.settings.credits_to_usd_rate || "100"));
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить данные", variant: "destructive" });
    }
  };

  const handleGenerateVouchers = async () => {
    try {
      const response = await adminAPI.generateVouchers(voucherForm.credits, voucherForm.count);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vouchers_${voucherForm.count}.csv`;
      a.click();
      
      toast({ title: "Успешно!", description: `Сгенерировано ${voucherForm.count} ваучеров` });
      loadData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось сгенерировать ваучеры", variant: "destructive" });
    }
  };

  const handleProcessWithdrawal = async (requestId: number, status: 'completed' | 'rejected') => {
    try {
      await adminAPI.processWithdrawal(requestId, status);
      toast({ title: "Успешно!", description: `Выплата ${status === 'completed' ? 'одобрена' : 'отклонена'}` });
      loadData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обработать выплату", variant: "destructive" });
    }
  };

  const handleUpdateRate = async () => {
    try {
      await adminAPI.updateRate(newRate);
      toast({ title: "Успешно!", description: "Курс обновлён" });
      loadData();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить курс", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <nav className="border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold">Админ-панель</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="vouchers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vouchers">Ваучеры</TabsTrigger>
            <TabsTrigger value="withdrawals">Выплаты</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Генерация ваучеров</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="credits">Номинал (кредиты)</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={voucherForm.credits}
                    onChange={(e) => setVoucherForm({ ...voucherForm, credits: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor="count">Количество</Label>
                  <Input
                    id="count"
                    type="number"
                    value={voucherForm.count}
                    onChange={(e) => setVoucherForm({ ...voucherForm, count: parseInt(e.target.value) })}
                    min={1}
                    max={1000}
                  />
                </div>
              </div>
              <Button onClick={handleGenerateVouchers} className="w-full">
                <Icon name="Download" size={18} className="mr-2" />
                Сгенерировать и скачать CSV
              </Button>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">История ваучеров</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {vouchers.map((voucher) => (
                  <div key={voucher.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <code className="text-sm font-mono">{voucher.code}</code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {voucher.credits} кредитов • {new Date(voucher.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={voucher.is_used ? "secondary" : "default"}>
                      {voucher.is_used ? "Использован" : "Активен"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold">{withdrawal.username} ({withdrawal.email})</h3>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.credits} кредитов → ${withdrawal.usd_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.method_name} • {withdrawal.wallet_address}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(withdrawal.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      withdrawal.status === 'completed' ? 'default' :
                      withdrawal.status === 'rejected' ? 'destructive' : 'secondary'
                    }
                  >
                    {withdrawal.status === 'completed' ? 'Одобрено' :
                     withdrawal.status === 'rejected' ? 'Отклонено' : 'Ожидает'}
                  </Badge>
                </div>

                {withdrawal.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleProcessWithdrawal(withdrawal.id, 'completed')}
                      variant="default"
                      size="sm"
                    >
                      <Icon name="Check" size={16} className="mr-2" />
                      Одобрить
                    </Button>
                    <Button
                      onClick={() => handleProcessWithdrawal(withdrawal.id, 'rejected')}
                      variant="destructive"
                      size="sm"
                    >
                      <Icon name="X" size={16} className="mr-2" />
                      Отклонить
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Курс конвертации</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Текущий курс: {settings.credits_to_usd_rate} кредитов = $1
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="rate">Новый курс (кредитов за $1)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleUpdateRate}>
                    <Icon name="Save" size={18} className="mr-2" />
                    Обновить
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Текущие ценники</h2>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Стоимость просмотра (рекламодатель)</span>
                  <span className="font-bold">1 кредит</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Награда за просмотр (пользователь)</span>
                  <span className="font-bold">0.7 кредита</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Реферальный бонус</span>
                  <span className="font-bold">0.1 кредита</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
