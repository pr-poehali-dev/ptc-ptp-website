import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { ptcViewAPI, campaignsAPI, type Campaign } from "@/lib/api";

const CAPTCHA_IMAGES = [
  { id: 1, emoji: "🐶", name: "dog" },
  { id: 2, emoji: "🐱", name: "cat" },
  { id: 3, emoji: "🦁", name: "lion" },
  { id: 4, emoji: "🐘", name: "elephant" },
  { id: 5, emoji: "🦊", name: "fox" },
  { id: 6, emoji: "🐼", name: "panda" },
  { id: 7, emoji: "🦉", name: "owl" },
  { id: 8, emoji: "🦋", name: "butterfly" },
];

const PTCView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(5);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaTarget, setCaptchaTarget] = useState<typeof CAPTCHA_IMAGES[0] | null>(null);
  const [captchaOptions, setCaptchaOptions] = useState<typeof CAPTCHA_IMAGES>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      navigate('/');
      return;
    }

    campaignsAPI.getAvailable(sessionToken).then((response) => {
      if (response.campaigns && response.campaigns.length > 0) {
        setAllCampaigns(response.campaigns);
        setCurrentCampaign(response.campaigns[0]);
      } else {
        toast({ title: "Нет кампаний", description: "Пока нет доступных рекламных кампаний" });
        navigate('/');
      }
    });
  }, [navigate, toast]);

  useEffect(() => {
    if (currentCampaign && timer > 0 && !showCaptcha) {
      let isPageVisible = !document.hidden;
      
      const handleVisibilityChange = () => {
        isPageVisible = !document.hidden;
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      const interval = setInterval(() => {
        if (isPageVisible) {
          setTimer((prev) => prev - 1);
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else if (timer === 0 && !showCaptcha) {
      generateCaptcha();
      setShowCaptcha(true);
    }
  }, [timer, currentCampaign, showCaptcha]);

  const generateCaptcha = () => {
    const shuffled = [...CAPTCHA_IMAGES].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const wrongOptions = shuffled.slice(1, 4);
    const options = [target, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCaptchaTarget(target);
    setCaptchaOptions(options);
  };

  const handleCaptchaAnswer = async (selectedId: number) => {
    if (isProcessing || !currentCampaign || !captchaTarget) return;
    
    const isCorrect = selectedId === captchaTarget.id;
    
    if (!isCorrect) {
      toast({ title: "Неверно!", description: "Попробуй ещё раз", variant: "destructive" });
      generateCaptcha();
      return;
    }

    setIsProcessing(true);
    const sessionToken = localStorage.getItem('session_token');
    
    if (!sessionToken) {
      navigate('/');
      return;
    }

    try {
      const response = await ptcViewAPI.complete(sessionToken, currentCampaign.id, true);
      
      if (response.success) {
        toast({ 
          title: "Успешно!", 
          description: `Заработано $${response.reward?.toFixed(4)}. Баланс: $${response.new_balance?.toFixed(2)}` 
        });
        
        if (currentCampaign.url) {
          window.open(currentCampaign.url, '_blank');
        }
        
        const nextIndex = currentIndex + 1;
        if (nextIndex < allCampaigns.length) {
          setCurrentIndex(nextIndex);
          setCurrentCampaign(allCampaigns[nextIndex]);
          setTimer(5);
          setShowCaptcha(false);
          setIsProcessing(false);
        } else {
          toast({ title: "Все кампании просмотрены!", description: "Возвращаемся в кабинет" });
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        toast({ title: "Ошибка", description: response.error || "Не удалось засчитать просмотр", variant: "destructive" });
        setIsProcessing(false);
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Проблема с подключением", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (!currentCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <Card className="p-8 bg-gradient-to-br from-card to-muted/30 border-border/50">
          <p className="text-muted-foreground">Загрузка...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      <div className="bg-gradient-to-r from-card to-muted/50 border-b border-border/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon name="Eye" className="text-primary" size={24} />
            <span className="font-heading font-bold text-lg">{currentCampaign.title}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {allCampaigns.length}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!showCaptcha && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20">
              <Icon name="Clock" className="text-primary" size={20} />
              <span className="font-bold text-lg">{timer}s</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent/20 to-primary/20">
            <Icon name="DollarSign" className="text-accent" size={20} />
            <span className="font-bold">${currentCampaign.reward.toFixed(4)}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      {!showCaptcha && timer > 0 && (
        <div className="px-4 py-2">
          <Progress value={((5 - timer) / 5) * 100} className="h-1" />
        </div>
      )}

      {showCaptcha ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-8 max-w-2xl w-full bg-gradient-to-br from-card to-muted/30 border-border/50 animate-scale-in">
            <h2 className="text-3xl font-heading font-bold mb-6 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Решите капчу
            </h2>
            
            <div className="mb-8 text-center">
              <p className="text-muted-foreground mb-4">Выбери такую же картинку:</p>
              <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/50">
                <div 
                  className="text-8xl select-none pointer-events-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {captchaTarget?.emoji}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {captchaOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleCaptchaAnswer(option.id)}
                  disabled={isProcessing}
                  className="p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-border hover:border-primary transition-all hover:scale-105 disabled:opacity-50"
                >
                  <div className="text-6xl">{option.emoji}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex-1 relative">
          <iframe
            key={currentCampaign.id}
            ref={iframeRef}
            src={currentCampaign.url}
            className="w-full h-full border-0"
            title="Advertisement"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
};

export default PTCView;