/**
 * management 模块 — 维修/送修资源 数据 VO 类型
 *
 * 维修管理 / 送修资源管理看板 (`pages/repair_management.vue`) 的所有
 * 数据结构都集中在这里。`api/index.js` 通过 `import type { ... } from './types'`
 * 引用,页面 SFC 通过相对路径直接 `import type`。
 */

// ============ 枚举/字面量联合 ============

/** 4S 店 vs 修理厂 — 切换卡片 / 详情区数据维度 */
export type StoreType = '4s' | 'repair'

/** 机构 / 品牌 / 集团 — 多维分析 tab1 的分析维度 */
export type DimensionType = '机构' | '品牌' | '集团'

/** 预警状态枚举 — 用于产保比单元格染色 + 导出文本映射 */
export type PrStatus = 'normal' | 'warning' | 'danger'

/** 分部 / 小组 / 个人 — tab2 的查勘人员效能分析维度 */
export type PersonnelDim = '分部' | '小组' | '个人'

/** 核心指标 4 张卡片的标识 */
export type ActiveDetailCard = 'card1' | 'card2' | 'card3' | 'card4'

// ============ VO 类型 ============

/** 4 张核心卡的数值 (card1 success / card2 PR / card3 4S 台次占比 / card4 4S 定损金额占比) */
export interface RepairCoreMetricsVO {
  card1SuccessRate: number
  card2ProdRatio: number
  card2Target: number
  card2Threshold: number
  card3ShareCount: number
  card3Mom: number
  card3Yoy: number
  card4ShareAmount: number
  card4Mom: number
  card4Yoy: number
}

/** 明细区单条 sparkline(5 个指标中一个) */
export interface TrendItemVO {
  metricKey: string
  metricName: string
  unit: string
  currentValue: number
  /** 6 个月数据点(数字顺序 = 月份顺序) */
  trend: number[]
}

/** 产保比明细 (card2 详情区 3 张卡片共用) */
export interface ProdRatioDetailVO {
  prodRatio: number
  targetRatio: number
  thresholdRatio: number
  claimAmount: number
  premium: number
}

/** tab1 多指标明细表格行 */
export interface RepairTableRowVO {
  name: string
  firstPushSuccess: number
  firstPushTotal: number
  successRate: number
  firstPushRate: number
  returnRate: number
  publicRes: number
  thirdPartyPush: number
  secondPushRate: number
}

/** tab1 产保比管控明细表格行 */
export interface PrTableRowVO {
  name: string
  claimAmount: number
  premium: number
  prodRatio: number
  targetRatio: number
  thresholdRatio: number
  partsDiscount: number
  laborDiscount: number
  status: PrStatus
}

/** tab2 查勘人员效能表格行 */
export interface PersonnelRowVO {
  name: string
  pushTotal: number
  firstPushSuccess: number
  firstPushTotal: number
  successRate: number
  secondRate: number
}

/** RepairCockpit.getTrend 返回结构 — 按 4S/修理厂 二分,每个 storeType 含 card1 (5 个趋势) + card2 (产保比) */
export type RepairTrendVO = Record<StoreType, {
  card1: Record<string, TrendItemVO>
  card2: ProdRatioDetailVO
}>

// ============ 表格列定义补充类型 ============

/**
 * 导出时的单元格格式化函数。挂在 ColumnOption 上(通过 `ColumnOption` 的 `[key: string]: any` 索引签名添加)
 * 行若没有 `export` 字段,导出走默认 `row[col.prop]` 路径。
 */
export type ExportFormatter = (row: any) => string | number

/**
 * 与项目 `ColumnOption` 兼容的扩展:用于类型推导 `col.export` / `col.defaultVisible` 的辅助类型。
 * 运行时并不强制(运行时 `ColumnOption` 即可),仅为 TypeScript 推断 XLSX 导出代码用。
 *
 * - `defaultVisible: false` 表"列筛选 popover 默认未勾选"(tab1 的 detail 列用)
 * - `export` 回调 用于 XLSX 导出时的单元格格式化(如产保比四舍五入、状态文本映射)
 */
export interface ColumnOptionExt {
  defaultVisible?: boolean
  export?: ExportFormatter
}
