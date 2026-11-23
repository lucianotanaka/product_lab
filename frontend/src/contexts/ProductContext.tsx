import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiGet } from "../shared/services/api";
import type { Paginated } from "../shared/services/api";
import { useAuth } from "./AuthContext";
import { useCompany } from "./CompanyContext";

export interface ProductOption {
  product_id: number;
  name: string;
  status: string;
}

interface ProductContextValue {
  productId: string;
  productName: string;
  setProduct: (id: string, name: string) => void;
  products: ProductOption[];
}

const ProductContext = createContext<ProductContextValue>({
  productId: "",
  productName: "",
  setProduct: () => {},
  products: [],
});

export function ProductProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [productId, setProductId] = useState(localStorage.getItem("pl_product") ?? "");
  const [productName, setProductName] = useState(localStorage.getItem("pl_product_name") ?? "");
  const [products, setProducts] = useState<ProductOption[]>([]);

  const { companyId } = useCompany();

  // Busca produtos filtrados pela empresa selecionada
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const companyFilter = companyId ? `&company_id=${companyId}` : "";
    apiGet<Paginated<ProductOption>>(`/products?size=100${companyFilter}`)
      .then(r => {
        setProducts(r.items);

        if (productId) {
          const found = r.items.find(p => String(p.product_id) === productId);
          if (found) {
            // Sincroniza o nome caso esteja desatualizado no localStorage
            if (found.name !== productName) setProductName(found.name);
          } else {
            // Produto salvo não existe mais — limpa a seleção para evitar erros silenciosos
            setProductId("");
            setProductName("");
            localStorage.removeItem("pl_product");
            localStorage.removeItem("pl_product_name");
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated, isLoading, companyId]);

  const setProduct = (id: string, name: string) => {
    setProductId(id);
    setProductName(name);
    localStorage.setItem("pl_product", id);
    localStorage.setItem("pl_product_name", name);
  };

  return (
    <ProductContext.Provider value={{ productId, productName, setProduct, products }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  return useContext(ProductContext);
}
