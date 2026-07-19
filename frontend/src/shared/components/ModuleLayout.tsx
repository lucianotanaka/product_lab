import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiGet } from "../services/api";
import type { Paginated } from "../services/api";
import "../styles/modules.css";

export interface Product {
  product_id: number;
  name: string;
  status: string;
}

interface Props {
  moduleIcon: string;
  moduleName: string;
  moduleAccent: string;
  showProductSelector?: boolean;
  selectedProductId?: string;
  onProductChange?: (id: string) => void;
  children: React.ReactNode;
}

export default function ModuleLayout({
  moduleIcon,
  moduleName,
  moduleAccent,
  showProductSelector = true,
  selectedProductId = "",
  onProductChange,
  children,
}: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!showProductSelector) return;
    apiGet<Paginated<Product>>("/products?size=100")
      .then((r) => setProducts(r.items))
      .catch(() => {});
  }, [showProductSelector]);

  const firstName = user?.user_full_name?.split(" ")[0]?.toUpperCase() ?? "USER";

  return (
    <div className="mod-root">
      {/* NAV */}
      <nav className="mod-nav">
        <div className="mod-nav__inner">
          <button className="mod-nav__back" onClick={() => navigate("/home", { state: { scrollTo: "modules" } })}>
            ⟨ HOME
          </button>
          <div className="mod-nav__title">
            <span className="mod-nav__icon">{moduleIcon}</span>
            <span className="mod-nav__name">
              {moduleName.replace(moduleAccent, "")}<span className="mod-nav__accent">{moduleAccent}</span>
            </span>
          </div>

          {showProductSelector && (
            <div className="mod-nav__product">
              <span className="mod-nav__product-label">PRODUTO:</span>
              <select
                className="mod-nav__product-select"
                value={selectedProductId}
                onChange={(e) => onProductChange?.(e.target.value)}
              >
                <option value="">— TODOS —</option>
                {products.map((p) => (
                  <option key={p.product_id} value={String(p.product_id)}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mod-nav__user">
            <span className="mod-nav__user-dot" />
            {firstName}
          </div>

          <button
            className="mod-nav__back"
            style={{ borderColor: "rgba(255,107,107,0.3)", color: "#ff6b6b" }}
            onClick={() => { logout(); navigate("/"); }}
          >
            ⏻ SAIR
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="mod-main">{children}</main>
    </div>
  );
}
