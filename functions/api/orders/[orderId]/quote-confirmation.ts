import { requireOrderAccess } from "../../../lib/auth";
import type { Env, OrderRow } from "../../../lib/db";
import { ApiError, errorResponse, json, readJson } from "../../../lib/errors";
import { getOrderRow, getPublicOrderView } from "../../../lib/order-service";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const orderId = param(params.orderId);
    const row = (await getOrderRow(env, orderId, true)) as OrderRow & { order_view_token_hash: string };
    await requireOrderAccess(request, row);
    const body = await readJson(request);
    const accepted = body.accepted === true;
    if (row.quote_status !== "sent" || row.customer_confirmation_status !== "pending") {
      throw new ApiError(409, "QUOTE_NOT_CONFIRMABLE", "当前报价无需确认或已经处理。");
    }
    const now = new Date().toISOString();
    const nextConfirmation = accepted ? "confirmed" : "rejected";
    const nextQuoteStatus = accepted ? "confirmed" : "rejected";
    const nextOrderStatus = accepted ? "待付款" : "待确认";
    await env.DB.prepare(
      `UPDATE orders SET customer_confirmation_status = ?, customer_confirmed_at = ?,
       quote_status = ?, order_status = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
    )
      .bind(nextConfirmation, now, nextQuoteStatus, nextOrderStatus, now, orderId)
      .run();
    await env.DB.prepare(
      "INSERT INTO order_events (id, order_id, event_type, status, public_note, actor, created_at) VALUES (?, ?, 'quote_confirmation', ?, ?, '客户', ?)",
    )
      .bind(
        crypto.randomUUID(),
        orderId,
        nextOrderStatus,
        accepted ? "客户已确认报价。" : "客户未确认报价，等待客服重新沟通。",
        now,
      )
      .run();
    return json({ order: await getPublicOrderView(env, await getOrderRow(env, orderId)) });
  } catch (error) {
    return errorResponse(error);
  }
};

