import axios from 'axios'
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
// 不走应用层 Result{ code, msg, data } 信封解包。为避免改动共享的 src/utils/http，
// 这里使用本模块内独立的 axios 实例（不带 Result 信封拦截器），直接透传上游原生响应，
// 并做一次归一化：若上游被包在 Result.data 中则取 .data，否则原样返回。

/** 行政区划专用 raw 实例：复用 http 的 baseURL/超时/鉴权，但跳过 Result{code,msg,data} 解包 */
const rawTencentInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: import.meta.env.VITE_WITH_CREDENTIALS === 'true',
  timeout: 15000
})

// 请求时同样携带应用侧的 access_token
rawTencentInstance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token')
  if (accessToken && config.headers) config.headers.set('Authorization', `Bearer ${accessToken}`)
  return config
})

/** 归一化：兼容「结果包在 Result.data」与「上游原生透传」两种形态 */
const normalizeTencentResponse = (res) =>
  res && typeof res === 'object' && res.data !== undefined && res.data !== null ? res.data : res

export const geocoder = async (location) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/geocoder?location=${location}`
  const res = await rawTencentInstance.get(url)
  return normalizeTencentResponse(res.data)
}

export const searchDistrict = async (keyword) => {
  const url = `${VITE_API_PROXY_PORT_URL}/zyxt/api/map/district/search?keyword=${encodeURIComponent(keyword)}`
  const res = await rawTencentInstance.get(url)
  return normalizeTencentResponse(res.data)
}

export const districtChildren = async (id) => {
  const res = await rawTencentInstance.get('/zyxt/api/map/district/getchildren', { params: { id } })
  return normalizeTencentResponse(res.data)
}
