import { ApiError } from "./errors";
import type { Env, OrderRow } from "./db";
import { toAdminOrder, toPublicOrder } from "./db";
import { createOrderId, createOrderNumber, deriveOrderViewToken, hashToken } from "./token";
import type { AdminUpdateInput, PaymentConfirmationInput, ValidatedOrderInput } from "./validation";

const DEFAULT_APPS_SCRIPT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbw4hGSztT7i_g3Kr8cgOeGu7rECxEuJfTqMf9vhHNQe5LoS220qAkvOYGu3mnD8XtpY/exec";

function requireTokenSecret(env: Env): string {
  if (!env.ORDER_TOKEN_SECRET || env.ORDER_TOKEN_SECRET.length < 32) {
    throw new ApiError(503, "ORDER_SERVICE_NOT_CONFIGURED", "订单服务尚未完成安全配置。" );
  }
  return env.ORDER_TOKEN_SECRET;
}

async function getByIdempotencyKey(env: Env, key: string): Promise<OrderRow | null> {
  return env.DB.prepare("SELECT * FROM orders WHERE idempotency_key = ? LIMIT 1")
    .bind(key)
    .first<OrderRow>();
}

export async function getOrderRow(env: Env, orderId: string, includeTokenHash = false): Promise<OrderRow> {
  const columns = includeTokenHash ? "*" : "*";
  const row = await env.DB.prepare(`SELECT ${columns} FROM orders WHERE id = ? LIMIT 1`)
    .bind(orderId)
    .first<OrderRow>();
  if (!row) throw new ApiError(404, "ORDER_NOT_FOUND", "订单不存在。" );
  return row;
}

async function listOrderEvents(env: Env, orderId: string, admin = false) {
  const result = await env.DB.prepare(
    `SELECT id, event_type, status, public_note${admin ? ", internal_note, actor" : ""}, created_at
     FROM order_events WHERE order_id = ? ORDER BY created_at ASC`,
  )
    .bind(orderId)
    .all();
  return result.results;
}

async function listOrderAttachments(env: Env, orderId: string, admin = false) {
  const result = await env.DB.prepare(
    `SELECT id, file_name, mime_type, size_bytes, visibility, uploaded_by, created_at
     FROM order_attachments WHERE order_id = ? ${admin ? "" : "AND visibility IN ('customer', 'result')"}
     ORDER BY created_at ASC`,
  )
    .bind(orderId)
    .all();
  return result.results;
}

export async function getPublicOrderView(env: Env, row: OrderRow) {
  return {
    ...toPublicOrder(row),
    events: await listOrderEvents(env, row.id),
    attachments: await listOrderAttachments(env, row.id),
  };
}

export async function getAdminOrderView(env: Env, row: OrderRow) {
  return {
    ...toAdminOrder(row),
    events: await listOrderEvents(env, row.id, true),
    attachments: await listOrderAttachments(env, row.id, true),
  };
}

function notificationPayload(input: ValidatedOrderInput, orderId: string, orderNumber: string) {
  const common = {
    formType: input.orderType,
    orderId,
    orderNumber,
    submittedAt: new Date().toISOString(),
    status: "新提交",
    leadStatus: "新提交",
    "状态": "新提交",
  };

  if (input.orderType === "buyerService") {
    return {
      ...common,
      name: input.customerName,
      contact: input.contact,
      wechat: input.contact,
      whatsapp: input.contact,
      email: input.email,
      propertyLink: input.propertyLink,
      propertyAddress: input.propertyAddress,
      budget: input.budget,
      goldenVisa: input.goldenVisaPlan,
      familyMembers: input.familyMembers,
      stage: input.currentStage,
      notes: input.notes,
      source: "GreeceMate Buyer Service",
      sourcePage: input.source || "/buyer-service",
    };
  }

  return {
    ...common,
    serviceCategory: input.serviceCategory,
    serviceName: input.serviceName,
    servicePrice: input.servicePriceText,
    customerName: input.customerName,
    contact: input.contact,
    email: input.email,
    phone: "",
    serviceAddress: [input.country, input.city].filter(Boolean).join(" / "),
    preferredTime: input.preferredTime,
    urgent: input.isUrgent ? "是" : "否",
    notes: [input.description, input.notes].filter(Boolean).join("\n\n备注："),
    source: input.source,
    sourcePage: input.source,
  };
}

async function sendExistingNotification(
  env: Env,
  input: ValidatedOrderInput,
  orderId: string,
  orderNumber: string,
): Promise<"sent" | "failed"> {
  try {
    const endpoint = env.GOOGLE_APPS_SCRIPT_ENDPOINT || DEFAULT_APPS_SCRIPT_ENDPOINT;
    const payload = notificationPayload(input, orderId, orderNumber);
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) body.set(key, String(value ?? ""));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function createOrder(
  env: Env,
  input: ValidatedOrderInput,
  idempotencyKey: string,
) {
  const secret = requireTokenSecret(env);
  const existing = await getByIdempotencyKey(env, idempotencyKey);
  if (existing) {
    const orderViewToken = await deriveOrderViewToken(existing.id, secret);
    return {
      order: toPublicOrder(existing),
      orderViewToken,
      notificationStatus: existing.notification_status,
      created: false,
    };
  }

  const id = createOrderId();
  const orderViewToken = await deriveOrderViewToken(id, secret);
  const tokenHash = await hashToken(orderViewToken);
  const now = new Date().toISOString();

  let orderNumber = "";
  let inserted = false;
  for (let attempt = 0; attempt < 4 && !inserted; attempt += 1) {
    orderNumber = createOrderNumber();
    try {
      await env.DB.prepare(
        `INSERT INTO orders (
          id, order_number, idempotency_key, order_type, service_id, service_name,
          service_category, service_price_text, payment_mode, deposit_cny, amount_eur_reference,
          customer_name, contact, wechat, whatsapp,
          email, country, city, preferred_time, is_urgent, chinese_companion, upload_needed,
          description, notes, property_link, property_address, budget, golden_visa_plan,
          family_members, current_stage, service_snapshot_json, custom_fields_json,
          location_status, repeat_of_order_id, order_status, payment_status, source,
          order_view_token_hash, notification_status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, '待评估', 'unpaid', ?, ?, 'pending', ?, ?
        )`,
      )
        .bind(
          id,
          orderNumber,
          idempotencyKey,
          input.orderType,
          input.serviceId,
          input.serviceName,
          input.serviceCategory,
          input.servicePriceText,
          input.paymentMode,
          input.depositCNY,
          input.amountEURReference,
          input.customerName,
          input.contact,
          input.wechat,
          input.whatsapp,
          input.email,
          input.country,
          input.city,
          input.preferredTime,
          input.isUrgent ? 1 : 0,
          input.chineseCompanion ? 1 : 0,
          input.uploadNeeded ? 1 : 0,
          input.description,
          input.notes,
          input.propertyLink,
          input.propertyAddress,
          input.budget,
          input.goldenVisaPlan,
          input.familyMembers,
          input.currentStage,
          input.serviceSnapshot,
          JSON.stringify(input.customFields),
          input.locationStatus,
          input.repeatOfOrderId || null,
          input.source,
          tokenHash,
          now,
          now,
        )
        .run();
      inserted = true;
    } catch (error) {
      const duplicate = await getByIdempotencyKey(env, idempotencyKey);
      if (duplicate) {
        const duplicateToken = await deriveOrderViewToken(duplicate.id, secret);
        return {
          order: toPublicOrder(duplicate),
          orderViewToken: duplicateToken,
          notificationStatus: duplicate.notification_status,
          created: false,
        };
      }
      if (attempt === 3) throw error;
    }
  }

  await env.DB.prepare(
    "INSERT INTO order_events (id, order_id, event_type, status, public_note, actor, created_at) VALUES (?, ?, 'submitted', '待评估', ?, '客户', ?)",
  )
    .bind(crypto.randomUUID(), id, "需求已收到，待客服评估。", now)
    .run();

  const notificationStatus = await sendExistingNotification(env, input, id, orderNumber);
  await env.DB.prepare(
    "UPDATE orders SET notification_status = ?, updated_at = ?, version = version + 1 WHERE id = ?",
  )
    .bind(notificationStatus, new Date().toISOString(), id)
    .run();

  const row = await getOrderRow(env, id);
  return {
    order: toPublicOrder(row),
    orderViewToken,
    notificationStatus,
    created: true,
  };
}

export async function submitPaymentConfirmation(
  env: Env,
  orderId: string,
  input: PaymentConfirmationInput,
) {
  const current = await getOrderRow(env, orderId);
  if (current.payment_mode !== "wechat_qr_deposit") {
    throw new ApiError(400, "PAYMENT_NOT_AVAILABLE", "该服务需由客服确认付款方式。" );
  }
  if (current.payment_status === "paid_external") {
    throw new ApiError(409, "PAYMENT_ALREADY_CONFIRMED", "该订单付款已由客服确认。" );
  }
  if ((current.email || "").toLowerCase() !== input.email.toLowerCase()) {
    throw new ApiError(400, "PAYMENT_EMAIL_MISMATCH", "邮箱与订单信息不一致。" );
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE orders SET
      payment_status = 'pending_manual_check', payment_channel = ?, payment_amount_cny = ?,
      payment_payer_name = ?, payment_trade_no = ?, payment_remark = ?, payment_reported_at = ?,
      payment_submitted_at = ?, order_status = '待核款', updated_at = ?, version = version + 1
     WHERE id = ?`,
  )
    .bind(
      input.paymentChannel,
      input.paymentAmountCNY,
      input.paymentPayerName,
      input.paymentTradeNo,
      input.paymentRemark,
      input.paymentReportedAt,
      now,
      now,
      orderId,
    )
    .run();

  return toPublicOrder(await getOrderRow(env, orderId));
}

export async function listAdminOrders(env: Env, search = "", status = "") {
  const clauses: string[] = [];
  const values: string[] = [];
  if (search) {
    clauses.push("(order_number LIKE ? OR service_name LIKE ? OR customer_name LIKE ? OR contact LIKE ?)");
    const term = `%${search.slice(0, 120)}%`;
    values.push(term, term, term, term);
  }
  if (status) {
    clauses.push("order_status = ?");
    values.push(status.slice(0, 40));
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const statement = env.DB.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 200`);
  const result = await statement.bind(...values).all<OrderRow>();
  return result.results.map(toAdminOrder);
}

export async function updateAdminOrder(env: Env, orderId: string, update: AdminUpdateInput) {
  const current = await getOrderRow(env, orderId);
  const paymentStatus = update.paymentStatus ?? current.payment_status;
  if (paymentStatus === "paid_external") {
    const received = update.paymentReceivedAmountCNY === undefined
      ? current.payment_received_amount_cny
      : update.paymentReceivedAmountCNY;
    const checkedBy = update.paymentCheckedBy ?? current.payment_checked_by;
    const checkedAt = update.paymentCheckedAt ?? current.payment_checked_at;
    if (!received || !checkedBy || !checkedAt) {
      throw new ApiError(400, "PAYMENT_VERIFICATION_REQUIRED", "标记已付款前，请填写实际到账金额、核款时间和核款人。");
    }
  }
  const paymentDrivenStatus =
    paymentStatus === "pending_manual_check"
      ? "待核款"
      : paymentStatus === "paid_external"
        ? "已付款"
        : paymentStatus === "cancelled"
          ? "已取消"
          : current.order_status;
  const nextStatus = update.orderStatus ?? paymentDrivenStatus;
  if (nextStatus === "无法承接" && !(update.publicReply ?? current.public_reply)) {
    throw new ApiError(400, "PUBLIC_REPLY_REQUIRED", "无法承接时必须填写给客户的明确回复。");
  }
  const completedAt = nextStatus === "已完成" ? current.completed_at || new Date().toISOString() : null;
  const updatedAt = new Date().toISOString();
  const checkedAt =
    paymentStatus === "paid_external" || paymentStatus === "refunded_external"
      ? update.paymentCheckedAt || current.payment_checked_at || updatedAt
      : update.paymentCheckedAt ?? current.payment_checked_at;
  const paidAt = paymentStatus === "paid_external" ? current.paid_at || updatedAt : current.paid_at;
  const quoteChanged =
    (update.quoteServiceFeeEURMinor !== undefined && update.quoteServiceFeeEURMinor !== current.quote_service_fee_eur_minor) ||
    (update.quoteThirdPartyFeeEURMinor !== undefined && update.quoteThirdPartyFeeEURMinor !== current.quote_third_party_fee_eur_minor) ||
    (update.quoteMaterialFeeEURMinor !== undefined && update.quoteMaterialFeeEURMinor !== current.quote_material_fee_eur_minor) ||
    (update.quoteOtherFeeEURMinor !== undefined && update.quoteOtherFeeEURMinor !== current.quote_other_fee_eur_minor) ||
    (update.quoteOtherNote !== undefined && update.quoteOtherNote !== (current.quote_other_note || ""));
  const quoteServiceFee = update.quoteServiceFeeEURMinor === undefined ? current.quote_service_fee_eur_minor : update.quoteServiceFeeEURMinor;
  const quoteThirdPartyFee = update.quoteThirdPartyFeeEURMinor === undefined ? current.quote_third_party_fee_eur_minor : update.quoteThirdPartyFeeEURMinor;
  const quoteMaterialFee = update.quoteMaterialFeeEURMinor === undefined ? current.quote_material_fee_eur_minor : update.quoteMaterialFeeEURMinor;
  const quoteOtherFee = update.quoteOtherFeeEURMinor === undefined ? current.quote_other_fee_eur_minor : update.quoteOtherFeeEURMinor;
  const quoteTotal = [quoteServiceFee, quoteThirdPartyFee, quoteMaterialFee, quoteOtherFee]
    .reduce<number>((sum, value) => sum + Number(value || 0), 0);
  const quoteStatus = update.quoteStatus ?? current.quote_status;
  const quoteVersion = quoteChanged || (update.quoteStatus !== undefined && update.quoteStatus !== current.quote_status)
    ? current.quote_version + 1
    : current.quote_version;
  const confirmationStatus = quoteStatus === "sent" && quoteVersion !== current.quote_version
    ? "pending"
    : current.customer_confirmation_status;

  await env.DB.prepare(
    `UPDATE orders SET
      order_status = ?, assigned_to = ?, internal_notes = ?, result_notes = ?,
      is_urgent = ?, completed_at = ?, payment_status = ?, payment_received_amount_cny = ?,
      payment_checked_at = ?, payment_checked_by = ?, payment_check_notes = ?, paid_at = ?,
      public_reply = ?, quote_status = ?, quote_service_fee_eur_minor = ?,
      quote_third_party_fee_eur_minor = ?, quote_material_fee_eur_minor = ?,
      quote_other_fee_eur_minor = ?, quote_other_note = ?, quote_total_eur_minor = ?,
      quote_version = ?, customer_confirmation_status = ?,
      updated_at = ?, version = version + 1
     WHERE id = ?`,
  )
    .bind(
      nextStatus,
      update.assignedTo ?? current.assigned_to,
      update.internalNotes ?? current.internal_notes,
      update.resultNotes ?? current.result_notes,
      update.isUrgent === undefined ? current.is_urgent : update.isUrgent ? 1 : 0,
      completedAt,
      paymentStatus,
      update.paymentReceivedAmountCNY === undefined
        ? current.payment_received_amount_cny
        : update.paymentReceivedAmountCNY,
      checkedAt,
      update.paymentCheckedBy ?? current.payment_checked_by,
      update.paymentCheckNotes ?? current.payment_check_notes,
      paidAt,
      update.publicReply ?? current.public_reply,
      quoteStatus,
      quoteServiceFee,
      quoteThirdPartyFee,
      quoteMaterialFee,
      quoteOtherFee,
      update.quoteOtherNote ?? current.quote_other_note,
      quoteTotal,
      quoteVersion,
      confirmationStatus,
      updatedAt,
      orderId,
    )
    .run();

  if (nextStatus !== current.order_status || update.publicProgressNote) {
    await env.DB.prepare(
      "INSERT INTO order_events (id, order_id, event_type, status, public_note, internal_note, actor, created_at) VALUES (?, ?, 'progress', ?, ?, NULL, ?, ?)",
    )
      .bind(
        crypto.randomUUID(),
        orderId,
        nextStatus,
        update.publicProgressNote || (nextStatus !== current.order_status ? `状态已更新为：${nextStatus}` : ""),
        update.assignedTo || current.assigned_to || "客服",
        updatedAt,
      )
      .run();
  }
  if (quoteStatus === "sent" && (quoteChanged || quoteStatus !== current.quote_status)) {
    await env.DB.prepare(
      "INSERT INTO order_events (id, order_id, event_type, status, public_note, actor, created_at) VALUES (?, ?, 'quote', '已报价', ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), orderId, "客服已提交报价，请查看并确认。", update.assignedTo || current.assigned_to || "客服", updatedAt)
      .run();
  }

  return toAdminOrder(await getOrderRow(env, orderId));
}
