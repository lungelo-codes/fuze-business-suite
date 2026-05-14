import { apiGet, apiPost } from "@/lib/api/client";

export const inventoryApi = {
  items: () => apiGet("/api/crud/items"),
  suppliers: () => apiGet("/api/crud/suppliers"),
  purchaseOrders: () => apiGet("/api/crud/purchase-orders"),
  createItem: (body: Record<string, unknown>) => apiPost("/api/crud/items", body),
};
