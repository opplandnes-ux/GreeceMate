import { requireAdmin } from "../../../lib/auth";
import type { Env } from "../../../lib/db";
import { ApiError, errorResponse, json, readJson } from "../../../lib/errors";
import {
  duplicateService,
  getService,
  listServiceVersions,
  toPublicService,
  updateService,
  validateServiceWrite,
} from "../../../lib/service-catalog";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function actor(request: Request): string {
  return (request.headers.get("x-admin-user") || "管理员").slice(0, 160);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    const id = param(params.serviceId);
    return json({
      service: toPublicService(await getService(env, id)),
      versions: await listServiceVersions(env, id),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    requireAdmin(request, env);
    const id = param(params.serviceId);
    const body = await readJson(request);
    if (body.action === "duplicate") {
      const newId = typeof body.newId === "string" ? body.newId : "";
      if (!newId) throw new ApiError(400, "DUPLICATE_ID_REQUIRED", "请填写副本服务 ID。");
      return json({ service: toPublicService(await duplicateService(env, id, newId, actor(request))) }, 201);
    }
    const input = validateServiceWrite(body, id);
    return json({ service: toPublicService(await updateService(env, id, input, actor(request))) });
  } catch (error) {
    return errorResponse(error);
  }
};

