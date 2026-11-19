import { requireAdmin } from "../../lib/auth";
import type { Env } from "../../lib/db";
import { errorResponse, json, readJson } from "../../lib/errors";
import { createService, listAdminServices, toPublicService, validateServiceWrite } from "../../lib/service-catalog";

function actor(request: Request): string {
  return (request.headers.get("x-admin-user") || "管理员").slice(0, 160);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireAdmin(request, env);
    const rows = await listAdminServices(env);
    return json({ services: rows.map(toPublicService) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    requireAdmin(request, env);
    const input = validateServiceWrite(await readJson(request));
    return json({ service: toPublicService(await createService(env, input, actor(request))) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
};

