import { requireOrderAccess } from "../../../lib/auth";
import type { Env, OrderRow } from "../../../lib/db";
import { ApiError, errorResponse, json, readJson } from "../../../lib/errors";
import { getOrderRow, getPublicOrderView } from "../../../lib/order-service";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const orderId = param(params.orderId);
    const row = (await getOrderRow(env, orderId, true)) as OrderRow & { order_view_token_hash: string };
    await requireOrderAccess(request, row);
    const body = await readJson(request);
    const supplementNotes = safeText(body.supplementNotes, 5000);
    const onsiteContact = safeText(body.onsiteContact, 500);
    const accessMethod = safeText(body.accessMethod, 500);
    const authorizationNotes = safeText(body.authorizationNotes, 1000);
    if (!supplementNotes && !onsiteContact && !accessMethod && !authorizationNotes) {
      throw new ApiError(400, "SUPPLEMENT_REQUIRED", "请填写需要补充的信息。");
    }
    let customFields: Record<string, unknown> = {};
    try { customFields = JSON.parse(row.custom_fields_json || "{}"); } catch { customFields = {}; }
    customFields.supplementNotes = supplementNotes;
    customFields.onsiteContact = onsiteContact;
    customFields.accessMethod = accessMethod;
    customFields.authorizationNotes = authorizationNotes;
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE orders SET custom_fields_json = ?, order_status = '待确认', updated_at = ?, version = version + 1 WHERE id = ?",
    ).bind(JSON.stringify(customFields), now, orderId).run();
    await env.DB.prepare(
      "INSERT INTO order_events (id, order_id, event_type, status, public_note, actor, created_at) VALUES (?, ?, 'supplement', '待确认', '客户已补充资料，等待客服确认。', '客户', ?)",
    ).bind(crypto.randomUUID(), orderId, now).run();
    return json({ order: await getPublicOrderView(env, await getOrderRow(env, orderId)) });
  } catch (error) {
    return errorResponse(error);
  }
};

