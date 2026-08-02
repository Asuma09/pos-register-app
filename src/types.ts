export type PaymentMethod = "cash" | "credit_card" | "e_money";
export type OrderItemStatus = "pending" | "ready" | "served";

export type Product = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export const TAG_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

export type Order = {
  id: string;
  order_number: number;
  tag_number: number;
  total_amount: number;
  payment_method: PaymentMethod;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  order_number: number;
  tag_number: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  status: OrderItemStatus;
  created_at: string;
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "現金",
  credit_card: "クレジットカード",
  e_money: "電子マネー / QR決済",
};
