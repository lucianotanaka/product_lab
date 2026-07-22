import { useAuth } from "../../contexts/AuthContext";

interface Props {
  /** "hud" para a HomePage (estilo pl-nav), "mod" para módulos (estilo mod-nav) */
  variant?: "hud" | "mod";
}

export default function ThemeToggle({ variant = "hud" }: Props) {
  const { user, setTheme } = useAuth();
  const isDark = user?.user_theme !== "light";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      className={variant === "hud" ? "theme-toggle theme-toggle--hud" : "theme-toggle theme-toggle--mod"}
      onClick={toggle}
      title={isDark ? "Mudar para Light Mode" : "Mudar para Dark Mode"}
      aria-label={isDark ? "Ativar Light Mode" : "Ativar Dark Mode"}
    >
      {isDark ? "☀" : "🌙"}
    </button>
  );
}
