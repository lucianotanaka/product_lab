import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiGet } from "../shared/services/api";
import { useAuth } from "./AuthContext";

export interface CompanyOption {
  id: number;
  company_name: string;
  company_type: string;
  is_active: boolean;
}

interface CompanyContextValue {
  companyId: string;
  companyName: string;
  setCompany: (id: string, name: string) => void;
  companies: CompanyOption[];
  loadingCompanies: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: "",
  companyName: "",
  setCompany: () => {},
  companies: [],
  loadingCompanies: false,
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [companyId, setCompanyId] = useState(localStorage.getItem("pl_company") ?? "");
  const [companyName, setCompanyName] = useState(localStorage.getItem("pl_company_name") ?? "");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    setLoadingCompanies(true);
    apiGet<CompanyOption[]>("/companies/mine")
      .then(items => {
        setCompanies(items);

        if (companyId) {
          const found = items.find(c => String(c.id) === companyId);
          if (found) {
            if (found.company_name !== companyName) setCompanyName(found.company_name);
          } else {
            // Company saved no longer accessible — clear
            setCompanyId("");
            setCompanyName("");
            localStorage.removeItem("pl_company");
            localStorage.removeItem("pl_company_name");
          }
        } else if (items.length === 1) {
          // Auto-select when only one company
          setCompanyId(String(items[0].id));
          setCompanyName(items[0].company_name);
          localStorage.setItem("pl_company", String(items[0].id));
          localStorage.setItem("pl_company_name", items[0].company_name);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, [isAuthenticated, isLoading]);

  const setCompany = (id: string, name: string) => {
    setCompanyId(id);
    setCompanyName(name);
    localStorage.setItem("pl_company", id);
    localStorage.setItem("pl_company_name", name);
    // Clear product selection when switching company
    localStorage.removeItem("pl_product");
    localStorage.removeItem("pl_product_name");
  };

  return (
    <CompanyContext.Provider value={{ companyId, companyName, setCompany, companies, loadingCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
