import { requireAdmin } from "../../../lib/auth";
import type { Env } from "../../../lib/db";
import { toAdminOrder } from "../../../lib/db";
import { errorResponse, json, readJson } from "../../../lib/errors";
import { getOrderRow, updateAdminOrder } from "../../../lib/order-service";
import { validateAdminUpdate } from "../../../lib/validation";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    return json({ order: toAdminOrder(await getOrderRow(env, param(params.orderId))) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    const update = validateAdminUpdate(await readJson(request));
    const order = await updateAdminOrder(env, param(params.orderId), update);
    return json({ order });
  } catch (error) {
    return errorResponse(error);
  }
};

