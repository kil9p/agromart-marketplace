export type UserType = "buyer" | "farmer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  type: UserType;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Produce {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  location: string;
  quantity: number;
  image_url: string | null;
}

export interface OrderItem {
  id: string;
  produce_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_amount: number;
  status: "cart" | "completed" | "cancelled" | "pending" | "fulfilled";
  order_date: string;
  items: OrderItem[];
}

export interface ForecastItem {
  date: string;
  predicted_demand_index: number;
}

export interface DemandForecast {
  state: string;
  commodity: string;
  forecast: ForecastItem[];
}

export interface RecommendationItem {
  product_id: string;
  product_name: string;
  category: string;
  price: number;
  score: number;
}

export interface FarmerStats {
  total_products: number;
  low_stock_alerts: number;
  total_sales: number;
  pending_orders: number;
}
