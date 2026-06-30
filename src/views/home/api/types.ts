/**
 * 首页 / 工作台数据模型
 * 与后端 Result.data 字段保持一致（MyBatis map-underscore-to-camel-case 自动转换）
 */

export interface StatsCardVO {
  title: string
  count: number
  description: string
  icon?: string
  change?: string
}

export interface WorkloadDeptVO {
  comCode: string
  comName: string
  data: WorkloadPeriodVO[]
}

export interface WorkloadPeriodVO {
  period: string
  zl: number
  ja: number
  ckJsl?: number
  dsTjl?: number
  isAbnormal?: boolean
  abnormalType?: string
}

export interface ActivityVO {
  username: string
  type: string
  target: string
  time?: string
}

export interface TodoVO {
  id: string
  title: string
  time: string
  done: boolean
}

export interface UserRowVO {
  username: string
  org: string
  pro: number
  color: string
  avatar?: string
}
