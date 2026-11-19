import { requireAdmin, requireOrderAccess } from "../../../../lib/auth";
import type { Env, OrderRow } from "../../../../lib/db";
import { ApiError, errorResponse } from "../../../../lib/errors";
import { getOrderRow } from "../../../../lib/order-service";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const orderId = param(params.orderId);
    const row = (await getOrderRow(env, orderId, true)) as OrderRow & { order_view_token_hash: string };
    const adminHeader = request.headers.get("x-admin-secret");
    if (adminHeader) requireAdmin(request, env);
    else await requireOrderAccess(request, row);
    const attachment = await env.DB.prepare(
      "SELECT file_name, mime_type, content, visibility FROM order_attachments WHERE id = ? AND order_id = ? LIMIT 1",
    )
      .bind(param(params.attachmentId), orderId)
      .first<{ file_name: string; mime_type: string; content: ArrayBuffer; visibility: string }>();
    if (!attachment || (!adminHeader && attachment.visibility === "internal")) {
      throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "附件不存在。");
    }
    return new Response(attachment.content, {
      headers: {
        "content-type": attachment.mime_type,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

