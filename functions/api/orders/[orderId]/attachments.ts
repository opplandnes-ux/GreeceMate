import { requireOrderAccess } from "../../../lib/auth";
import type { Env, OrderRow } from "../../../lib/db";
import { ApiError, errorResponse, json } from "../../../lib/errors";
import { getOrderRow, getPublicOrderView } from "../../../lib/order-service";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_ORDER = 5;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const orderId = param(params.orderId);
    const row = (await getOrderRow(env, orderId, true)) as OrderRow & { order_view_token_hash: string };
    await requireOrderAccess(request, row);
    const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM order_attachments WHERE order_id = ?")
      .bind(orderId)
      .first<{ count: number }>();
    const form = await request.formData();
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) throw new ApiError(400, "ATTACHMENT_REQUIRED", "请选择要上传的照片或文件。");
    if (Number(existing?.count || 0) + files.length > MAX_FILES_PER_ORDER) {
      throw new ApiError(400, "TOO_MANY_ATTACHMENTS", `每个需求最多上传 ${MAX_FILES_PER_ORDER} 个文件。`);
    }
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) throw new ApiError(400, "ATTACHMENT_TOO_LARGE", "单个文件不能超过 4MB。");
      if (!ALLOWED_TYPES.has(file.type)) throw new ApiError(400, "ATTACHMENT_TYPE_NOT_ALLOWED", "仅支持图片、PDF、Word 和 Excel 文件。");
      await env.DB.prepare(
        "INSERT INTO order_attachments (id, order_id, file_name, mime_type, size_bytes, content, visibility, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 'customer', 'customer', ?)",
      )
        .bind(crypto.randomUUID(), orderId, file.name.slice(0, 240), file.type, file.size, await file.arrayBuffer(), new Date().toISOString())
        .run();
    }
    return json({ order: await getPublicOrderView(env, await getOrderRow(env, orderId)) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};

