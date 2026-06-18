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
  /** 汛期热力图数据（来自 acd_old_case_rain_xq） */
  getFloodSeasonHeatmapData(params = {}) {
    return request.get({ url: '/zyxt/api/rain/hotmap', params })
  }
}
