import { requireAdmin } from "../../../lib/auth";
import type { Env } from "../../../lib/db";
import { errorResponse, json, readJson } from "../../../lib/errors";
import { getAdminOrderView, getOrderRow, updateAdminOrder } from "../../../lib/order-service";
import { validateAdminUpdate } from "../../../lib/validation";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    return json({ order: await getAdminOrderView(env, await getOrderRow(env, param(params.orderId))) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    const update = validateAdminUpdate(await readJson(request));
    await updateAdminOrder(env, param(params.orderId), update);
    return json({ order: await getAdminOrderView(env, await getOrderRow(env, param(params.orderId))) });
  } catch (error) {
    return errorResponse(error);
  }
};

