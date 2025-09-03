import { useAuth } from "../components/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const get = (path: string, token?: string | null) =>
  apiFetch(path, { method: "GET" }, token);
export const post = (path: string, body: any, token?: string | null) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) }, token);
export const put = (path: string, body: any, token?: string | null) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) }, token);
export const del = (path: string, token?: string | null) =>
  apiFetch(path, { method: "DELETE" }, token);

export const pay = (productId: string, token?: string | null) =>
  post("/payments", { productId }, token);

export const addToWishlist = (productId: string, token?: string | null) =>
  post("/wishlist", { productId }, token);

export const removeFromWishlist = (productId: string, token?: string | null) =>
  del(`/wishlist/${productId}`, token);

export const getWishlist = (token?: string | null) =>
  get("/wishlist", token);

export const isInWishlist = async (productId: string, token?: string | null) => {
  try {
    const wishlist = await getWishlist(token);
    return wishlist.some((item: any) => item.productId === productId);
  } catch {
    return false;
  }
};

export const startConversation = (user1Id: string, user2Id: string, token?: string | null) =>
  post("/messages/conversations", { user1Id, user2Id }, token);

export const getMessages = (conversationId: string, token?: string | null) =>
  get(`/messages/conversations/${conversationId}/messages`, token);

export const sendMessage = (conversationId: string, senderId: string, content: string, token?: string | null) =>
  post(`/messages/conversations/${conversationId}/messages`, { senderId, content }, token);

export const getConversations = (token?: string | null) =>
  get("/messages/conversations", token);

export const addToCart = (productId: string, quantity: number, token?: string | null, variantId?: string) =>
  post("/cart/add", { productId, quantity, variantId }, token);