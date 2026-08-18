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

// ==================== 行政区划相关 API（内部使用）====================
// 注意：这三个接口返回的是腾讯地图上游原生结构 { status, message, result }，
// 不走应用层 Result{ code, msg, data } 信封解包。故统一使用 skipUnwrap: true，
// 并做一次归一化：若上游被包在 Result.data 中则取 .data，否则原样返回。

/** 归一化：兼容「结果包在 Result.data」与「上游原生透传」两种形态 */
const normalizeTencentResponse = (res) =>
  res && typeof res === 'object' && res.data !== undefined && res.data !== null ? res.data : res

export const geocoder = async (location) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/geocoder?location=${location}`
  const res = await request.get({ url, skipUnwrap: true })
  return normalizeTencentResponse(res)
}

export const searchDistrict = async (keyword) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/district/search?keyword=${encodeURIComponent(keyword)}`
  const res = await request.get({ url, skipUnwrap: true })
  return normalizeTencentResponse(res)
}

export const districtChildren = async (id) => {
  const res = await request.get({ url: '/zyxt/api/map/district/getchildren', params: { id }, skipUnwrap: true })
  return normalizeTencentResponse(res)
}
