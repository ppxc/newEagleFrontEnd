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
