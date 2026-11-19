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
  service_snapshot_json: string | null;
  payment_mode: string;
  deposit_cny: number | null;
  amount_eur_reference: string | null;
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
  custom_fields_json: string;
  location_status: string | null;
  quote_status: string;
  quote_service_fee_eur_minor: number | null;
  quote_third_party_fee_eur_minor: number | null;
  quote_material_fee_eur_minor: number | null;
  quote_other_fee_eur_minor: number | null;
  quote_other_note: string | null;
  quote_total_eur_minor: number | null;
  quote_version: number;
  quote_confirmed_at: string | null;
  customer_confirmation_status: string;
  customer_confirmed_at: string | null;
  public_reply: string | null;
  repeat_of_order_id: string | null;
  order_status: string;
  payment_status: string;
  payment_channel: string | null;
  payment_amount_cny: number | null;
  payment_received_amount_cny: number | null;
  payment_payer_name: string | null;
  payment_trade_no: string | null;
  payment_remark: string | null;
  payment_reported_at: string | null;
  payment_submitted_at: string | null;
  payment_proof_url: string | null;
  paid_at: string | null;
  payment_checked_at: string | null;
  payment_checked_by: string | null;
  payment_check_notes: string | null;
  external_platform: string | null;
  external_order_id: string | null;
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
  let customFields: Record<string, unknown> = {};
  try {
    customFields = JSON.parse(row.custom_fields_json || "{}");
  } catch {
    customFields = {};
  }
  let serviceSnapshot: Record<string, unknown> | null = null;
  try {
    serviceSnapshot = row.service_snapshot_json ? JSON.parse(row.service_snapshot_json) : null;
  } catch {
    serviceSnapshot = null;
  }
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
    serviceSnapshot,
    paymentMode: row.payment_mode || "manual_confirm",
    depositCNY: row.deposit_cny,
    amountEURReference: row.amount_eur_reference || "",
    payment: {
      status: row.payment_status,
      channel: row.payment_channel || "",
      amountCNY: row.payment_amount_cny,
      payerName: row.payment_payer_name || "",
      tradeNo: row.payment_trade_no || "",
      remark: row.payment_remark || "",
      reportedAt: row.payment_reported_at || "",
      submittedAt: row.payment_submitted_at || "",
      paidAt: row.paid_at || "",
    },
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
      customFields,
      locationStatus: row.location_status || "",
    },
    quote: {
      status: row.quote_status || "not_quoted",
      serviceFeeEURMinor: row.quote_service_fee_eur_minor,
      thirdPartyFeeEURMinor: row.quote_third_party_fee_eur_minor,
      materialFeeEURMinor: row.quote_material_fee_eur_minor,
      otherFeeEURMinor: row.quote_other_fee_eur_minor,
      otherNote: row.quote_other_note || "",
      totalEURMinor: row.quote_total_eur_minor,
      version: row.quote_version || 0,
      confirmedAt: row.quote_confirmed_at || "",
      customerConfirmationStatus: row.customer_confirmation_status || "not_requested",
      customerConfirmedAt: row.customer_confirmed_at || "",
    },
    publicReply: row.public_reply || "",
    result: row.result_notes || "",
    repeatOfOrderId: row.repeat_of_order_id || "",
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
      paid: row.payment_status === "paid_external",
      completedAt: row.completed_at,
      payment: {
        receivedAmountCNY: row.payment_received_amount_cny,
        checkedAt: row.payment_checked_at || "",
        checkedBy: row.payment_checked_by || "",
        checkNotes: row.payment_check_notes || "",
        proofUrl: row.payment_proof_url || "",
        externalPlatform: row.external_platform || "",
        externalOrderId: row.external_order_id || "",
      },
    },
  };
}
