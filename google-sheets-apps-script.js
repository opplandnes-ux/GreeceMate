var NOTIFY_EMAIL = "sunmixbn@gmail.com";
var STATUS_OPTIONS = ["新提交", "已联系", "待补资料", "已报价", "已成交", "已关闭"];

function doPost(e) {
  var data = e.parameter || {};
  var formType = data.formType || "buyerService";
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUrl = spreadsheet.getUrl();

  if (formType === "serviceOrder") {
    appendServiceOrder(spreadsheet, data, sheetUrl);
  } else {
    appendBuyerServiceLead(spreadsheet, data, sheetUrl);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, formType: formType }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendBuyerServiceLead(spreadsheet, data, sheetUrl) {
  var headers = [
    "提交时间",
    "来源",
    "姓名",
    "微信 / WhatsApp",
    "邮箱",
    "房源链接",
    "房源地址",
    "预算",
    "是否计划申请黄金签证",
    "家庭成员人数",
    "当前阶段",
    "备注",
    "状态",
  ];
  var sheet = getOrCreateSheet(spreadsheet, "Buyer Service Leads", headers);
  ensureStatusValidation(sheet);

  var row = [
    data.submittedAt || new Date().toISOString(),
    data.source || "GreeceMate Buyer Service",
    data.name || data.buyerName || data["姓名"] || "",
    data.contact || data.wechat || data.whatsapp || data.buyerContact || data["微信 / WhatsApp"] || data["微信/WhatsApp"] || "",
    data.email || data.buyerEmail || data["邮箱"] || "",
    data.propertyLink || data.property_link || "",
    data.propertyAddress || data.property_address || "",
    data.budget || "",
    data.goldenVisa || data.golden_visa || data.goldenVisaPlan || "",
    data.familyMembers || data.family_members || data.familySize || "",
    data.stage || data.currentStage || data.buyerStage || "",
    data.notes || data.message || data.remark || data.buyerNote || "",
    data.status || data.leadStatus || data["状态"] || "新提交",
  ];
  sheet.appendRow(row);

  sendNotification(
    "【GreeceMate Buyer Service】新的房源初筛申请",
    buildBuyerServiceEmail(data, sheetUrl),
  );
}

function appendServiceOrder(spreadsheet, data, sheetUrl) {
  var headers = [
    "提交时间",
    "服务分类",
    "服务名称",
    "服务价格",
    "客户姓名",
    "微信 / WhatsApp",
    "邮箱",
    "电话",
    "房源地址 / 服务地址",
    "期望服务时间",
    "是否加急",
    "备注",
    "来源页面",
    "状态",
    "原始数据",
  ];
  var sheet = getOrCreateSheet(spreadsheet, "Service Orders", headers);
  ensureStatusValidation(sheet);

  var row = [
    data.submittedAt || new Date().toISOString(),
    data.serviceCategory || "",
    data.serviceName || data.serviceType || "",
    data.servicePrice || "",
    data.customerName || data.name || "",
    data.contact || data.wechat || data.whatsapp || "",
    data.email || "",
    data.phone || "",
    data.serviceAddress || data.city || "",
    data.preferredTime || "",
    data.urgent || "",
    data.notes || data.description || data.note || "",
    data.sourcePage || data.source || "",
    data.status || data.leadStatus || data["状态"] || "新提交",
    JSON.stringify(data),
  ];
  sheet.appendRow(row);

  sendNotification(
    "【GreeceMate Service Order】新的服务下单需求",
    buildServiceOrderEmail(data, sheetUrl),
  );
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  headers.forEach(function (header) {
    if (existingHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });

  return sheet;
}

function ensureStatusValidation(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var statusIndex = headers.indexOf("状态") + 1;
  if (!statusIndex) {
    statusIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, statusIndex).setValue("状态");
  }

  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var validation = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusIndex, maxRows, 1).setDataValidation(validation);
}

function sendNotification(subject, body) {
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    body: body,
  });
}

function buildBuyerServiceEmail(data, sheetUrl) {
  return [
    "提交时间：" + (data.submittedAt || new Date().toISOString()),
    "姓名：" + (data.name || data.buyerName || ""),
    "微信 / WhatsApp：" + (data.contact || data.wechat || data.whatsapp || data.buyerContact || ""),
    "邮箱：" + (data.email || data.buyerEmail || ""),
    "房源链接：" + (data.propertyLink || data.property_link || ""),
    "房源地址：" + (data.propertyAddress || data.property_address || ""),
    "预算：" + (data.budget || ""),
    "是否计划申请黄金签证：" + (data.goldenVisa || data.golden_visa || data.goldenVisaPlan || ""),
    "家庭成员人数：" + (data.familyMembers || data.family_members || data.familySize || ""),
    "当前阶段：" + (data.stage || data.currentStage || data.buyerStage || ""),
    "备注：" + (data.notes || data.message || data.remark || data.buyerNote || ""),
    "状态：" + (data.status || data.leadStatus || data["状态"] || "新提交"),
    "Google Sheet 链接：" + sheetUrl,
  ].join("\n");
}

function buildServiceOrderEmail(data, sheetUrl) {
  return [
    "提交时间：" + (data.submittedAt || new Date().toISOString()),
    "服务分类：" + (data.serviceCategory || ""),
    "服务名称：" + (data.serviceName || data.serviceType || ""),
    "服务价格：" + (data.servicePrice || ""),
    "客户姓名：" + (data.customerName || data.name || ""),
    "微信 / WhatsApp：" + (data.contact || data.wechat || data.whatsapp || ""),
    "邮箱：" + (data.email || ""),
    "电话：" + (data.phone || ""),
    "房源地址 / 服务地址：" + (data.serviceAddress || data.city || ""),
    "期望服务时间：" + (data.preferredTime || ""),
    "是否加急：" + (data.urgent || ""),
    "备注：" + (data.notes || data.description || data.note || ""),
    "来源页面：" + (data.sourcePage || data.source || ""),
    "Google Sheet 链接：" + sheetUrl,
  ].join("\n");
}
