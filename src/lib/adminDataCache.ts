// Global In-Memory Singleton Cache for Ghar Soaps Admin SPA
// Prevents constant re-fetching and jarring loading spinners when navigating between tabs

export interface CachedPaymentsData {
  payments: any[];
  orders: any[];
  events: any[];
  stats: any;
  gateway_info: any;
  timestamp: number;
}

export interface CachedCatalogData {
  products: any[];
  timestamp: number;
}

class AdminDataCache {
  private paymentsData: CachedPaymentsData | null = null;
  private catalogData: CachedCatalogData | null = null;

  // Payments Cache
  getPayments(): CachedPaymentsData | null {
    return this.paymentsData;
  }

  setPayments(data: Omit<CachedPaymentsData, 'timestamp'>): void {
    this.paymentsData = {
      ...data,
      timestamp: Date.now(),
    };
  }

  hasValidPayments(maxAgeMs = 30000): boolean {
    if (!this.paymentsData) return false;
    return Date.now() - this.paymentsData.timestamp < maxAgeMs;
  }

  // Catalog / Products Cache
  getCatalog(): CachedCatalogData | null {
    return this.catalogData;
  }

  setCatalog(products: any[]): void {
    this.catalogData = {
      products,
      timestamp: Date.now(),
    };
  }

  hasValidCatalog(maxAgeMs = 60000): boolean {
    if (!this.catalogData) return false;
    return Date.now() - this.catalogData.timestamp < maxAgeMs;
  }

  // Clear cache if needed (e.g., on logout or hard refresh)
  clearAll(): void {
    this.paymentsData = null;
    this.catalogData = null;
  }
}

export const adminDataCache = new AdminDataCache();

