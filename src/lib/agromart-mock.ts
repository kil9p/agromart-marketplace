import type {
  DemandForecast,
  FarmerStats,
  Order,
  Produce,
  RecommendationItem,
  User,
} from "./agromart-types";

const API_BASE = "http://localhost:8000/api/v1";

// ---------- Session ----------
const SESSION_KEY = "agromart_session";

export function getSession(): { token: string; user: User } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(session: { token: string; user: User } | null) {
  if (typeof window === "undefined") return;
  if (!session) window.localStorage.removeItem(SESSION_KEY);
  else window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Helper for fetch requests
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const session = getSession();
  const headers = new Headers(options.headers || {});
  
  // If not FormData, default to JSON
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: "no-store",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  
  if (!res.ok) {
    let errMessage = `Error ${res.status}: ${res.statusText}`;
    if (isJson) {
      const errorData = await res.json();
      errMessage = errorData.detail || errMessage;
    } else {
      const text = await res.text();
      errMessage = text || errMessage;
    }
    throw new Error(errMessage);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  return isJson ? res.json() : res.text();
}

// ---------- Auth ----------
export async function signup(input: {
  email: string;
  password: string;
  full_name: string;
  type: "buyer" | "farmer";
}) {
  const parts = input.full_name.split(" ");
  const first_name = parts[0];
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "Doe";

  let location_lat = 0.0;
  let location_lon = 0.0;

  try {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      location_lat = pos.coords.latitude;
      location_lon = pos.coords.longitude;
    }
  } catch (err) {
    console.warn("Could not get geolocation", err);
  }
  
  const res = await fetchApi("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      first_name,
      last_name,
      type: input.type,
      phone: "0000000000", // placeholder
      location_lat,
      location_lon,
    }),
  });

  // The frontend expects the signup function to return the user object
  return {
    id: "temp_id",
    email: input.email,
    full_name: input.full_name,
    type: input.type
  };
}

export async function login(email: string, password: string) {
  const res = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // The backend returns an AuthEnvelope: { success: true, data: { token, user: {...} } }
  const data = res.data;
  const mappedUser = {
    ...data.user,
    full_name: `${data.user.first_name} ${data.user.last_name}`,
  };
  setSession({ token: data.token, user: mappedUser });
  return { access_token: data.token, user: mappedUser };
}

export function logout() {
  setSession(null);
}

// ---------- Produce ----------
export async function listProduce(): Promise<Produce[]> {
  return fetchApi("/produce/");
}

export async function listMyProduce(): Promise<Produce[]> {
  return fetchApi("/produce/me");
}

export async function createProduce(
  input: Omit<Produce, "id" | "image_url"> & { image?: File | null }
): Promise<Produce> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("price", input.price.toString());
  formData.append("location", input.location);
  formData.append("quantity", input.quantity.toString());
  
  if (input.image) {
    formData.append("image", input.image);
  }

  return fetchApi("/produce/", {
    method: "POST",
    body: formData, // fetchApi helper won't set Content-Type so browser sets boundary automatically
  });
}

export async function updateInventory(id: string, quantity: number) {
  return fetchApi(`/produce/${id}/inventory`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function deleteProduce(id: string) {
  return fetchApi(`/produce/${id}`, {
    method: "DELETE",
  });
}

export async function getFarmerStats(): Promise<FarmerStats> {
  return fetchApi("/produce/dashboard");
}

// ---------- Demand Forecast (ML) ----------
export async function getDemandForecast(
  state: string,
  commodity: string,
  weeks = 8
): Promise<DemandForecast> {
  return fetchApi(`/demand/?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}&weeks=${weeks}`);
}

// ---------- Recommendations (ML) ----------
export async function getRecommendations(
  topN = 10
): Promise<{ customer_id: string; recommendations: RecommendationItem[] }> {
  return fetchApi(`/recommendations/?top_n=${topN}`);
}

// ---------- Cart / Orders ----------
export async function getCart(): Promise<Order> {
  return fetchApi("/orders/cart");
}

export async function addToCart(produce_id: string, quantity: number) {
  return fetchApi("/orders/cart", {
    method: "POST",
    body: JSON.stringify({ produce_id, quantity }),
  });
}

export async function removeFromCart(produce_id: string) {
  return fetchApi(`/orders/cart/${produce_id}`, {
    method: "DELETE",
  });
}

export async function checkout(): Promise<Order> {
  return fetchApi("/orders/checkout", {
    method: "POST",
  });
}

export async function getOrderHistory(): Promise<Order[]> {
  return fetchApi("/orders/history");
}
