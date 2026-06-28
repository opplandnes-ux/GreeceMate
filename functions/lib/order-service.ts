import { ApiError } from "./errors";
import type { Env, OrderRow } from "./db";
import { toAdminOrder, toPublicOrder } from "./db";
import { createOrderId, createOrderNumber, deriveOrderViewToken, hashToken } from "./token";
import type { AdminUpdateInput, ValidatedOrderInput } from "./validation";

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
          service_category, service_price_text, customer_name, contact, wechat, whatsapp,
          email, country, city, preferred_time, is_urgent, chinese_companion, upload_needed,
          description, notes, property_link, property_address, budget, golden_visa_plan,
          family_members, current_stage, order_status, payment_status, source,
          order_view_token_hash, notification_status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          '新订单', 'unpaid', ?, ?, 'pending', ?, ?
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
  const nextStatus = update.orderStatus ?? current.order_status;
  const completedAt = nextStatus === "已完成" ? current.completed_at || new Date().toISOString() : null;
  const updatedAt = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE orders SET
      order_status = ?, assigned_to = ?, internal_notes = ?, result_notes = ?,
      is_urgent = ?, completed_at = ?, updated_at = ?, version = version + 1
     WHERE id = ?`,
  )
    .bind(
      nextStatus,
      update.assignedTo ?? current.assigned_to,
      update.internalNotes ?? current.internal_notes,
      update.resultNotes ?? current.result_notes,
      update.isUrgent === undefined ? current.is_urgent : update.isUrgent ? 1 : 0,
      completedAt,
      updatedAt,
      orderId,
    )
    .run();

  return toAdminOrder(await getOrderRow(env, orderId));
}
