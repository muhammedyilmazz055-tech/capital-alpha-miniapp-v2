"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./page.module.css";

interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

type WebAppType = any;

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [vipStatus, setVipStatus] = useState<"loading" | "active" | "inactive">("loading");
  const webAppRef = useRef<WebAppType | null>(null);
  const [webAppReady, setWebAppReady] = useState(false);
  const [themeParams, setThemeParams] = useState<any>({});

  useEffect(() => {
    import("@twa-dev/sdk").then((mod) => {
      const WebApp = mod.default;
      webAppRef.current = WebApp;
      setWebAppReady(true);
      
      // Apply Telegram theme CSS variables
      if (WebApp.themeParams) {
        setThemeParams(WebApp.themeParams);
        applyThemeParams(WebApp.themeParams);
      }
      
      // Listen for theme changes
      WebApp.onEvent("themeChanged", (params: any) => {
        applyThemeParams(params);
        setThemeParams(params);
      });

      WebApp.ready();
      WebApp.expand();
      
      // Set header/background colors from theme
      if (WebApp.setHeaderColor && themeParams.bg_color) {
        WebApp.setHeaderColor(themeParams.bg_color);
      }
      if (WebApp.setBackgroundColor && themeParams.bg_color) {
        WebApp.setBackgroundColor(themeParams.bg_color);
      }
      
      if (WebApp.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
      setInitData(WebApp.initData);
    });
  }, []);

  const applyThemeParams = (params: Record<string, string>) => {
    const root = document.documentElement;
    Object.entries(params).forEach(([key, value]) => {
      root.style.setProperty(`--tg-theme-${key.replace(/_/g, "-")}`, value);
    });
  };

  useEffect(() => {
    if (initData && webAppReady) {
      checkVipStatus();
    }
  }, [initData, webAppReady]);

  const checkVipStatus = async () => {
    try {
      const res = await fetch(`/api/vip/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const data = await res.json();
      setVipStatus(data.is_vip ? "active" : "inactive");
    } catch {
      setVipStatus("inactive");
    }
  };

  const openVipPayment = () => {
    webAppRef.current?.openTelegramLink("https://t.me/CapitalAlphaBot?start=vip");
  };

  const openMiniApp = () => {
    // Navigate to VIP panel within mini app
  };

  const openTelegramLink = (url: string) => {
    console.log('Opening link:', url);
    webAppRef.current?.openLink?.(url, { tryInstantView: true });
    // Fallback for older SDK
    webAppRef.current?.openTelegramLink?.(url);
  };

  // Haptic feedback helper
  const haptic = (type: "light" | "medium" | "heavy" | "success" | "error" = "light") => {
    webAppRef.current?.HapticFeedback?.impactOccurred?.(type);
    webAppRef.current?.HapticFeedback?.notificationOccurred?.(type);
  };

  if (!user) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>Capital Alpha</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.username}>@{user.username || user.first_name}</span>
          {user.is_premium && <span className={styles.premiumBadge}>★ Premium</span>}
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>💎 VIP Durumu</h2>
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
          <button 
            className={styles.btnPrimary} 
            onClick={() => { haptic("medium"); openVipPayment(); }}
          >
            ⭐ VIP Satın Al (Telegram Stars)
          </button>
        )}
        {vipStatus === "active" && (
          <button 
            className={styles.btnSecondary} 
            onClick={() => { haptic("light"); openMiniApp(); }}
          >
            📊 VIP Paneline Git
          </button>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>⚡ Hızlı İşlemler</h3>
        <div className={styles.grid}>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=alpha"); }}
          >
            <span className={styles.actionIcon}>📊</span>
            <span>Günlük Alpha</span>
          </button>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=leaderboard"); }}
          >
            <span className={styles.actionIcon}>🏆</span>
            <span>Liderlik Tablosu</span>
          </button>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=points"); }}
          >
            <span className={styles.actionIcon}>💰</span>
            <span>Puanlarım</span>
          </button>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=referral"); }}
          >
            <span className={styles.actionIcon}>👥</span>
            <span>Arkadaş Davet Et</span>
          </button>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=trade_idea"); }}
          >
            <span className={styles.actionIcon}>📈</span>
            <span>Trade Idea Paylaş</span>
          </button>
          <button 
            className={styles.actionCard} 
            onClick={() => { haptic("light"); openTelegramLink("https://t.me/CapitalAlphaBot?start=submit_alpha"); }}
          >
            <span className={styles.actionIcon}>📝</span>
            <span>Alpha Gönder</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎓 Stratejiler</h3>
        <div className={styles.grid}>
          <div className={styles.infoCard}>
            <h4>💰 Funding Rate Arbitraj</h4>
            <p>Perpetual futures'ta funding fee toplayarak risksiz getiri. Yıllık %5-15 APR.</p>
          </div>
          <div className={styles.infoCard}>
            <h4>📈 Basis Trade (Cash & Carry)</h4>
            <p>Futures-spot spread'ini kapatarak delta-nötr pozisyon. Yıllık %4-12 APR.</p>
          </div>
          <div className={styles.infoCard}>
            <h4>🔄 DCA (Dollar Cost Averaging)</h4>
            <p>Sabit aralıklarla alım yaparak ortalama maliyeti düşür. Otomatik bot desteği.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>👥 Topluluk</h3>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>1,247</span>
            <span className={styles.statLabel}>Aktif Üye</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>342</span>
            <span className={styles.statLabel}>Paylaşılan Alpha</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>89</span>
            <span className={styles.statLabel}>Trade Ideas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>12.5%</span>
            <span className={styles.statLabel}>Ort. APR (Funding)</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>⚠️ Bu uygulama yatırım tavsiyesi değildir. Paper trading ile test edin.</p>
        <p className={styles.links}>
          <a href="https://t.me/CapitalAlphaClub" target="_blank" rel="noopener noreferrer">Kanal</a> •
          <a href="https://t.me/CapitalAlphaVIP" target="_blank" rel="noopener noreferrer">VIP</a> •
          <a href="https://t.me/CapitalAlphaBot" target="_blank" rel="noopener noreferrer">Bot</a>
        </p>
      </footer>
    </div>
  );
}