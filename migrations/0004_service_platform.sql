PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  daily_help_group TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  service_areas_json TEXT NOT NULL DEFAULT '[]',
  includes_json TEXT NOT NULL DEFAULT '[]',
  excludes_json TEXT NOT NULL DEFAULT '[]',
  owner TEXT,
  estimated_time TEXT NOT NULL DEFAULT '',
  cancellation_rule TEXT NOT NULL DEFAULT '',
  pricing_mode TEXT NOT NULL DEFAULT 'manual_quote'
    CHECK (pricing_mode IN ('consultation', 'manual_quote', 'fixed_price', 'deposit')),
  price_text TEXT NOT NULL DEFAULT '待客服评估',
  fixed_amount_eur_minor INTEGER,
  deposit_cny INTEGER,
  form_schema_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_status_sort
  ON services(status, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_services_daily_help
  ON services(daily_help_group, status, sort_order);

CREATE TABLE IF NOT EXISTS service_versions (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  changed_by TEXT,
  change_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(service_id, version)
);

ALTER TABLE orders ADD COLUMN service_snapshot_json TEXT;
ALTER TABLE orders ADD COLUMN custom_fields_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN location_status TEXT;
ALTER TABLE orders ADD COLUMN quote_status TEXT NOT NULL DEFAULT 'not_quoted';
ALTER TABLE orders ADD COLUMN quote_service_fee_eur_minor INTEGER;
ALTER TABLE orders ADD COLUMN quote_third_party_fee_eur_minor INTEGER;
ALTER TABLE orders ADD COLUMN quote_material_fee_eur_minor INTEGER;
ALTER TABLE orders ADD COLUMN quote_other_fee_eur_minor INTEGER;
ALTER TABLE orders ADD COLUMN quote_other_note TEXT;
ALTER TABLE orders ADD COLUMN quote_total_eur_minor INTEGER;
ALTER TABLE orders ADD COLUMN quote_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN quote_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN customer_confirmation_status TEXT NOT NULL DEFAULT 'not_requested';
ALTER TABLE orders ADD COLUMN customer_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN public_reply TEXT;
ALTER TABLE orders ADD COLUMN repeat_of_order_id TEXT;

CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT,
  public_note TEXT,
  internal_note TEXT,
  actor TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_created
  ON order_events(order_id, created_at);

CREATE TABLE IF NOT EXISTS order_attachments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content BLOB NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'customer'
    CHECK (visibility IN ('customer', 'internal', 'result')),
  uploaded_by TEXT NOT NULL DEFAULT 'customer'
    CHECK (uploaded_by IN ('customer', 'admin')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_attachments_order
  ON order_attachments(order_id, created_at);

-- Existing services remain published and keep their current URLs.
INSERT OR IGNORE INTO services (
  id, category_id, daily_help_group, name, short_description, description,
  service_areas_json, includes_json, excludes_json, estimated_time,
  cancellation_rule, pricing_mode, price_text, deposit_cny, form_schema_json,
  status, sort_order, version, published_at, created_at, updated_at
) VALUES
('airport-transfer','travel',NULL,'希腊机场接送服务','雅典机场与市区、码头、酒店、公寓之间的接送安排。','根据航班、人数、行李和目的地，协助匹配合适车辆与司机。','["雅典及周边"]','["航班和接送时间确认","车型建议与司机安排","接机点说明","中文客服在线沟通"]','["超出约定路线的临时绕行费用","停车费、高速费等额外费用"]','通常提前 24 小时确认；紧急需求视车辆情况回复。','车辆未派出前可协商调整；临近出发取消可能产生车辆预留费用。','deposit','雅典市区单程参考价 €65 起',300,'[]','published',10,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('bank-appointment','affairs','account_affairs','希腊银行开户协助','协助整理开户资料、预约银行网点，并提供现场陪同沟通。','根据客户情况协助梳理银行开户常见资料、预约沟通和现场陪同。','["雅典"]','["基础资料清单说明","预约时间沟通协助","现场陪同","开户流程提醒"]','["银行最终审核结果","资金划转或代替客户签署文件"]','通常需提前 3-10 个工作日沟通。','已发生预约沟通或顾问时间预留后，费用按已完成工作量说明。','deposit','预约与现场陪同 €150 起',500,'[]','published',20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('afm-assist','affairs','account_affairs','希腊 AFM 税号申请协助','协助准备 AFM 税号申请相关资料，并提供预约与现场陪同。','协助客户了解常见资料要求、预约路径和现场沟通注意事项。','["希腊"]','["资料清单核对","预约提醒","现场陪同沟通","后续信息保存提醒"]','["不承诺政府部门或第三方机构的最终审核结果"]','以政府部门预约和现场处理安排为准。','资料整理已开始后，按实际完成服务说明费用。','deposit','预约金 €100 起，最终按资料复杂度确认',500,'[]','published',30,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pink-slip-reminder','identity','account_affairs','希腊数字身份与联系方式维护','协助维护希腊手机号码、NCR、TAXISnet 和银行联系方式。','协助建立或检查客户在希腊长期身份维护中涉及的数字信息。','["希腊","远程"]','["希腊手机号码维护协助","NCR 联系方式维护协助","TAXISnet 与银行联系方式检查提醒"]','["未经确认代为操作客户账号","默认保管客户密码"]','提交后 1-2 个工作日内建立服务档案。','档案未建立前可取消；建立后按已完成工作说明。','deposit','€49 起 / 年',200,'[]','published',40,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('residence-renewal','affairs',NULL,'希腊黄金签证续期协助','协助梳理续期材料、时间节点、预约安排与现场陪同沟通。','根据家庭成员和材料复杂度评估服务范围。','["希腊","远程"]','["续期资料清单梳理","时间与预约节点提醒","材料完整性核对","现场陪同沟通"]','["移民局或政府机构的最终审核结果"]','取决于资料完整度和政府预约安排。','已完成资料整理或陪同的部分按工作量结算。','manual_quote','按材料复杂度和陪同次数报价',NULL,'[]','published',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('rental-check','property','property_certificates','房屋出租前状态体检','出租前上门核验房屋状态，整理问题清单和照片记录。','从设备、家具、表具、墙地面和基础设施角度做出租前状态记录。','["雅典及周边"]','["上门拍照记录","基础设施检查","问题清单整理","中文报告摘要"]','["专业工程检测","维修施工","责任判断"]','现场通常 1-2 小时，报告 1-2 个工作日内整理。','上门前可调整时间；顾问已出发后取消可能产生上门费用。','deposit','雅典市区 €120 起',500,'[]','published',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pre-purchase-check','property','property_certificates','购房前房屋现场核验','购房前协助客户现场查看房屋状态和周边基础情况。','围绕房屋基础状态、可见问题和交付风险点做现场记录。','["雅典及周边"]','["现场照片和视频记录","可见问题清单","周边基础信息记录","中文结果说明"]','["房产价值评估","律师尽调或工程检测"]','通常需提前 2-5 个工作日协调。','因对方临时取消可协助改期；已发生上门成本按实际说明。','manual_quote','按区域、房型和核验深度报价',NULL,'[]','published',70,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('handover','property','onsite_handover','换中介前收房与资产交接','协助完成钥匙、家具、电器、账单和房屋状态交接记录。','帮助业主建立交接清单，减少后续沟通遗漏。','["雅典及周边"]','["钥匙和物品记录","家具电器清单","表具读数拍照","交接结果说明"]','["责任判定","债务或押金裁决","维修施工"]','通常提前 3-7 个工作日协调。','已完成协调或上门部分按实际工作量结算。','manual_quote','按房屋数量和交接复杂度报价',NULL,'[]','published',80,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('repair-review','property','property_certificates','上门维修核验与报价复核','对维修问题进行现场核验，协助复核维修报价和施工结果。','协助业主了解维修问题的现场情况和报价项目构成。','["雅典及周边"]','["现场问题拍照","维修报价项目梳理","施工后结果记录","中文说明"]','["专业工程鉴定","施工质量担保"]','通常 1-3 个工作日内安排。','顾问已出发或已完成沟通后，按实际工作量说明。','deposit','预约金 €80 起，按上门区域和内容确认',300,'[]','published',90,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('bill-payment','property','utilities_network','希腊房产税 / 电费 / 水费 / 物业费代缴协助','协助识别账单、提醒缴费节点，并提供代缴沟通支持。','协助客户整理账单信息、确认缴费项目和留存凭证。','["希腊","远程"]','["账单识别","缴费节点提醒","费用说明整理","凭证归档提醒"]','["资金托管","替客户作出税务判断"]','普通账单通常 1-2 个工作日内处理。','账单识别和沟通已开始后，按服务进度说明费用。','manual_quote','单次账单协助 €30 起',NULL,'[]','published',100,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ferry-ticket','travel',NULL,'希腊船票代订协助','协助查询希腊岛屿船班、舱位和购票注意事项。','根据行程查询船班并协助购票。','["希腊"]','["船班查询","舱位说明","购票协助","行前提醒"]','["船票票款","航运公司取消或变更责任"]','通常 1 个工作日内回复。','出票后按航运公司规则退改。','manual_quote','单程查询与预订协助 €25 起，不含船票',NULL,'[]','published',110,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('custom-itinerary','travel',NULL,'希腊自由行行程定制咨询','根据天数、兴趣和预算提供希腊自由行建议。','提供路线与安排建议。','["希腊","远程"]','["需求沟通","路线建议","交通住宿提示","注意事项"]','["代替客户作出预订决定","第三方费用"]','通常 2-3 个工作日提供初版。','沟通开始后按已完成内容结算。','manual_quote','€99 起',NULL,'[]','published',120,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- New daily-help templates start as drafts until owner, scope and pricing are confirmed.
INSERT OR IGNORE INTO services (
  id, category_id, daily_help_group, name, short_description, description,
  service_areas_json, pricing_mode, price_text, form_schema_json, status,
  sort_order, version, created_at, updated_at
) VALUES
('daily-electrician-certificate','daily-help','property_certificates','电工检查与证书更新','安排电工检查并评估证书更新需求。','待确认负责人、服务边界和报价方式。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',210,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-account-change','daily-help','utilities_network','水电账户变更','协助梳理水电账户变更资料与办理安排。','待确认供应商范围、授权方式和报价。','["希腊","远程"]','manual_quote','待客服评估','[]','draft',220,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-network-support','daily-help','utilities_network','网络安装与报修','协助预约网络安装、迁移或故障报修。','待确认运营商范围、负责人和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',230,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-electrician','daily-help','repairs_cleaning','预约电工','根据问题说明协调电工上门。','待确认负责人、上门范围和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',240,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-plumber','daily-help','repairs_cleaning','预约水管工','根据漏水、堵塞等问题协调水管工。','待确认负责人、紧急响应范围和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',250,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-ac-repair','daily-help','repairs_cleaning','空调维修','协调空调检查、清洁或维修。','待确认合作方、服务地区和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',260,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-cleaning','daily-help','repairs_cleaning','预约清洁','协调普通、深度或入住前清洁。','待确认清洁范围、负责人和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',270,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-door-access','daily-help','onsite_handover','开门等师傅','在约定时间到场开门并完成必要交接。','待确认钥匙授权、等待时长和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',280,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-key-handover','daily-help','onsite_handover','钥匙交接','按授权要求完成钥匙领取或交付。','待确认身份核验、保管规则和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',290,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-delivery-inspection','daily-help','onsite_handover','收货验货','代为到场收货并记录包装及可见状态。','待确认物品范围、责任边界和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',300,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-property-management-contact','daily-help','account_affairs','联系物业','协助联系物业管理方并记录沟通结果。','待确认事项范围、授权方式和报价。','["希腊","远程"]','manual_quote','待客服评估','[]','draft',310,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-general-appointment','daily-help','account_affairs','预约办理','协助预约希腊本地机构或供应商服务。','待确认可承接机构范围、负责人和报价。','["希腊","远程"]','consultation','待客服评估','[]','draft',320,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('daily-document-delivery','daily-help','account_affairs','文件取送','在约定范围内领取或递送非敏感文件。','待确认文件范围、身份核验和报价。','["雅典及周边"]','manual_quote','待客服评估','[]','draft',330,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

