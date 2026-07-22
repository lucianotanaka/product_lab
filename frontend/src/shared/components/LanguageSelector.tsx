import { useAuth } from "../../contexts/AuthContext";

const LANGS = [
  { code: "en" as const, flag: "🇺🇸", label: "EN" },
  { code: "pt" as const, flag: "🇧🇷", label: "PT" },
  { code: "es" as const, flag: "🇪🇸", label: "ES" },
];

interface Props {
  variant?: "hud" | "mod";
}

export default function LanguageSelector({ variant = "hud" }: Props) {
  const { user, setLanguage } = useAuth();
  const current = user?.user_language ?? "en";

  return (
    <div className={`lang-selector lang-selector--${variant}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          className={`lang-btn${current === l.code ? " lang-btn--active" : ""}`}
          onClick={() => setLanguage(l.code)}
          title={l.label}
          aria-pressed={current === l.code}
        >
          <span className="lang-btn__flag">{l.flag}</span>
          <span className="lang-btn__label">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
