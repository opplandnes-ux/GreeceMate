export interface Env {
  DB: D1Database;
  ORDER_TOKEN_SECRET: string;
  ADMIN_SECRET?: string;
  GOOGLE_APPS_SCRIPT_ENDPOINT?: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  idempotency_key: string;
  order_type: "serviceOrder" | "buyerService";
  service_id: string | null;
  service_name: string;
  service_category: string | null;
  service_price_text: string | null;
  customer_name: string;
  contact: string | null;
  wechat: string | null;
  whatsapp: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  preferred_time: string | null;
  is_urgent: number;
  chinese_companion: number;
  upload_needed: number;
  description: string | null;
  notes: string | null;
  property_link: string | null;
  property_address: string | null;
  budget: string | null;
  golden_visa_plan: string | null;
  family_members: string | null;
  current_stage: string | null;
  order_status: string;
  payment_status: string;
  source: string | null;
  order_view_token_hash: string;
  notification_status: string;
  assigned_to: string | null;
  internal_notes: string | null;
  result_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toPublicOrder(row: OrderRow) {
  return {
    id: row.id,
    orderId: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.order_status,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceCategory: row.service_category || "",
    priceText: row.service_price_text || "待报价",
    customer: {
      name: row.customer_name,
      contact: row.contact || "",
      wechat: row.wechat || "",
      whatsapp: row.whatsapp || "",
      email: row.email || "",
      country: row.country || "",
      city: row.city || "",
    },
    request: {
      preferredTime: row.preferred_time || "",
      description: row.description || "",
      urgent: Boolean(row.is_urgent),
      chineseCompanion: Boolean(row.chinese_companion),
      uploadNeeded: Boolean(row.upload_needed),
      note: row.notes || "",
      propertyLink: row.property_link || "",
      propertyAddress: row.property_address || "",
      budget: row.budget || "",
      goldenVisaPlan: row.golden_visa_plan || "",
      familyMembers: row.family_members || "",
      currentStage: row.current_stage || "",
    },
  };
}

export function toAdminOrder(row: OrderRow) {
  return {
    ...toPublicOrder(row),
    notificationStatus: row.notification_status,
    admin: {
      owner: row.assigned_to || "",
      internalNote: row.internal_notes || "",
      urgent: Boolean(row.is_urgent),
      result: row.result_notes || "",
      paid: row.payment_status === "paid",
      completedAt: row.completed_at,
    },
  };
}
