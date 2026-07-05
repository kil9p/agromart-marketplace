import type {
  DemandForecast,
  FarmerStats,
  Order,
  Produce,
  RecommendationItem,
  User,
} from "./agromart-types";

// Simulated latency
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ---------- persistent mock store ----------
type Store = {
  users: (User & { password: string })[];
  produce: Produce[];
  carts: Record<string, Order>; // buyer_id -> cart order
  history: Order[];
};

const STORE_KEY = "agromart_store_v1";
const SESSION_KEY = "agromart_session";

const seedProduce = (): Produce[] => [
  {
    id: uid(),
    name: "Premium Rice (Imported)",
    description: "Long grain parboiled rice, 50kg bag.",
    category: "Grains",
    price: 55000,
    location: "Kano",
    quantity: 120,
    image_url: null,
  },
  {
    id: uid(),
    name: "Fresh Tomatoes",
    description: "Farm-fresh red tomatoes, sold per basket.",
    category: "Vegetables",
    price: 12000,
    location: "Jos",
    quantity: 40,
    image_url: null,
  },
  {
    id: uid(),
    name: "Yellow Maize",
    description: "Dry yellow maize, ideal for feed and flour.",
    category: "Grains",
    price: 32000,
    location: "Kaduna",
    quantity: 200,
    image_url: null,
  },
  {
    id: uid(),
    name: "Garbanzo Beans",
    description: "High protein chickpeas, 25kg bag.",
    category: "Legumes",
    price: 11500,
    location: "Borno",
    quantity: 80,
    image_url: null,
  },
  {
    id: uid(),
    name: "Sweet Yams",
    description: "Freshly harvested puna yams.",
    category: "Tubers",
    price: 8500,
    location: "Benue",
    quantity: 5,
    image_url: null,
  },
  {
    id: uid(),
    name: "Palm Oil (25L)",
    description: "Locally pressed red palm oil.",
    category: "Oils",
    price: 42000,
    location: "Cross River",
    quantity: 60,
    image_url: null,
  },
];

function loadStore(): Store {
  if (typeof window === "undefined")
    return { users: [], produce: seedProduce(), carts: {}, history: [] };
  const raw = window.localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Store;
    } catch {
      /* fallthrough */
    }
  }
  const fresh: Store = {
    users: [
      {
        id: uid(),
        email: "farmer@demo.com",
        password: "password",
        full_name: "Demo Farmer",
        type: "farmer",
      },
      {
        id: uid(),
        email: "buyer@demo.com",
        password: "password",
        full_name: "Demo Buyer",
        type: "buyer",
      },
    ],
    produce: seedProduce(),
    carts: {},
    history: [],
  };
  window.localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveStore(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

// ---------- Session ----------
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

// ---------- Auth ----------
export async function signup(input: {
  email: string;
  password: string;
  full_name: string;
  type: "buyer" | "farmer";
}) {
  await delay();
  const store = loadStore();
  if (store.users.some((u) => u.email === input.email)) {
    throw new Error("Email already registered");
  }
  const user: User & { password: string } = {
    id: uid(),
    email: input.email,
    password: input.password,
    full_name: input.full_name,
    type: input.type,
  };
  store.users.push(user);
  saveStore(store);
  const { password: _pw, ...safe } = user;
  return { message: "Signup successful", user: safe };
}

export async function login(email: string, password: string) {
  await delay();
  const store = loadStore();
  const found = store.users.find(
    (u) => u.email === email && u.password === password,
  );
  if (!found) throw new Error("Invalid email or password");
  const { password: _pw, ...safe } = found;
  const session = { token: `mock.${found.id}.${Date.now()}`, user: safe };
  setSession(session);
  return { access_token: session.token, token_type: "bearer", user: safe };
}

export function logout() {
  setSession(null);
}

// ---------- Produce ----------
export async function listProduce(): Promise<Produce[]> {
  await delay(200);
  return loadStore().produce;
}

export async function listMyProduce(): Promise<Produce[]> {
  await delay(200);
  // Mock: return all produce as "mine" for the logged-in farmer
  return loadStore().produce;
}

export async function createProduce(
  input: Omit<Produce, "id" | "image_url">,
): Promise<Produce> {
  await delay();
  const store = loadStore();
  const p: Produce = { ...input, id: uid(), image_url: null };
  store.produce.unshift(p);
  saveStore(store);
  return p;
}

export async function updateInventory(id: string, quantity: number) {
  await delay();
  const store = loadStore();
  const p = store.produce.find((x) => x.id === id);
  if (!p) throw new Error("Not found");
  p.quantity = quantity;
  saveStore(store);
  return p;
}

export async function deleteProduce(id: string) {
  await delay();
  const store = loadStore();
  store.produce = store.produce.filter((p) => p.id !== id);
  saveStore(store);
  return { ok: true };
}

export async function getFarmerStats(): Promise<FarmerStats> {
  await delay(200);
  const store = loadStore();
  return {
    total_products: store.produce.length,
    low_stock_alerts: store.produce.filter((p) => p.quantity < 10).length,
    total_sales: store.history.reduce((s, o) => s + o.total_amount, 0) || 150000,
    pending_orders: 3,
  };
}

// ---------- Demand Forecast (ML) ----------
export async function getDemandForecast(
  state: string,
  commodity: string,
  weeks = 8,
): Promise<DemandForecast> {
  await delay(400);
  const base = 5000 + (state.length + commodity.length) * 40;
  const start = new Date();
  const forecast = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + (i + 1) * 7);
    const noise = Math.sin(i * 1.3) * 400 + (i * 120);
    return {
      date: d.toISOString().slice(0, 10),
      predicted_demand_index: Math.round((base + noise) * 100) / 100,
    };
  });
  return { state, commodity, forecast };
}

// ---------- Recommendations (ML) ----------
export async function getRecommendations(
  topN = 10,
): Promise<{ customer_id: string; recommendations: RecommendationItem[] }> {
  await delay(300);
  const store = loadStore();
  const session = getSession();
  const recs: RecommendationItem[] = store.produce
    .slice(0, topN)
    .map((p, i) => ({
      product_id: p.id,
      product_name: p.name,
      category: p.category,
      price: p.price,
      score: Math.max(0.55, 0.97 - i * 0.05),
    }));
  return {
    customer_id: session?.user.id ?? "guest",
    recommendations: recs,
  };
}

// ---------- Cart / Orders ----------
function ensureCart(buyerId: string, store: Store): Order {
  if (!store.carts[buyerId]) {
    store.carts[buyerId] = {
      id: uid(),
      buyer_id: buyerId,
      total_amount: 0,
      status: "cart",
      order_date: new Date().toISOString(),
      items: [],
    };
  }
  return store.carts[buyerId];
}

function recomputeTotal(order: Order) {
  order.total_amount = order.items.reduce((s, i) => s + i.subtotal, 0);
}

export async function getCart(): Promise<Order> {
  await delay(150);
  const s = getSession();
  if (!s) throw new Error("Not authenticated");
  const store = loadStore();
  const cart = ensureCart(s.user.id, store);
  saveStore(store);
  return cart;
}

export async function addToCart(produce_id: string, quantity: number) {
  await delay();
  const s = getSession();
  if (!s) throw new Error("Not authenticated");
  const store = loadStore();
  const cart = ensureCart(s.user.id, store);
  const produce = store.produce.find((p) => p.id === produce_id);
  if (!produce) throw new Error("Produce not found");
  const existing = cart.items.find((i) => i.produce_id === produce_id);
  if (existing) {
    existing.quantity += quantity;
    existing.subtotal = existing.quantity * existing.unit_price;
  } else {
    cart.items.push({
      id: uid(),
      produce_id,
      quantity,
      unit_price: produce.price,
      subtotal: produce.price * quantity,
    });
  }
  recomputeTotal(cart);
  saveStore(store);
  return cart;
}

export async function removeFromCart(produce_id: string) {
  await delay();
  const s = getSession();
  if (!s) throw new Error("Not authenticated");
  const store = loadStore();
  const cart = ensureCart(s.user.id, store);
  cart.items = cart.items.filter((i) => i.produce_id !== produce_id);
  recomputeTotal(cart);
  saveStore(store);
  return cart;
}

export async function checkout(): Promise<Order> {
  await delay();
  const s = getSession();
  if (!s) throw new Error("Not authenticated");
  const store = loadStore();
  const cart = ensureCart(s.user.id, store);
  if (cart.items.length === 0) throw new Error("Cart is empty");
  const completed: Order = {
    ...cart,
    id: uid(),
    status: "completed",
    order_date: new Date().toISOString(),
  };
  store.history.unshift(completed);
  delete store.carts[s.user.id];
  saveStore(store);
  return completed;
}

export async function getOrderHistory(): Promise<Order[]> {
  await delay(200);
  const s = getSession();
  if (!s) return [];
  return loadStore().history.filter((o) => o.buyer_id === s.user.id);
}
