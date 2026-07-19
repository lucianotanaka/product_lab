import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiGet } from "../shared/services/api";
import type { Paginated } from "../shared/services/api";

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
  const [productId, setProductId]   = useState(localStorage.getItem("pl_product") ?? "");
  const [productName, setProductName] = useState(localStorage.getItem("pl_product_name") ?? "");
  const [products, setProducts]     = useState<ProductOption[]>([]);

  useEffect(() => {
    apiGet<Paginated<ProductOption>>("/products?size=100")
      .then(r => {
        setProducts(r.items);
        // sync name if we have an id but no name
        if (productId && !productName) {
          const found = r.items.find(p => String(p.product_id) === productId);
          if (found) setProductName(found.name);
        }
      })
      .catch(() => {});
  }, []);

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
