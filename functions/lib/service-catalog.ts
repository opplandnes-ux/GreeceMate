import { ApiError } from "./errors";
import type { Env } from "./db";

export type ServiceStatus = "draft" | "published" | "paused" | "archived";
export type PricingMode = "consultation" | "manual_quote" | "fixed_price" | "deposit";

export interface ServiceRow {
  id: string;
  category_id: string;
  daily_help_group: string | null;
  name: string;
  image_url: string | null;
  short_description: string;
  description: string;
  service_areas_json: string;
  includes_json: string;
  excludes_json: string;
  owner: string | null;
  estimated_time: string;
  cancellation_rule: string;
  pricing_mode: PricingMode;
  price_text: string;
  fixed_amount_eur_minor: number | null;
  deposit_cny: number | null;
  form_schema_json: string;
  status: ServiceStatus;
  sort_order: number;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "single" | "multi" | "date" | "number" | "attachment";
  required: boolean;
  options: string[];
  placeholder: string;
}

function parseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseSchema(value: string): FormField[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toPublicService(row: ServiceRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    dailyHelpGroup: row.daily_help_group || "",
    name: row.name,
    imageUrl: row.image_url || "",
    short: row.short_description,
    intro: row.description,
    serviceAreas: parseArray(row.service_areas_json),
    includes: parseArray(row.includes_json),
    excludes: parseArray(row.excludes_json),
    owner: row.owner || "",
    time: row.estimated_time,
    refund: row.cancellation_rule,
    pricingMode: row.pricing_mode,
    paymentMode:
      row.pricing_mode === "deposit" ? "wechat_qr_deposit" : row.pricing_mode === "fixed_price" ? "manual_confirm" : "manual_confirm",
    priceType: {
      consultation: "仅咨询",
      manual_quote: "人工报价",
      fixed_price: "固定价",
      deposit: "预约金",
    }[row.pricing_mode],
    price: row.price_text,
    amountEURReference: row.price_text,
    fixedAmountEURMinor: row.fixed_amount_eur_minor,
    depositCNY: row.deposit_cny,
    formSchema: parseSchema(row.form_schema_json),
    status: row.status,
    sortOrder: row.sort_order,
    version: row.version,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export function serviceSnapshot(row: ServiceRow): string {
  return JSON.stringify(toPublicService(row));
}

export async function listPublishedServices(env: Env): Promise<ServiceRow[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM services WHERE status = 'published' ORDER BY sort_order ASC, name ASC",
  ).all<ServiceRow>();
  return result.results;
}

export async function listAdminServices(env: Env): Promise<ServiceRow[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM services ORDER BY CASE status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, sort_order ASC, name ASC",
  ).all<ServiceRow>();
  return result.results;
}

export async function getService(env: Env, id: string, publishedOnly = false): Promise<ServiceRow> {
  const row = await env.DB.prepare(
    `SELECT * FROM services WHERE id = ? ${publishedOnly ? "AND status = 'published'" : ""} LIMIT 1`,
  )
    .bind(id)
    .first<ServiceRow>();
  if (!row) throw new ApiError(404, "SERVICE_NOT_FOUND", "服务不存在或暂未开放。");
  return row;
}

function text(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringArray(value: unknown, maxItems = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => text(item, 500)).filter(Boolean);
}

function amount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000000) {
    throw new ApiError(400, "INVALID_SERVICE_AMOUNT", "服务金额格式不正确。");
  }
  return Math.round(parsed);
}

function slug(value: unknown): string {
  const result = text(value, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(result)) {
    throw new ApiError(400, "INVALID_SERVICE_ID", "服务 ID 只能使用小写字母、数字和连字符。");
  }
  return result;
}

function schema(value: unknown): FormField[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(["text", "single", "multi", "date", "number", "attachment"]);
  const ids = new Set<string>();
  return value.slice(0, 30).map((raw, index) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const id = text(item.id, 60) || `field-${index + 1}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) {
      throw new ApiError(400, "INVALID_FORM_FIELD", "表单字段 ID 必须唯一，且只能使用字母、数字、下划线和连字符。");
    }
    ids.add(id);
    const type = text(item.type, 20);
    if (!allowed.has(type)) throw new ApiError(400, "INVALID_FORM_FIELD", "表单字段类型不受支持。");
    const label = text(item.label, 120);
    if (!label) throw new ApiError(400, "INVALID_FORM_FIELD", "每个表单字段都需要名称。");
    return {
      id,
      label,
      type: type as FormField["type"],
      required: item.required === true,
      options: stringArray(item.options, 30),
      placeholder: text(item.placeholder, 200),
    };
  });
}

export interface ServiceWrite {
  id: string;
  categoryId: string;
  dailyHelpGroup: string;
  name: string;
  imageUrl: string;
  shortDescription: string;
  description: string;
  serviceAreas: string[];
  includes: string[];
  excludes: string[];
  owner: string;
  estimatedTime: string;
  cancellationRule: string;
  pricingMode: PricingMode;
  priceText: string;
  fixedAmountEURMinor: number | null;
  depositCNY: number | null;
  formSchema: FormField[];
  status: ServiceStatus;
  sortOrder: number;
  changeNote: string;
}

export function validateServiceWrite(body: Record<string, unknown>, existingId = ""): ServiceWrite {
  const pricingModes = new Set(["consultation", "manual_quote", "fixed_price", "deposit"]);
  const statuses = new Set(["draft", "published", "paused", "archived"]);
  const pricingMode = text(body.pricingMode, 30) || "manual_quote";
  const status = text(body.status, 30) || "draft";
  if (!pricingModes.has(pricingMode)) throw new ApiError(400, "INVALID_PRICING_MODE", "报价方式不正确。");
  if (!statuses.has(status)) throw new ApiError(400, "INVALID_SERVICE_STATUS", "服务状态不正确。");
  const name = text(body.name, 160);
  const categoryId = text(body.categoryId, 80);
  if (!name || !categoryId) throw new ApiError(400, "SERVICE_REQUIRED_FIELDS", "请填写服务分类和名称。");
  const sortOrder = Number(body.sortOrder ?? 100);
  if (!Number.isFinite(sortOrder)) throw new ApiError(400, "INVALID_SORT_ORDER", "排序格式不正确。");
  return {
    id: existingId || slug(body.id),
    categoryId,
    dailyHelpGroup: text(body.dailyHelpGroup, 80),
    name,
    imageUrl: text(body.imageUrl, 1000),
    shortDescription: text(body.shortDescription, 500),
    description: text(body.description, 5000),
    serviceAreas: stringArray(body.serviceAreas),
    includes: stringArray(body.includes),
    excludes: stringArray(body.excludes),
    owner: text(body.owner, 160),
    estimatedTime: text(body.estimatedTime, 500),
    cancellationRule: text(body.cancellationRule, 1000),
    pricingMode: pricingMode as PricingMode,
    priceText: text(body.priceText, 500) || "待客服评估",
    fixedAmountEURMinor: amount(body.fixedAmountEURMinor),
    depositCNY: amount(body.depositCNY),
    formSchema: schema(body.formSchema),
    status: status as ServiceStatus,
    sortOrder: Math.round(sortOrder),
    changeNote: text(body.changeNote, 500),
  };
}

async function recordVersion(env: Env, row: ServiceRow, changedBy: string, changeNote: string) {
  await env.DB.prepare(
    "INSERT INTO service_versions (id, service_id, version, snapshot_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), row.id, row.version, serviceSnapshot(row), changedBy, changeNote, new Date().toISOString())
    .run();
}

export async function createService(env: Env, input: ServiceWrite, changedBy: string): Promise<ServiceRow> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO services (
      id, category_id, daily_help_group, name, image_url, short_description, description,
      service_areas_json, includes_json, excludes_json, owner, estimated_time,
      cancellation_rule, pricing_mode, price_text, fixed_amount_eur_minor, deposit_cny,
      form_schema_json, status, sort_order, version, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
  )
    .bind(
      input.id, input.categoryId, input.dailyHelpGroup || null, input.name, input.imageUrl || null,
      input.shortDescription, input.description, JSON.stringify(input.serviceAreas), JSON.stringify(input.includes),
      JSON.stringify(input.excludes), input.owner || null, input.estimatedTime, input.cancellationRule,
      input.pricingMode, input.priceText, input.fixedAmountEURMinor, input.depositCNY,
      JSON.stringify(input.formSchema), input.status, input.sortOrder,
      input.status === "published" ? now : null, now, now,
    )
    .run();
  const row = await getService(env, input.id);
  await recordVersion(env, row, changedBy, input.changeNote || "创建服务");
  return row;
}

export async function updateService(env: Env, id: string, input: ServiceWrite, changedBy: string): Promise<ServiceRow> {
  const current = await getService(env, id);
  const existingVersion = await env.DB.prepare(
    "SELECT id FROM service_versions WHERE service_id = ? AND version = ? LIMIT 1",
  ).bind(id, current.version).first();
  if (!existingVersion) await recordVersion(env, current, "系统", "修改前快照");
  const now = new Date().toISOString();
  const version = current.version + 1;
  const publishedAt = input.status === "published" ? current.published_at || now : current.published_at;
  await env.DB.prepare(
    `UPDATE services SET
      category_id = ?, daily_help_group = ?, name = ?, image_url = ?, short_description = ?, description = ?,
      service_areas_json = ?, includes_json = ?, excludes_json = ?, owner = ?, estimated_time = ?,
      cancellation_rule = ?, pricing_mode = ?, price_text = ?, fixed_amount_eur_minor = ?, deposit_cny = ?,
      form_schema_json = ?, status = ?, sort_order = ?, version = ?, published_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      input.categoryId, input.dailyHelpGroup || null, input.name, input.imageUrl || null,
      input.shortDescription, input.description, JSON.stringify(input.serviceAreas), JSON.stringify(input.includes),
      JSON.stringify(input.excludes), input.owner || null, input.estimatedTime, input.cancellationRule,
      input.pricingMode, input.priceText, input.fixedAmountEURMinor, input.depositCNY,
      JSON.stringify(input.formSchema), input.status, input.sortOrder, version, publishedAt, now, id,
    )
    .run();
  const row = await getService(env, id);
  await recordVersion(env, row, changedBy, input.changeNote || "更新服务");
  return row;
}

export async function duplicateService(env: Env, id: string, newId: string, changedBy: string): Promise<ServiceRow> {
  const source = await getService(env, id);
  return createService(env, {
    id: slug(newId),
    categoryId: source.category_id,
    dailyHelpGroup: source.daily_help_group || "",
    name: `${source.name}（副本）`,
    imageUrl: source.image_url || "",
    shortDescription: source.short_description,
    description: source.description,
    serviceAreas: parseArray(source.service_areas_json),
    includes: parseArray(source.includes_json),
    excludes: parseArray(source.excludes_json),
    owner: source.owner || "",
    estimatedTime: source.estimated_time,
    cancellationRule: source.cancellation_rule,
    pricingMode: source.pricing_mode,
    priceText: source.price_text,
    fixedAmountEURMinor: source.fixed_amount_eur_minor,
    depositCNY: source.deposit_cny,
    formSchema: parseSchema(source.form_schema_json),
    status: "draft",
    sortOrder: source.sort_order + 1,
    changeNote: `复制自 ${source.id}`,
  }, changedBy);
}

export async function listServiceVersions(env: Env, id: string) {
  const result = await env.DB.prepare(
    "SELECT id, service_id, version, changed_by, change_note, created_at FROM service_versions WHERE service_id = ? ORDER BY version DESC",
  )
    .bind(id)
    .all();
  return result.results;
}

