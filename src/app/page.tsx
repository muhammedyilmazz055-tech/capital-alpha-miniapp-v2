"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ThemeParams {
  [key: string]: string | undefined;
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface WebAppType {
  ready: () => void;
  expand: () => void;
  close: () => void;
  themeParams: ThemeParams;
  onEvent: (event: string, callback: (params: ThemeParams) => void) => void;
  offEvent: (event: string, callback: (params: ThemeParams) => void) => void;
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openLink: (url: string, options?: { tryInstantView?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  HapticFeedback: {
    impactOccurred: (type: "light" | "medium" | "heavy" | "success" | "error") => void;
    notificationOccurred: (type: "light" | "medium" | "heavy" | "success" | "error") => void;
    selectionChanged: () => void;
  };
}

export interface VipStatusResponse {
  is_vip: boolean;
  expires_at?: number;
}

type VipStatus = "loading" | "active" | "inactive";

const API_BASE = "";

function parseUserFromInitData(initData: string | null): TelegramUser | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get("user");
    if (userParam) {
      return JSON.parse(decodeURIComponent(userParam));
    }
  } catch (e) {
    console.warn("Failed to parse user from initData:", e);
  }
  return null;
}

function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<WebAppType | null>(null);
  const [webAppReady, setWebAppReady] = useState(false);
  const [themeParams, setThemeParams] = useState<ThemeParams>({});
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 20; // ~2 seconds total (100ms * 20)

    const tryInit = () => {
      if (!mounted) return;

      const WebApp = (window as any).Telegram?.WebApp;

      if (!WebApp) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 100);
          return;
        }
        console.error("Telegram WebApp not available after retries");
        setWebAppReady(true); // Prevent infinite loading
        return;
      }

      setWebApp(WebApp as unknown as WebAppType);
      setWebAppReady(true);

      if (WebApp.themeParams) {
        const params: ThemeParams = WebApp.themeParams as unknown as ThemeParams;
        setThemeParams(params);
        applyThemeParams(params);
      }

      const handleThemeChange = (params: ThemeParams) => {
        applyThemeParams(params);
        setThemeParams(params);
      };

      WebApp.onEvent("themeChanged", handleThemeChange as any);

      WebApp.ready();
      WebApp.expand();

      if (WebApp.setHeaderColor && WebApp.themeParams.bg_color) {
        WebApp.setHeaderColor(WebApp.themeParams.bg_color);
      }
      if (WebApp.setBackgroundColor && WebApp.themeParams.bg_color) {
        WebApp.setBackgroundColor(WebApp.themeParams.bg_color);
      }

      // Try initDataUnsafe first, fallback to parsing initData
      let userData = WebApp.initDataUnsafe?.user;
      if (!userData) {
        userData = parseUserFromInitData(WebApp.initData);
      }
      if (userData) {
        setUser(userData);
      }
      setInitData(WebApp.initData);
    };

    tryInit();

    return () => {
      mounted = false;
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp) {
        // best-effort cleanup; handler ref not tracked across retries
      }
    };
  }, []);

  return { webApp, webAppReady, themeParams, user, initData };
}

function applyThemeParams(params: ThemeParams) {
  const root = document.documentElement;
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      root.style.setProperty(`--tg-theme-${key.replace(/_/g, "-")}`, value);
    }
  });
}

function useHapticFeedback(webApp: WebAppType | null) {
  return useCallback(
    (type: "light" | "medium" | "heavy" | "success" | "error" = "light") => {
      webApp?.HapticFeedback?.impactOccurred?.(type);
      webApp?.HapticFeedback?.notificationOccurred?.(type);
    },
    [webApp]
  );
}

function useNavigation(webApp: WebAppType | null) {
  return useCallback(
    (url: string) => {
      console.log("[Navigation] Opening:", url);
      webApp?.openLink?.(url, { tryInstantView: true });
      webApp?.openTelegramLink?.(url);
    },
    [webApp]
  );
}

function useVipStatus(initData: string | null, webAppReady: boolean) {
  const [vipStatus, setVipStatus] = useState<VipStatus>("loading");

  useEffect(() => {
    if (!initData || initData === "" || !webAppReady) return;
    
    let mounted = true;

    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/vip/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const data: VipStatusResponse = await res.json();
        if (mounted) setVipStatus(data.is_vip ? "active" : "inactive");
      } catch {
        if (mounted) setVipStatus("inactive");
      }
    }

    check();
    return () => { mounted = false; };
  }, [initData, webAppReady]);

  return vipStatus;
}

function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const baseStyles = [
    styles.btn,
    styles[variant],
    styles[size],
    disabled || loading ? styles.disabled : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={baseStyles}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      <span className={styles.btnText}>{children}</span>
    </button>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`${styles.actionCard} ${disabled ? styles.disabled : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.actionIcon}>{icon}</span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className={styles.infoCard}>
      <h4>{icon} {title}</h4>
      <p>{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className={styles.loading} role="status" aria-label="Yükleniyor">
      <div className={styles.spinner} />
      <p>Yükleniyor...</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.error}>
      <p>⚠️ {message}</p>
      <Button variant="primary" onClick={onRetry}>
        Tekrar Dene
      </Button>
    </div>
  );
}

export default function HomePage() {
  const { webApp, webAppReady, themeParams, user, initData } = useTelegramWebApp();
  const haptic = useHapticFeedback(webApp);
  const navigate = useNavigation(webApp);
  const vipStatus = useVipStatus(initData, webAppReady);

  // Hooks MUST be called before any conditional returns
  const handleVipPurchase = useCallback(() => {
    haptic("medium");
    navigate("https://t.me/CapitalHQ_bot?start=vip");
  }, [haptic, navigate]);

  const handleVipPanel = useCallback(() => {
    haptic("light");
    // TODO: VIP panel navigation within mini app
  }, [haptic]);

  if (!webAppReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <ErrorScreen
        message="Telegram kullanıcı bilgisi alınamadı. Uygulamayı bot üzerinden açın."
        onRetry={() => webApp?.ready()}
      />
    );
  }

  const actions = [
    { icon: "📊", label: "Günlük Alpha", url: "https://t.me/CapitalHQ_bot?start=alpha" },
    { icon: "🏆", label: "Liderlik Tablosu", url: "https://t.me/CapitalHQ_bot?start=leaderboard" },
    { icon: "💰", label: "Puanlarım", url: "https://t.me/CapitalHQ_bot?start=points" },
    { icon: "👥", label: "Arkadaş Davet Et", url: "https://t.me/CapitalHQ_bot?start=referral" },
    { icon: "📈", label: "Trade Idea Paylaş", url: "https://t.me/CapitalHQ_bot?start=trade_idea" },
    { icon: "📝", label: "Alpha Gönder", url: "https://t.me/CapitalHQ_bot?start=submit_alpha" },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Capital Alpha</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.username}>@{user.username || user.first_name}</span>
          {user.is_premium && <span className={styles.premiumBadge}>★ Premium</span>}
        </div>
      </header>

      <section className={styles.card} aria-labelledby="vip-status">
        <div className={styles.cardHeader}>
          <h2 id="vip-status">💎 VIP Durumu</h2>
          <span className={vipStatus === "active" ? styles.badgeActive : styles.badgeInactive}>
            {vipStatus === "active" ? "AKTİF ✅" : vipStatus === "inactive" ? "PASİF" : "Yükleniyor..."}
          </span>
        </div>
        <p className={styles.cardDesc}>
          {vipStatus === "active"
            ? "VIP kanala erişiminiz var. Özel alpha, trade ideas ve stratejilerden yararlanın."
            : "VIP aboneliği ile özel kanala erişim, öncelikli alpha fırsatları ve gelişmiş araçlar kazanın."}
        </p>
        {vipStatus !== "active" && (
          <Button variant="primary" size="lg" onClick={handleVipPurchase}>
            ⭐ VIP Satın Al (Telegram Stars)
          </Button>
        )}
        {vipStatus === "active" && (
          <Button variant="secondary" size="lg" onClick={handleVipPanel}>
            📊 VIP Paneline Git
          </Button>
        )}
      </section>

      <section className={styles.section} aria-labelledby="quick-actions">
        <h3 className={styles.sectionTitle} id="quick-actions">⚡ Hızlı İşlemler</h3>
        <div className={styles.grid} role="list">
          {actions.map((action) => (
            <ActionCard
              key={action.url}
              icon={action.icon}
              label={action.label}
              onClick={() => {
                haptic("light");
                navigate(action.url);
              }}
            />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="strategies">
        <h3 className={styles.sectionTitle} id="strategies">🎓 Stratejiler</h3>
        <div className={styles.grid} role="list">
          <InfoCard
            icon="💰"
            title="Funding Rate Arbitraj"
            description="Perpetual futures'ta funding fee toplayarak risksiz getiri. Yıllık %5-15 APR."
          />
          <InfoCard
            icon="📈"
            title="Basis Trade (Cash & Carry)"
            description="Futures-spot spread'ini kapatarak delta-nötr pozisyon. Yıllık %4-12 APR."
          />
          <InfoCard
            icon="🔄"
            title="DCA (Dollar Cost Averaging)"
            description="Sabit aralıklarla alım yaparak ortalama maliyeti düşür. Otomatik bot desteği."
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="community">
        <h3 className={styles.sectionTitle} id="community">👥 Topluluk</h3>
        <div className={styles.statsGrid} role="list">
          <StatCard value="1,247" label="Aktif Üye" />
          <StatCard value="342" label="Paylaşılan Alpha" />
          <StatCard value="89" label="Trade Ideas" />
          <StatCard value="12.5%" label="Ort. APR (Funding)" />
        </div>
      </section>

      <footer className={styles.footer}>
        <p>⚠️ Bu uygulama yatırım tavsiyesi değildir. Paper trading ile test edin.</p>
        <p className={styles.links}>
          <a href="https://t.me/CapitalAlphaClub" target="_blank" rel="noopener noreferrer">Kanal</a> •
          <a href="https://t.me/CapitalAlphaVIP" target="_blank" rel="noopener noreferrer">VIP</a> •
          <a href="https://t.me/CapitalHQ_bot" target="_blank" rel="noopener noreferrer">Bot</a>
        </p>
      </footer>
    </div>
  );
}