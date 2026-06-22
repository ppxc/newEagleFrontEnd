import request from '@/utils/http'

// 去除 VITE_API_PROXY_PORT_URL 末尾的斜杠
const VITE_API_PROXY_PORT_URL = (import.meta.env.VITE_API_PROXY_PORT_URL || '').replace(/\/$/, '')

// ==================== 人员位置相关 API ====================
export const personalmap = {
  /** 获取人员最新位置 */
  axiosRequestLatestLocations(params) {
    return request.get({ url: '/zyxt/api/locations/latest', params })
  },
  /** 获取片区列表 */
  axiosRequestGroupList(params) {
    return request.get({ url: '/zyxt/api/locations/groups', params })
  },
  /** 获取单个人员轨迹 */
  axiosRequestUserTrajectory(usercode, params) {
    return request.get({ url: `/zyxt/api/locations/user/${usercode}`, params })
  },
  /** 获取人员位置地址解析进度 */
  axiosRequestLocationProgress(params) {
    return request.get({ url: '/zyxt/api/locations/latest/progress', params })
  }
}

// ==================== 热力图相关 API ====================
export const hotmap = {
  /** 获取统计卡片数据 */
  axiosRequestStatsCardsData(params) {
    return request.get({ url: '/zyxt/api/statsCardsData', params })
  },
  /** 获取热力图数据 */
  axiosRequestHeatMapData(params) {
    return request.get({ url: '/zyxt/api/hotmap', params })
  },
  /** 获取热力图数据解析进度 */
  axiosRequestHotmapProgress(params) {
    return request.get({ url: '/zyxt/api/hotmap/progress', params })
  }
}

// ==================== 行政区划相关 API（内部使用）===================
export const geocoder = (location) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/geocoder?location=${location}`
  return request.get({ url })
}

export const searchDistrict = (keyword) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/district/search?keyword=${encodeURIComponent(keyword)}`
  return request.get({ url })
}

export const districtChildren = (id) => {
  return request.get({ url: '/zyxt/api/map/district/getchildren', params: { id } })
}
