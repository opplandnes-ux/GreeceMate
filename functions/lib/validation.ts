import { ApiError } from "./errors";

export const ORDER_STATUSES = [
  "新订单",
  "待确认",
  "待补资料",
  "已报价",
  "已付款",
  "已派单",
  "执行中",
  "待客户确认",
  "已完成",
  "已取消",
  "售后处理中",
] as const;

const SERVICE_CATALOG: Record<string, string> = {
  "airport-transfer": "希腊机场接送服务",
  "bank-appointment": "希腊银行开户协助",
  "afm-assist": "希腊 AFM 税号申请协助",
  "pink-slip-reminder": "希腊数字身份与联系方式维护",
  "residence-renewal": "希腊黄金签证续期协助",
  "rental-check": "房屋出租前状态体检",
  "pre-purchase-check": "购房前房屋现场核验",
  handover: "换中介前收房与资产交接",
  "repair-review": "上门维修核验与报价复核",
  "bill-payment": "希腊房产税 / 电费 / 水费 / 物业费代缴协助",
  "ferry-ticket": "希腊船票代订协助",
  "custom-itinerary": "希腊自由行行程定制咨询",
  "buyer-service": "GreeceMate Buyer Service",
};

export interface ValidatedOrderInput {
  orderType: "serviceOrder" | "buyerService";
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  servicePriceText: string;
  customerName: string;
  contact: string;
  wechat: string;
  whatsapp: string;
  email: string;
  country: string;
  city: string;
  preferredTime: string;
  isUrgent: boolean;
  chineseCompanion: boolean;
  uploadNeeded: boolean;
  description: string;
  notes: string;
  propertyLink: string;
  propertyAddress: string;
  budget: string;
  goldenVisaPlan: string;
  familyMembers: string;
  currentStage: string;
  source: string;
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === "是" || value === 1;
}

function requireText(value: unknown, label: string, maxLength: number): string {
  const result = text(value, maxLength);
  if (!result) throw new ApiError(400, "VALIDATION_ERROR", `请填写${label}。`);
  return result;
}

export function validateOrderInput(body: Record<string, unknown>): ValidatedOrderInput {
  const rawType = text(body.orderType || body.formType, 32);
  if (rawType !== "serviceOrder" && rawType !== "buyerService") {
    throw new ApiError(400, "INVALID_ORDER_TYPE", "订单类型不正确。" );
  }

  const fallbackServiceId = rawType === "buyerService" ? "buyer-service" : "";
  const serviceId = requireText(body.serviceId || fallbackServiceId, "服务类型", 80);
  const serviceName = SERVICE_CATALOG[serviceId];
  if (!serviceName) {
    throw new ApiError(400, "INVALID_SERVICE", "所选服务不存在或暂不可提交。" );
  }

  const customerName = requireText(body.customerName || body.name, "姓名", 120);
  const email = text(body.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "邮箱格式不正确。" );
  }

  const wechat = text(body.wechat, 120);
  const whatsapp = text(body.whatsapp, 120);
  const contact = text(body.contact, 240) || [wechat, whatsapp].filter(Boolean).join(" / ");
  if (!contact && !email) {
    throw new ApiError(400, "CONTACT_REQUIRED", "请至少填写一种联系方式。" );
  }

  return {
    orderType: rawType,
    serviceId,
    serviceName,
    serviceCategory: text(body.serviceCategory, 120),
    servicePriceText: text(body.servicePrice || body.servicePriceText, 500),
    customerName,
    contact,
    wechat,
    whatsapp,
    email,
    country: text(body.country, 120),
    city: text(body.city, 160),
    preferredTime: text(body.preferredTime, 120),
    isUrgent: bool(body.isUrgent ?? body.urgent),
    chineseCompanion: bool(body.chineseCompanion),
    uploadNeeded: bool(body.uploadNeeded),
    description: text(body.description, 5000),
    notes: text(body.notes || body.note, 5000),
    propertyLink: text(body.propertyLink || body.property_link, 2000),
    propertyAddress: text(body.propertyAddress || body.property_address, 1000),
    budget: text(body.budget, 300),
    goldenVisaPlan: text(body.goldenVisaPlan || body.goldenVisa || body.golden_visa, 80),
    familyMembers: text(body.familyMembers || body.family_members || body.familySize, 80),
    currentStage: text(body.currentStage || body.stage || body.buyerStage, 160),
    source: text(body.source || body.sourcePage, 1000),
  };
}

export interface AdminUpdateInput {
  orderStatus?: string;
  assignedTo?: string;
  internalNotes?: string;
  resultNotes?: string;
  isUrgent?: boolean;
}

export function validateAdminUpdate(body: Record<string, unknown>): AdminUpdateInput {
  const update: AdminUpdateInput = {};
  if (body.orderStatus !== undefined) {
    const status = text(body.orderStatus, 40);
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
      throw new ApiError(400, "INVALID_ORDER_STATUS", "订单状态不正确。" );
    }
    update.orderStatus = status;
  }
  if (body.assignedTo !== undefined) update.assignedTo = text(body.assignedTo, 160);
  if (body.internalNotes !== undefined) update.internalNotes = text(body.internalNotes, 5000);
  if (body.resultNotes !== undefined) update.resultNotes = text(body.resultNotes, 5000);
  if (body.isUrgent !== undefined) update.isUrgent = bool(body.isUrgent);

  if (!Object.keys(update).length) {
    throw new ApiError(400, "EMPTY_UPDATE", "没有可保存的订单修改。" );
  }
  return update;
}

