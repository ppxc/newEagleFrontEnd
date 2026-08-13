/**
 * management 模块 /zyxt/api 整合
 * - car-cockpit / non-car-cockpit：占位页，无 /zyxt/api
 * - flood-season：汛期驾驶舱，集中 7 个数据源
 */
import request from '@utils/http'

// 页面: flood-season.vue — 汛期驾驶舱
export const RainCockpit = {
  /** 今日气象预警等级滚动文字 */
  getDayLevels(params = {}) {
    return request.get({ url: '/zyxt/api/rain/dayLevel', params })
  },
  /** 停车点位（地图 marker） */
  getCarPlaces(params = {}) {
    return request.get({ url: '/zyxt/api/rain/carPlace', params })
  },
  /** 值班信息 */
  getZhibans(params = {}) {
    return request.get({ url: '/zyxt/api/rain/zhiban', params })
  },
  /** 施救单位 */
  getRepairs(params = {}) {
    return request.get({ url: '/zyxt/api/rain/repair', params })
  },
  /** 中心对口联络机制 */
  getLianluos(params = {}) {
    return request.get({ url: '/zyxt/api/rain/lianluo', params })
  },
  /** 物资库存 */
  getItems(params = {}) {
    return request.get({ url: '/zyxt/api/rain/items', params })
  },
  /** 今日预警措施 */
  getLevelProcesses(params = {}) {
    return request.get({ url: '/zyxt/api/rain/levelProcess', params })
  },
  /** 卡片数据 */
  getCardData(params = {}) {
    return request.get({ url: '/zyxt/api/rain/cardData', params })
  },
  /** 数据报表表格 */
  getReportTable(params = {}) {
    return request.get({ url: '/zyxt/api/rain/reportTable', params })
  },
  /** 汛期热力图数据（聚合热力图,来自 acd_old_case_rain_xq） */
  getFloodSeasonHeatmapData(params = {}) {
    return request.get({ url: '/zyxt/api/rain/hotmap', params })
  },
  /** 汛期热力点(原始 marker 列表,与 /hotmap 并行,每点带密度着色档位)。
   *  支持 params.date(YYYY-MM-DD),按 reportdate 过滤单日数据;不传则返回全量。 */
  getHotPoints(params = {}) {
    return request.get({ url: '/zyxt/api/rain/hotPoints', params })
  },
  /** 单日热力点便捷方法(走 /api/rain/hotPoints) */
  getHotPointsByDate(date) {
    return request.get({ url: '/zyxt/api/rain/hotPoints', params: { date } })
  },
  /** 汛期热力点(单一日期,走 /api/hotmap,实际后端 endpoint) */
  getHotmapByDate(date) {
    return request.get({ url: '/zyxt/api/hotmap', params: { date } })
  }
}

// ============================================================
// 维修管理 / 送修资源管理看板 — 接口预留
// ------------------------------------------------------------
// 当前阶段:不接后端。所有方法体只 console.info 留痕 + 返回空,
//           页面层会用 MOCK_* 常量 fallback,保证 UI 不空白。
// 等后端 `/api/repair/*` 真实接口就绪后,只需替换每个方法体为:
//   return request.get({ url: '/zyxt/api/repair/xxx', params })
// ============================================================

const repairTodo = (method, params) =>
  console.info(
    `[RepairCockpit.${method}] TODO: 等待后端 /repair/* 接口实现`,
    params
  )

// 注:此文件为 .js,通过 JSDoc 引入 types.ts 的类型,供 .vue SFC TS 推断使用
/**
 * @typedef {import('./types').StoreType} StoreType
 * @typedef {import('./types').DimensionType} DimensionType
 * @typedef {import('./types').PersonnelDim} PersonnelDim
 * @typedef {import('./types').RepairCoreMetricsVO} RepairCoreMetricsVO
 * @typedef {import('./types').RepairTrendVO} RepairTrendVO
 * @typedef {import('./types').ProdRatioDetailVO} ProdRatioDetailVO
 * @typedef {import('./types').RepairTableRowVO} RepairTableRowVO
 * @typedef {import('./types').PrTableRowVO} PrTableRowVO
 * @typedef {import('./types').PersonnelRowVO} PersonnelRowVO
 */

/**
 * @typedef {object} GetKpiParams
 * @property {string} [date]   统计日期 YYYY-MM-DD
 * @typedef {object} GetTrendParams
 * @property {StoreType} storeType
 * @typedef {object} GetOrgDimParams
 * @property {DimensionType} dimension
 * @typedef {object} GetTeamDimParams
 * @property {PersonnelDim} dimension
 */

/** 页面: repair_management.vue — 送修资源管理看板 */
export const RepairCockpit = {
  /**
   * 4 张 KPI 卡片的核心指标
   * @param {GetKpiParams} [params]
   * @returns {Promise<Partial<RepairCoreMetricsVO>>}
   */
  getKpi(params = {}) {
    repairTodo('getKpi', params)
    return Promise.resolve({})
  },

  /**
   * 明细趋势数据(按 4S / 修理厂 拆分)
   * @param {GetTrendParams} params
   * @returns {Promise<Partial<RepairTrendVO>>}
   */
  getTrend(params = { storeType: '4s' }) {
    repairTodo('getTrend', params)
    return Promise.resolve({})
  },

  /**
   * 产保比管控明细(按 4S / 修理厂)
   * @param {GetTrendParams} params
   * @returns {Promise<Partial<ProdRatioDetailVO>>}
   */
  getPrRatio(params = { storeType: '4s' }) {
    repairTodo('getPrRatio', params)
    return Promise.resolve({})
  },

  /**
   * 机构 / 品牌 / 集团 维度 送修多指标 明细表格
   * @param {GetOrgDimParams} params
   * @returns {Promise<Partial<Record<DimensionType, RepairTableRowVO[]>>>}
   */
  getOrgDim(params = { dimension: '机构' }) {
    repairTodo('getOrgDim', params)
    return Promise.resolve({})
  },

  /**
   * 机构 / 品牌 / 集团 维度 产保比管控 明细表格
   * @param {GetOrgDimParams} params
   * @returns {Promise<Partial<Record<DimensionType, PrTableRowVO[]>>>}
   */
  getOrgPrDim(params = { dimension: '机构' }) {
    repairTodo('getOrgPrDim', params)
    return Promise.resolve({})
  },

  /**
   * 分部 / 小组 / 个人 维度 查勘人员效能表格
   * @param {GetTeamDimParams} params
   * @returns {Promise<Partial<Record<PersonnelDim, PersonnelRowVO[]>>>}
   */
  getTeamDim(params = { dimension: '分部' }) {
    repairTodo('getTeamDim', params)
    return Promise.resolve({})
  }
}

