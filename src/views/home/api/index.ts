/**
 * 首页 / 工作台 API 模块
 * 留出向后端请求数据的接口：真接口 + mock 回落，后续联调时去掉 .catch 即可
 */
import api from '@/utils/http'
import type { StatsCardVO, WorkloadDeptVO, ActivityVO, TodoVO, UserRowVO } from './types'
import { mockStatsCards, mockWorkload, mockActivities, mockTodos, mockUserRows } from './mock'

export const Home = {
  /**
   * 4 个顶部统计卡
   * 后端: GET /api/statsCardsData
   * 返回: List<StatsCardData>，字段 { title, count, description }
   */
  getCardStats(): Promise<StatsCardVO[]> {
    return api.get<StatsCardVO[]>({ url: '/api/statsCardsData' }).catch(() => mockStatsCards)
  },

  /**
   * 部门级工作量趋势
   * 后端: GET /api/workload/department?startDate=&endDate=&comName=&granularity=month
   * 返回: List<WorkloadDeptData>，每项 { comCode, comName, data: List<MonthData> }
   * MonthData: { period, zl, ja, ckJsl, dsTjl, isAbnormal, abnormalType }
   */
  getWorkloadTrend(granularity: 'month' | 'day' = 'month'): Promise<WorkloadDeptVO[]> {
    return api
      .get<WorkloadDeptVO[]>({
        url: '/api/workload/department',
        params: { granularity, comName: '' }
      })
      .catch(() => mockWorkload)
  },

  /**
   * 查勘员排行（暂无后端，复用 mock）
   * 占位：未来可对接 /api/workload/employee 返回 TopN
   */
  getUserRanking(): Promise<UserRowVO[]> {
    return Promise.resolve(mockUserRows)
  },

  /**
   * 系统动态（暂无后端）
   * 占位：未来可对接 /api/sys/operation/log 或通知中心
   */
  getActivities(): Promise<ActivityVO[]> {
    return Promise.resolve(mockActivities)
  },

  /**
   * 待办事项（暂无后端）
   * 占位：未来可对接 /api/todo/list
   */
  getTodoList(): Promise<TodoVO[]> {
    return Promise.resolve(mockTodos)
  },

  /**
   * 热力图数据（首页不渲染地图，仅预留跳转接口）
   * 后端: GET /api/hotmap?date=YYYY-MM-DD
   */
  getHotmap(date?: string) {
    return api.get<unknown[]>({ url: '/api/hotmap', params: { date } })
  }
}

export type {
  StatsCardVO,
  WorkloadDeptVO,
  WorkloadPeriodVO,
  ActivityVO,
  TodoVO,
  UserRowVO
} from './types'
