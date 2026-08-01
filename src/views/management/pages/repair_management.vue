<script setup lang="ts">
/**
 * 送修资源管理看板
 * 
 * 本期实现: 单文件 SFC,数据全部 mock,不接后端
 * 图表: ECharts 6(替代原 HTML 的 Chart.js)
 * 表格: Element Plus ElTable(简化原 HTML 的手搓表格)
 */
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'


// ===== 类型定义 =====
export type StoreType = '4s' | 'repair'
export type DimensionType = '机构' | '品牌' | '集团'
export type PrStatus = 'normal' | 'warning' | 'danger'
export type PersonnelDim = '分部' | '小组' | '个人'
export type ActiveDetailCard = 'card1' | 'card2' | 'card3' | 'card4'

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

export interface TrendItemVO {
  metricKey: string
  metricName: string
  unit: string
  currentValue: number
  trend: number[]
}

export interface ProdRatioDetailVO {
  prodRatio: number
  targetRatio: number
  thresholdRatio: number
  claimAmount: number
  premium: number
}

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

export interface PersonnelRowVO {
  name: string
  pushTotal: number
  firstPushSuccess: number
  firstPushTotal: number
  successRate: number
  secondRate: number
}


// ===== Mock 数据(本期不接后端,前端硬编码) =====
const MONTHS = ['2月', '3月', '4月', '5月', '6月', '7月']

const coreMetrics: RepairCoreMetricsVO = {
  card1SuccessRate: 78.5,
  card2ProdRatio: 0.88,
  card2Target: 0.85,
  card2Threshold: 0.90,
  card3ShareCount: 65.2,
  card3Mom: 2.1,
  card3Yoy: -1.5,
  card4ShareAmount: 72.8,
  card4Mom: -0.8,
  card4Yoy: 3.2
}

const storeTypeDetailData: Record<StoreType, {
  card1: Record<string, TrendItemVO>
  card2: ProdRatioDetailVO
}> = {
  '4s': {
    card1: {
      successRate:       { metricKey: 'successRate',       metricName: '成功率',       unit: '%', currentValue: 78.5, trend: [75.2, 76.1, 77.3, 76.8, 78.1, 78.5] },
      returnRate:        { metricKey: 'returnRate',        metricName: '返修率',       unit: '%', currentValue: 4.5,  trend: [5.2, 4.8, 5.1, 4.6, 4.9, 4.5] },
      publicResRate:     { metricKey: 'publicResRate',     metricName: '公共资源成功率', unit: '%', currentValue: 65.7, trend: [62.3, 63.5, 64.1, 65.0, 64.8, 65.7] },
      thirdPartyPush:    { metricKey: 'thirdPartyPush',    metricName: '三者推送率',   unit: '%', currentValue: 48.6, trend: [45.2, 46.8, 47.3, 48.1, 47.9, 48.6] },
      secondPushTrigger: { metricKey: 'secondPushTrigger', metricName: '整体二推触发率', unit: '%', currentValue: 35.1, trend: [32.1, 33.5, 34.2, 33.8, 34.5, 35.1] }
    },
    card2: { prodRatio: 0.88, targetRatio: 0.85, thresholdRatio: 0.90, claimAmount: 1250, premium: 1480 }
  },
  'repair': {
    card1: {
      successRate:       { metricKey: 'successRate',       metricName: '成功率',       unit: '%', currentValue: 62.3, trend: [58.2, 59.5, 60.8, 61.2, 61.8, 62.3] },
      returnRate:        { metricKey: 'returnRate',        metricName: '返修率',       unit: '%', currentValue: 7.8,  trend: [8.5, 8.1, 7.9, 8.2, 7.6, 7.8] },
      publicResRate:     { metricKey: 'publicResRate',     metricName: '公共资源成功率', unit: '%', currentValue: 48.5, trend: [44.3, 45.2, 46.8, 47.1, 47.8, 48.5] },
      thirdPartyPush:    { metricKey: 'thirdPartyPush',    metricName: '三者推送率',   unit: '%', currentValue: 32.1, trend: [28.5, 29.8, 30.6, 31.2, 31.8, 32.1] },
      secondPushTrigger: { metricKey: 'secondPushTrigger', metricName: '整体二推触发率', unit: '%', currentValue: 22.4, trend: [18.2, 19.3, 20.5, 21.1, 21.8, 22.4] }
    },
    card2: { prodRatio: 0.72, targetRatio: 0.70, thresholdRatio: 0.78, claimAmount: 680, premium: 950 }
  }
}

const repairTableData: Record<DimensionType, RepairTableRowVO[]> = {
  '机构': [
    { name: '北京分公司', firstPushSuccess: 1234, firstPushTotal: 1567, successRate: 78.8, firstPushRate: 74.2, returnRate: 3.5, publicRes: 850, thirdPartyPush: 320, secondPushRate: 36.1 },
    { name: '上海分公司', firstPushSuccess: 1456, firstPushTotal: 1789, successRate: 81.4, firstPushRate: 76.8, returnRate: 2.8, publicRes: 920, thirdPartyPush: 410, secondPushRate: 38.5 },
    { name: '广州分公司', firstPushSuccess: 1132, firstPushTotal: 1501, successRate: 75.4, firstPushRate: 71.2, returnRate: 4.1, publicRes: 780, thirdPartyPush: 290, secondPushRate: 33.2 },
    { name: '深圳分公司', firstPushSuccess: 1289, firstPushTotal: 1623, successRate: 79.4, firstPushRate: 73.5, returnRate: 3.2, publicRes: 860, thirdPartyPush: 350, secondPushRate: 35.8 },
    { name: '成都分公司', firstPushSuccess: 987,  firstPushTotal: 1342, successRate: 73.5, firstPushRate: 69.8, returnRate: 4.5, publicRes: 650, thirdPartyPush: 240, secondPushRate: 31.2 },
    { name: '武汉分公司', firstPushSuccess: 1056, firstPushTotal: 1412, successRate: 74.8, firstPushRate: 70.5, returnRate: 4.2, publicRes: 720, thirdPartyPush: 270, secondPushRate: 32.5 }
  ],
  '品牌': [
    { name: '比亚迪', firstPushSuccess: 1890, firstPushTotal: 2310, successRate: 81.8, firstPushRate: 76.5, returnRate: 2.5, publicRes: 1200, thirdPartyPush: 580, secondPushRate: 39.2 },
    { name: '特斯拉', firstPushSuccess: 1234, firstPushTotal: 1567, successRate: 78.7, firstPushRate: 74.2, returnRate: 3.1, publicRes: 850, thirdPartyPush: 320, secondPushRate: 36.1 },
    { name: '蔚来', firstPushSuccess: 856, firstPushTotal: 1089, successRate: 78.6, firstPushRate: 73.8, returnRate: 3.4, publicRes: 580, thirdPartyPush: 240, secondPushRate: 35.4 },
    { name: '小鹏', firstPushSuccess: 945, firstPushTotal: 1234, successRate: 76.6, firstPushRate: 72.1, returnRate: 3.8, publicRes: 640, thirdPartyPush: 280, secondPushRate: 34.2 },
    { name: '理想', firstPushSuccess: 1123, firstPushTotal: 1456, successRate: 77.1, firstPushRate: 72.8, returnRate: 3.5, publicRes: 760, thirdPartyPush: 310, secondPushRate: 34.8 }
  ],
  '集团': [
    { name: '人保集团-华东', firstPushSuccess: 2450, firstPushTotal: 3012, successRate: 81.3, firstPushRate: 76.8, returnRate: 2.7, publicRes: 1620, thirdPartyPush: 720, secondPushRate: 38.9 },
    { name: '人保集团-华南', firstPushSuccess: 2135, firstPushTotal: 2720, successRate: 78.5, firstPushRate: 74.2, returnRate: 3.2, publicRes: 1420, thirdPartyPush: 580, secondPushRate: 36.4 },
    { name: '人保集团-华北', firstPushSuccess: 1987, firstPushTotal: 2543, successRate: 78.1, firstPushRate: 73.5, returnRate: 3.4, publicRes: 1320, thirdPartyPush: 540, secondPushRate: 35.7 },
    { name: '人保集团-西南', firstPushSuccess: 1456, firstPushTotal: 1987, successRate: 73.3, firstPushRate: 69.2, returnRate: 4.6, publicRes: 980, thirdPartyPush: 380, secondPushRate: 31.5 }
  ]
}

const prTableData: Record<DimensionType, PrTableRowVO[]> = {
  '机构': [
    { name: '北京分公司', claimAmount: 1250, premium: 1480, prodRatio: 0.84, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.88, laborDiscount: 0.82, status: 'normal' },
    { name: '上海分公司', claimAmount: 1180, premium: 1320, prodRatio: 0.89, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.85, laborDiscount: 0.78, status: 'warning' },
    { name: '广州分公司', claimAmount: 1420, premium: 1560, prodRatio: 0.91, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.90, laborDiscount: 0.85, status: 'danger' },
    { name: '深圳分公司', claimAmount: 980,  premium: 1150, prodRatio: 0.85, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.86, laborDiscount: 0.80, status: 'normal' },
    { name: '成都分公司', claimAmount: 760,  premium: 890,  prodRatio: 0.85, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.84, laborDiscount: 0.77, status: 'normal' }
  ],
  '品牌': [
    { name: '比亚迪', claimAmount: 2150, premium: 2580, prodRatio: 0.83, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.88, laborDiscount: 0.82, status: 'normal' },
    { name: '特斯拉', claimAmount: 1820, premium: 2050, prodRatio: 0.89, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.86, laborDiscount: 0.80, status: 'warning' },
    { name: '蔚来', claimAmount: 1450, premium: 1620, prodRatio: 0.90, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.89, laborDiscount: 0.84, status: 'warning' }
  ],
  '集团': [
    { name: '人保集团-华东', claimAmount: 3450, premium: 3960, prodRatio: 0.87, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.87, laborDiscount: 0.81, status: 'warning' },
    { name: '人保集团-华南', claimAmount: 3120, premium: 3680, prodRatio: 0.85, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.85, laborDiscount: 0.79, status: 'normal' },
    { name: '人保集团-华北', claimAmount: 2890, premium: 3240, prodRatio: 0.89, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.88, laborDiscount: 0.83, status: 'warning' }
  ]
}

const personnelBranchData: PersonnelRowVO[] = [
  { name: '华东分部', pushTotal: 2840, firstPushSuccess: 1200, firstPushTotal: 1600, successRate: 76.2, secondRate: 32.1 },
  { name: '华南分部', pushTotal: 2150, firstPushSuccess: 1000, firstPushTotal: 1300, successRate: 74.8, secondRate: 30.5 },
  { name: '华北分部', pushTotal: 1980, firstPushSuccess: 900,  firstPushTotal: 1200, successRate: 77.5, secondRate: 34.8 },
  { name: '西南分部', pushTotal: 1620, firstPushSuccess: 700,  firstPushTotal: 950,  successRate: 72.3, secondRate: 28.9 },
  { name: '华中分部', pushTotal: 1750, firstPushSuccess: 800,  firstPushTotal: 1050, successRate: 75.1, secondRate: 31.6 },
  { name: '东北分部', pushTotal: 1320, firstPushSuccess: 550,  firstPushTotal: 800,  successRate: 70.8, secondRate: 27.4 }
]


// ============ 工具函数 ============
const round = (v: number, d: number): number => {
  const p = Math.pow(10, d)
  return Math.round(v * p) / p
}

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ============ 全局状态 ============
const activeDetailCard = ref<ActiveDetailCard>('card1')
const activeAnalysisTab = ref<'tab1' | 'tab2'>('tab1')
const storeType = ref<StoreType>('4s')
const dimensionFilter = ref<DimensionType>('机构')

// ============ ECharts 实例管理 ============
const chartInstances: echarts.ECharts[] = []

const createMiniChart = (
  canvas: HTMLCanvasElement | null,
  data: number[],
  color: string
): void => {
  if (!canvas) return
  const chart = echarts.init(canvas, null, { renderer: 'canvas' })
  chart.setOption({
    grid: { left: 4, right: 4, top: 6, bottom: 4, containLabel: false },
    xAxis: {
      type: 'category',
      data: MONTHS,
      show: false
    },
    yAxis: {
      type: 'value',
      show: false
    },
    tooltip: {
      // 用 'axis' 触发 + 'none' axisPointer:
      //   ① 鼠标只要进入图表任何位置就会命中点(命中区域不再局限于 ~8px 圆心)
      //   ② 不渲染竖向/十字辅助线(无视觉干扰,只显示 tooltip 小窗)
      trigger: 'axis',
      axisPointer: {
        type: 'none'
      },
      // 限制 tooltip 在图表容器内,避免溢出
      confine: true,
      backgroundColor: 'rgba(15, 22, 32, 0.96)',
      borderColor: hexToRgba(color, 0.65),
      borderWidth: 1,
      padding: [8, 12],
      borderRadius: 8,
      extraCssText: `box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset; backdrop-filter: blur(6px);`,
      transitionDuration: 0.18,
      textStyle: { color: '#e8edf4', fontSize: 12 },
      // ★ 关键:用 chart.convertToPixel 把「当前鼠标最近的数据点的索引+值」
      //   换算成精确像素坐标,然后用 tooltip 中心精准对齐到该点。
      //   解决 'item' 触发时鼠标位置 ≠ 数据点位置导致错位 ~50px 的问题。
      position: function (_point: any, params: any, dom: HTMLDivElement | null, _rect: any, _size: any) {
        const p = Array.isArray(params) ? params[0] : params
        const seriesIndex = p?.seriesIndex ?? 0
        const dataIndex = p?.dataIndex ?? 0
        const value = p?.value
        const px: number[] = chart.convertToPixel(
          { seriesIndex },
          [dataIndex, value]
        ) as number[]
        const tooltipW = dom?.offsetWidth ?? 80
        const tooltipH = dom?.offsetHeight ?? 40
        // 水平居中对齐到点;垂直 tooltip 底边在点上方 14px(留出空白不遮挡点)
        return [Math.round(px[0] - tooltipW / 2), Math.round(px[1] - tooltipH - 14)]
      },
      // formatter:显示「x 轴月份 + 对应数据点值 + 单位 %」
      formatter: (params: any) => {
        const arr = Array.isArray(params) ? params : [params]
        const p = arr[0]
        return `<div style="font-size:11px;color:#9aa4b8;margin-bottom:3px;letter-spacing:0.5px;">${p.axisValue}</div>` +
               `<div style="font-size:14px;color:${color};font-weight:700;font-variant-numeric:tabular-nums;">${p.value}%</div>`
      }
    },
    series: [{
      type: 'line',
      data: data,
      smooth: 0.4,
      // 显示数据点 —— 加大的圆形点
      symbol: 'circle',
      symbolSize: 8,
      // 鼠标悬停时点放大并加白边高亮
      emphasis: {
        scale: true,
        scaleSize: 14,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: hexToRgba(color, 0.7)
        }
      },
      // 鼠标悬停时的反应区宽度:让 tooltip 更灵敏地命中点
      emphasisLineStyle: { width: 3 },
      lineStyle: { color: color, width: 2.5 },
      itemStyle: { color: color, borderColor: 'transparent' },
      areaStyle: { color: hexToRgba(color, 0.08) }
    }],
    animationDuration: 600
  })
  chartInstances.push(chart)
}

const destroyCharts = (): void => {
  chartInstances.forEach((c) => {
    try {
      c.dispose()
    } catch (_) {}
  })
  chartInstances.length = 0
}

// ============ 4 张核心卡片 ============
const prColorClass = computed(() => {
  const { card2ProdRatio: pr, card2Target: tg, card2Threshold: th } = coreMetrics
  if (pr <= tg) return 'val-green'
  if (pr <= th) return 'val-amber'
  return 'val-red'
})

const onDetailBtnClick = (cardId: ActiveDetailCard): void => {
  if (cardId === 'card3' || cardId === 'card4') return
  activeDetailCard.value = cardId
}

// ============ 明细卡片渲染 ============
const detailSectionLabel = computed(() => {
  return {
    card1: '▸ 送修资源总量明细',
    card2: '▸ 产保比管控明细',
    card3: '▸ 4S店送修台次占比明细',
    card4: '▸ 4S店定损金额占比明细'
  }[activeDetailCard.value]
})

const trendKeys = ['successRate', 'returnRate', 'publicResRate', 'thirdPartyPush', 'secondPushTrigger']
const trendColors = ['#5b9cf5', '#34d399', '#f59e0b', '#fb923c', '#a78bfa']

const prData = computed(() => storeTypeDetailData[storeType.value].card2)

const prDiff = computed(() => round(prData.value.prodRatio - prData.value.targetRatio, 2))

const prRatioColorClass = computed(() => {
  const { prodRatio: pr, targetRatio: tg, thresholdRatio: th } = prData.value
  if (pr <= tg) return 'val-green'
  if (pr <= th) return 'val-amber'
  return 'val-red'
})

const prDiffColorClass = computed(() => {
  const { prodRatio: pr, thresholdRatio: th } = prData.value
  if (prDiff.value <= 0) return 'val-green'
  if (pr <= th) return 'val-amber'
  return 'val-red'
})

const showTogglePanel = computed(() => activeDetailCard.value !== 'card3' && activeDetailCard.value !== 'card4')

// 渲染迷你折线图(响应 storeType + activeDetailCard)
const renderMiniCharts = async (): Promise<void> => {
  destroyCharts()
  await nextTick()
  if (activeDetailCard.value === 'card2') return
  const trends = storeTypeDetailData[storeType.value].card1
  trendKeys.forEach((k, i) => {
    const canvas = document.getElementById(`chart-${k}`) as HTMLCanvasElement | null
    if (canvas) createMiniChart(canvas, trends[k].trend, trendColors[i])
  })
}

watch([activeDetailCard, storeType], renderMiniCharts, { immediate: false })

onMounted(async () => {
  await nextTick()
  await renderMiniCharts()
  window.addEventListener('resize', resizeAllCharts)
})

onBeforeUnmount(() => {
  destroyCharts()
  window.removeEventListener('resize', resizeAllCharts)
})

const resizeAllCharts = (): void => {
  chartInstances.forEach((c) => {
    try {
      c.resize()
    } catch (_) {}
  })
}

// ============ 表格 ============
const tab1Title = computed(() => {
  return activeDetailCard.value === 'card2' ? '产保比管控明细' : '送修资源多指标明细'
})

const tab1Data = computed<RepairTableRowVO[] | PrTableRowVO[]>(() => {
  if (activeDetailCard.value === 'card2') return prTableData[dimensionFilter.value]
  return repairTableData[dimensionFilter.value]
})

const tab1Columns = computed(() => {
  if (activeDetailCard.value === 'card2') {
    return [
      { prop: 'name', label: dimensionFilter.value, width: 140, align: 'left' as const },
      { prop: 'claimAmount', label: '定损金额(万元)', width: 130 },
      { prop: 'premium', label: '签单保费(万元)', width: 130 },
      { prop: 'prodRatio', label: '产保比', width: 100 },
      { prop: 'targetRatio', label: '目标值', width: 100 },
      { prop: 'thresholdRatio', label: '阈值', width: 100 },
      { prop: 'partsDiscount', label: '零配件折率', width: 110 },
      { prop: 'laborDiscount', label: '工时折率', width: 110 },
      { prop: 'status', label: '预警状态', width: 110 }
    ]
  }
  return [
    { prop: 'name', label: dimensionFilter.value, width: 140, align: 'left' as const },
    { prop: 'successRate', label: '成功率(%)', width: 110 },
    { prop: 'firstPushRate', label: '标的首推成功率(%)', width: 150 },
    { prop: 'returnRate', label: '返修率(%)', width: 100 },
    { prop: 'publicRes', label: '公共资源(台次)', width: 130 },
    { prop: 'thirdPartyPush', label: '三者推送台次', width: 120 },
    { prop: 'secondPushRate', label: '整体二推触发率(%)', width: 160 }
  ]
})

const tab2Columns = [
  { prop: 'name', label: '分部', width: 140, align: 'left' as const },
  { prop: 'pushTotal', label: '推送总量(台次)', width: 130 },
  { prop: 'successRate', label: '成功率(%)', width: 110 },
  { prop: 'secondRate', label: '二推触发率(%)', width: 130 }
]

// 格式化产保比单元格颜色
const getPrCellClass = (row: PrTableRowVO): string => {
  if (row.prodRatio > row.targetRatio && row.prodRatio <= row.thresholdRatio) return 'val-amber'
  if (row.prodRatio > row.thresholdRatio) return 'val-red'
  return 'val-green'
}

const statusTextMap: Record<PrStatus, { text: string; cls: string }> = {
  normal:  { text: '正常', cls: 'dot-green' },
  warning: { text: '预警', cls: 'dot-amber' },
  danger:  { text: '高危', cls: 'dot-red'   }
}

const handleExport = (): void => {
  const filename = activeDetailCard.value === 'card2'
    ? `产保比管控明细_${dimensionFilter.value}.xlsx`
    : `送修资源多指标明细_${dimensionFilter.value}.xlsx`
  ElMessage.success(`✅ 导出成功!文件:${filename}`)
}

const handleExportTab2 = (): void => {
  ElMessage.success('✅ 导出成功!文件:查勘人员送修效能监控_分部.xlsx')
}

// 顶栏时间
const updateTime = new Date().toISOString().slice(0, 10) + ' 09:30'

const changeUpCls = (v: number): string => v >= 0 ? 'change-up' : 'change-down'
const changeArrow = (v: number): string => v >= 0 ? '▲' : '▼'
</script>

<template>
  <div class="dashboard">

    <!-- 第一层:顶部标题栏 -->
    <div class="header">
      <div class="header-left">
        <h1>送修资源管理看板</h1>
        <div class="subtitle">Repair Resource Management Dashboard</div>
      </div>
      <div class="header-right">
        <div class="header-meta">
          <span>数据更新</span>
          <span style="color: var(--text-secondary);">{{ updateTime }}</span>
          <span class="meta-dot"></span>
          <span style="color: var(--green);">实时</span>
        </div>
      </div>
    </div>

    <!-- 第二层:核心指标卡片 -->
    <div class="core-cards">
      <!-- 卡片1:送修成功率 -->
      <div
        class="core-card"
        :class="{ active: activeDetailCard === 'card1' }"
        data-card="card1"
        @click="onDetailBtnClick('card1')"
      >
        <div class="card-accent"></div>
        <div class="card-shine"></div>
        <div>
          <div class="card-label">送修资源总量统计</div>
          <div class="card-value unit-after">{{ coreMetrics.card1SuccessRate }}</div>
          <div class="card-sub">送修成功率</div>
        </div>
        <button class="detail-btn" @click.stop="onDetailBtnClick('card1')">明 细</button>
      </div>

      <!-- 卡片2:产保比 -->
      <div
        class="core-card"
        :class="{ active: activeDetailCard === 'card2' }"
        data-card="card2"
        @click="onDetailBtnClick('card2')"
      >
        <div class="card-accent"></div>
        <div class="card-shine"></div>
        <div>
          <div class="card-label">产保比管控</div>
          <div class="ratio-row">
            <div class="card-value" :class="prColorClass">{{ coreMetrics.card2ProdRatio }}</div>
            <div class="ratio-meta">
              <span>目标值：<strong>{{ coreMetrics.card2Target }}</strong></span>
              <span>预警阈值：<strong>{{ coreMetrics.card2Threshold }}</strong></span>
            </div>
          </div>
          <div class="card-sub">产保比</div>
        </div>
        <button class="detail-btn" @click.stop="onDetailBtnClick('card2')">明 细</button>
      </div>

      <!-- 卡片3:4S店台次占比(无点击) -->
      <div class="core-card no-click" data-card="card3">
        <div class="card-accent"></div>
        <div class="card-shine"></div>
        <div>
          <div class="card-label">4S店送修台次占比</div>
          <div class="card-value unit-after">{{ coreMetrics.card3ShareCount }}</div>
          <div class="card-sub">4S店送修台次占比</div>
        </div>
        <div class="changes">
          <span class="change-item">
            环比 <span :class="changeUpCls(coreMetrics.card3Mom)">{{ changeArrow(coreMetrics.card3Mom) }} {{ Math.abs(coreMetrics.card3Mom) }}%</span>
          </span>
          <span class="change-item">
            同比 <span :class="changeUpCls(coreMetrics.card3Yoy)">{{ changeArrow(coreMetrics.card3Yoy) }} {{ Math.abs(coreMetrics.card3Yoy) }}%</span>
          </span>
        </div>
      </div>

      <!-- 卡片4:4S店定损金额占比(无点击) -->
      <div class="core-card no-click" data-card="card4">
        <div class="card-accent"></div>
        <div class="card-shine"></div>
        <div>
          <div class="card-label">4S店定损金额占比</div>
          <div class="card-value unit-after">{{ coreMetrics.card4ShareAmount }}</div>
          <div class="card-sub">4S店定损金额占比</div>
        </div>
        <div class="changes">
          <span class="change-item">
            环比 <span :class="changeUpCls(coreMetrics.card4Mom)">{{ changeArrow(coreMetrics.card4Mom) }} {{ Math.abs(coreMetrics.card4Mom) }}%</span>
          </span>
          <span class="change-item">
            同比 <span :class="changeUpCls(coreMetrics.card4Yoy)">{{ changeArrow(coreMetrics.card4Yoy) }} {{ Math.abs(coreMetrics.card4Yoy) }}%</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 第三层:明细趋势卡片 -->
    <div class="detail-section">
      <div
        class="section-label"
        :class="{
          'accent-blue': activeDetailCard === 'card1',
          'accent-amber': activeDetailCard === 'card2'
        }"
      >{{ detailSectionLabel }}</div>
      <div class="detail-wrapper">
        <div class="detail-inner">
          <!-- card1/card3/card4: 5 列迷你折线图 -->
          <div
            v-if="activeDetailCard !== 'card2'"
            class="detail-cards-container cols-5"
          >
            <div
              v-for="(k, i) in trendKeys"
              :key="k"
              class="detail-card"
            >
              <div class="dc-name">{{ storeTypeDetailData[storeType].card1[k].metricName }}</div>
              <div class="dc-value">
                {{ storeTypeDetailData[storeType].card1[k].currentValue }}<span style="font-size: 12px; color: #5c6678;">%</span>
              </div>
              <div class="dc-chart-wrap">
                <canvas :id="`chart-${k}`"></canvas>
              </div>
            </div>
          </div>

          <!-- card2: 产保比主卡片 + 辅助卡片 -->
          <div v-else class="detail-cards-container cols-3">
            <div class="detail-card pr-main-card pr-card-primary">
              <div class="dc-name">实际产保比</div>
              <div class="pr-split">
                <div class="pr-left">
                  <div class="dc-value" :class="prRatioColorClass">{{ prData.prodRatio }}</div>
                  <div class="pr-diff" :class="prDiffColorClass">
                    目标差额:{{ prDiff >= 0 ? '+' : '' }}{{ prDiff }}<span class="pr-diff-label">(目标 {{ prData.targetRatio }})</span>
                  </div>
                </div>
                <div class="pr-divider"></div>
                <div class="pr-right">
                  <div class="pr-sub-item">
                    <span class="pr-sub-label">定损金额</span>
                    <span class="pr-sub-value">{{ prData.claimAmount.toLocaleString() }}<span class="pr-sub-unit">万元</span></span>
                  </div>
                  <div class="pr-sub-item">
                    <span class="pr-sub-label">签单保费</span>
                    <span class="pr-sub-value">{{ prData.premium.toLocaleString() }}<span class="pr-sub-unit">万元</span></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-card no-chart pr-card-secondary">
              <div class="dc-name">产保比目标值</div>
              <div class="dc-value">{{ prData.targetRatio }}</div>
            </div>
            <div class="detail-card no-chart pr-card-secondary">
              <div class="dc-name">产保比阈值</div>
              <div class="dc-value">{{ prData.thresholdRatio }}</div>
            </div>
          </div>
        </div>

        <!-- 扇形切换按钮 -->
        <div v-if="showTogglePanel" class="detail-toggle-panel">
          <button
            class="sector-btn"
            :class="{ active: storeType === '4s' }"
            @click="storeType = '4s'"
          >4S店</button>
          <button
            class="sector-btn"
            :class="{ active: storeType === 'repair' }"
            @click="storeType = 'repair'"
          >修理厂</button>
        </div>
      </div>
    </div>

    <!-- 第四层:多维数据分析 -->
    <div class="analysis-area">
      <div class="analysis-tabs">
        <div
          class="analysis-tab"
          :class="{ active: activeAnalysisTab === 'tab1' }"
          @click="activeAnalysisTab = 'tab1'"
        >机构 / 集团 / 品牌维度分析</div>
        <div
          class="analysis-tab"
          :class="{ active: activeAnalysisTab === 'tab2' }"
          @click="activeAnalysisTab = 'tab2'"
        >查勘人员效能分析</div>
      </div>

      <div class="analysis-content">
        <!-- tab1 -->
        <template v-if="activeAnalysisTab === 'tab1'">
          <div style="margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--text-primary);">{{ tab1Title }}</div>
          <div class="toolbar">
            <div class="toolbar-left">
              <label>分析维度:</label>
              <el-select v-model="dimensionFilter" size="small" style="width: 120px;">
                <el-option label="机构" value="机构" />
                <el-option label="品牌" value="品牌" />
                <el-option label="集团" value="集团" />
              </el-select>
            </div>
            <button class="export-btn" @click="handleExport">📥 导出Excel</button>
          </div>
          <el-table
                      :data="(tab1Data as RepairTableRowVO[] & PrTableRowVO[])"
                      :columns="undefined"
                      style="width: 100%; margin-top: 10px;"
                      size="small"
                      stripe
                      :show-overflow-tooltip="true"
                    >
            <template v-if="activeDetailCard === 'card2'">
                          <el-table-column prop="name" label="name" min-width="140" align="left" />
                          <el-table-column prop="claimAmount" label="定损金额(万元)" min-width="130" align="center" />
                          <el-table-column prop="premium" label="签单保费(万元)" min-width="130" align="center" />
                          <el-table-column label="产保比" min-width="100" align="center">
                            <template #default="{ row }">
                              <span :class="getPrCellClass(row as PrTableRowVO)">{{ (row as PrTableRowVO).prodRatio }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column prop="targetRatio" label="目标值" min-width="100" align="center" />
                          <el-table-column prop="thresholdRatio" label="阈值" min-width="100" align="center" />
                          <el-table-column prop="partsDiscount" label="零配件折率" min-width="110" align="center" />
                          <el-table-column prop="laborDiscount" label="工时折率" min-width="110" align="center" />
                          <el-table-column label="预警状态" min-width="110" align="center">
                            <template #default="{ row }">
                              <span class="status-cell">
                                <span :class="statusTextMap[(row as PrTableRowVO).status].cls"></span>
                                {{ statusTextMap[(row as PrTableRowVO).status].text }}
                              </span>
                            </template>
                          </el-table-column>
                        </template>
                        <template v-else>
                          <el-table-column prop="name" label="name" min-width="140" align="left" />
                          <el-table-column prop="successRate" label="成功率(%)" min-width="110" align="center" />
                          <el-table-column prop="firstPushRate" label="标的首推成功率(%)" min-width="150" align="center" />
                          <el-table-column prop="returnRate" label="返修率(%)" min-width="100" align="center" />
                          <el-table-column prop="publicRes" label="公共资源(台次)" min-width="130" align="center" />
                          <el-table-column prop="thirdPartyPush" label="三者推送台次" min-width="120" align="center" />
                          <el-table-column prop="secondPushRate" label="整体二推触发率(%)" min-width="160" align="center" />
                        </template>
          </el-table>
        </template>

        <!-- tab2 -->
        <template v-else>
          <div style="margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--text-primary);">查勘人员送修效能监控</div>
          <div class="toolbar">
            <div class="toolbar-left">
              <label>分析维度:</label>
              <el-select size="small" style="width: 120px;" :model-value="'分部'">
                <el-option label="分部" value="分部" />
              </el-select>
            </div>
            <button class="export-btn" @click="handleExportTab2">📥 导出Excel</button>
          </div>
          <el-table :data="personnelBranchData" style="width: 100%; margin-top: 10px;" size="small" stripe>
                      <el-table-column prop="name" label="分部" min-width="140" align="left" />
                      <el-table-column prop="pushTotal" label="推送总量(台次)" min-width="130" align="center" />
                      <el-table-column prop="successRate" label="成功率(%)" min-width="110" align="center" />
                      <el-table-column prop="secondRate" label="二推触发率(%)" min-width="130" align="center" />
                    </el-table>
        </template>
      </div>
    </div>

  </div>
</template>

<style>
/* 全局生效(不带 scoped):CSS 变量 + body 背景光晕 */
:root {
  --bg-deep: #080c12;
  --bg-root: #0b1018;
  --bg-elevated: #111720;
  --bg-surface: #151c26;
  --bg-card: #19202d;
  --bg-card-hover: #1d2535;
  --bg-input: #111720;
  --border-subtle: rgba(255,255,255,0.04);
  --border-default: rgba(255,255,255,0.10);
  --border-emphasis: rgba(255,255,255,0.14);
  --border-active: rgba(88,166,255,0.45);
  --text-primary: #e8edf4;
  --text-secondary: #9aa4b8;
  --text-muted: #5c6678;
  --text-bright: #f0f4fc;
  --accent: #5b9cf5;
  --accent-glow: rgba(91,156,245,0.20);
  --accent-soft: rgba(91,156,245,0.10);
  --green: #34d399;
  --green-soft: rgba(52,211,153,0.12);
  --amber: #f59e0b;
  --amber-soft: rgba(245,158,11,0.12);
  --red: #f87171;
  --red-soft: rgba(248,113,113,0.12);
  --purple: #a78bfa;
  --orange: #fb923c;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 24px;
  --transition: 0.22s cubic-bezier(0.25, 0.1, 0.25, 1);
}

body {
  background-color: #080c12;
  background-image:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(91,156,245,0.10) 0%, transparent 70%),
    radial-gradient(ellipse 60% 50% at 80% 90%, rgba(167,139,250,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 70% 60% at 10% 50%, rgba(52,211,153,0.04) 0%, transparent 70%);
  background-attachment: fixed;
}
</style>

<style lang="scss" scoped>

* { margin: 0; padding: 0; box-sizing: border-box; }

/* body 背景已移到非 scoped 的 <style> 块,这里不重复定义(否则 scoped 选择器优先级更高会覆盖全局) */

.dashboard {
  max-width: 1560px;
  margin: 0 auto;
  padding: 0 24px 40px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-emphasis);
  position: relative;
}
.header::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 85%, transparent 100%);
  pointer-events: none;
}
.header-left h1 { font-size: 20px; font-weight: 600; color: var(--text-bright); letter-spacing: 1px; }
.header-left .subtitle { font-size: 11px; color: var(--text-muted); letter-spacing: 0.5px; font-weight: 400; }
.header-right { display: flex; align-items: center; gap: 12px; }
.header-meta { display: flex; align-items: center; gap: 16px; font-size: 11px; color: var(--text-muted); }
.header-meta .meta-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: pulse-dot 2.5s ease-in-out infinite;
}
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

@keyframes breatheBlue {
  0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 10px rgba(91,156,245,0.12), 0 0 1px rgba(91,156,245,0.3); }
  50%     { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 22px rgba(91,156,245,0.26), 0 0 4px rgba(91,156,245,0.5); }
}
@keyframes breatheAmber {
  0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 10px rgba(245,158,11,0.12), 0 0 1px rgba(245,158,11,0.3); }
  50%     { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 22px rgba(245,158,11,0.26), 0 0 4px rgba(245,158,11,0.5); }
}
@keyframes breatheGreen {
  0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 10px rgba(52,211,153,0.12), 0 0 1px rgba(52,211,153,0.3); }
  50%     { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 22px rgba(52,211,153,0.26), 0 0 4px rgba(52,211,153,0.5); }
}
@keyframes breathePurple {
  0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 10px rgba(167,139,250,0.12), 0 0 1px rgba(167,139,250,0.3); }
  50%     { box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 0 22px rgba(167,139,250,0.26), 0 0 4px rgba(167,139,250,0.5); }
}

.core-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; padding: 16px 0; }

.core-card {
  background: linear-gradient(160deg, var(--bg-card) 0%, rgba(21,28,38,0.9) 100%);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 20px 22px 18px;
  position: relative;
  transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1),
              border-color var(--transition),
              background var(--transition),
              box-shadow var(--transition);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  overflow: hidden;
  min-height: 130px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);
}
.core-card::before {
  content: '';
  position: absolute;
  bottom: -40px; right: -40px;
  width: 180px; height: 180px;
  border-radius: 50%;
  transition: all 0.5s ease;
  pointer-events: none;
}
.core-card:nth-child(1)::before { background: radial-gradient(circle, rgba(91,156,245,0.07) 0%, transparent 70%); }
.core-card:nth-child(2)::before { background: radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%); }
.core-card:nth-child(3)::before { background: radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%); }
.core-card:nth-child(4)::before { background: radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%); }
.core-card::after {
  content: '';
  position: absolute;
  top: 0; left: 20px; right: 20px;
  height: 4px;
  border-radius: 0 0 4px 4px;
  transition: all 0.4s ease;
  z-index: 5;       /* 浮在 background 之上,确保彩色条可见 */
  pointer-events: none;
}
.core-card:nth-child(1)::after { background: linear-gradient(90deg, var(--accent), #7cb8ff, var(--accent)); }
.core-card:nth-child(2)::after { background: linear-gradient(90deg, var(--amber), #fcd34d, var(--amber)); }
.core-card:nth-child(3)::after { background: linear-gradient(90deg, var(--green), #6ee7b7, var(--green)); }
.core-card:nth-child(4)::after { background: linear-gradient(90deg, var(--purple), #c4b5fd, var(--purple)); }

.core-card:nth-child(1) { animation: breatheBlue 3.2s ease-in-out infinite; }
.core-card:nth-child(2) { animation: breatheAmber 3.6s ease-in-out infinite; }
.core-card:nth-child(3) { animation: breatheGreen 3.4s ease-in-out infinite; }
.core-card:nth-child(4) { animation: breathePurple 3.8s ease-in-out infinite; }

.core-card .card-shine {
  position: absolute; top: 0; left: -120%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  transform: skewX(-20deg);
  transition: left 0.7s ease;
  pointer-events: none;
  z-index: 1;
}
.core-card:hover .card-shine { left: 120%; }
.core-card:hover {
  transform: translateY(-5px);
  border-color: var(--border-emphasis);
  background: linear-gradient(160deg, var(--bg-card-hover) 0%, rgba(25,32,45,0.95) 100%);
  animation: none;
}
.core-card:nth-child(1):hover { box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 32px rgba(91,156,245,0.32), 0 0 2px rgba(91,156,245,0.6); }
.core-card:nth-child(2):hover { box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 32px rgba(245,158,11,0.32), 0 0 2px rgba(245,158,11,0.6); }
.core-card:nth-child(3):hover { box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 32px rgba(52,211,153,0.32), 0 0 2px rgba(52,211,153,0.6); }
.core-card:nth-child(4):hover { box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 32px rgba(167,139,250,0.32), 0 0 2px rgba(167,139,250,0.6); }

.core-card.active {
  transform: translateY(-3px);
  border-color: var(--border-active);
  background: linear-gradient(160deg, var(--bg-card-hover) 0%, rgba(21,28,40,0.95) 100%);
  animation: none;
}
.core-card:nth-child(1).active { box-shadow: 0 0 0 1.5px rgba(91,156,245,0.3), 0 14px 40px rgba(0,0,0,0.55), 0 0 44px rgba(91,156,245,0.34), inset 0 0 56px rgba(91,156,245,0.08); }
.core-card:nth-child(2).active { box-shadow: 0 0 0 1.5px rgba(245,158,11,0.3), 0 14px 40px rgba(0,0,0,0.55), 0 0 44px rgba(245,158,11,0.34), inset 0 0 56px rgba(245,158,11,0.08); }
.core-card.active::before { opacity: 1; }
.core-card.active::after { left: 8px; right: 8px; height: 5px; }

.core-card .card-accent {
  position: absolute; left: 0; top: 20px; bottom: 20px;
  width: 4px; border-radius: 0 4px 4px 0;
  transition: all 0.4s ease; z-index: 2;
}
.core-card:nth-child(1) .card-accent { background: var(--accent); opacity: 0.6; }
.core-card:nth-child(2) .card-accent { background: var(--amber); opacity: 0.6; }
.core-card:nth-child(3) .card-accent { background: var(--green); opacity: 0.6; }
.core-card:nth-child(4) .card-accent { background: var(--purple); opacity: 0.6; }
.core-card:hover .card-accent { opacity: 0.9; box-shadow: 0 0 14px currentColor; }
.core-card.active .card-accent { opacity: 1; box-shadow: 0 0 18px currentColor; }

.core-card.no-click { cursor: default; }
.core-card.no-click:hover {
  transform: none;
  border-color: var(--border-default);
  background: linear-gradient(160deg, var(--bg-card) 0%, rgba(21,28,38,0.9) 100%);
  animation: none;
}
.core-card:nth-child(1).no-click:hover { animation: breatheBlue 3.2s ease-in-out infinite; }
.core-card:nth-child(2).no-click:hover { animation: breatheAmber 3.6s ease-in-out infinite; }
.core-card:nth-child(3).no-click:hover { animation: breatheGreen 3.4s ease-in-out infinite; }
.core-card:nth-child(4).no-click:hover { animation: breathePurple 3.8s ease-in-out infinite; }
.core-card.no-click:hover .card-accent { opacity: 0.6; box-shadow: none; }
.core-card.no-click.active { transform: none; border-color: var(--border-default); background: linear-gradient(160deg, var(--bg-card) 0%, rgba(21,28,38,0.9) 100%); box-shadow: none; }
.core-card.no-click.active::after { left: 20px; right: 20px; height: 4px; }
.core-card.no-click.active .card-accent { box-shadow: 0 0 10px currentColor; }

.core-card .card-label {
  font-size: 11.5px; color: var(--text-muted); margin-bottom: 6px;
  font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  padding-left: 10px; position: relative; z-index: 2;
}
.core-card .card-value {
  font-size: 38px; font-weight: 700; color: var(--text-bright);
  line-height: 1.1; font-variant-numeric: tabular-nums;
  padding-left: 10px; letter-spacing: -1px;
  position: relative; z-index: 2;
}
.core-card .card-value.unit-after::after {
  content: "%"; font-size: 16px; font-weight: 500;
  margin-left: 2px; color: var(--text-secondary);
}
.core-card .card-sub { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; padding-left: 8px; }
.core-card .ratio-row { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; padding-left: 8px; }
.core-card .ratio-meta { display: flex; flex-direction: column; gap: 1px; font-size: 10.5px; color: var(--text-secondary); }
.core-card .ratio-meta span strong { color: var(--text-primary); font-weight: 600; }
.core-card .changes { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px; padding-left: 8px; }
.core-card .changes .change-item { font-size: 11px; display: flex; align-items: center; gap: 3px; }
.change-up { color: var(--green) !important; font-weight: 600; }
.change-down { color: var(--red) !important; font-weight: 600; }
.change-neutral { color: var(--text-muted); }

.detail-btn {
  position: absolute; bottom: 12px; right: 14px;
  background: rgba(255,255,255,0.03); border: 1px solid var(--border-default);
  color: var(--text-muted); padding: 4px 14px;
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 11px; font-weight: 500;
  transition: all var(--transition);
  letter-spacing: 0.5px; backdrop-filter: blur(4px);
}
.detail-btn:hover {
  background: var(--accent); border-color: var(--accent);
  color: #fff; box-shadow: 0 2px 10px var(--accent-glow);
}
.core-card.active .detail-btn { background: var(--accent); border-color: var(--accent); color: #fff; }

.val-green { color: var(--green) !important; }
.val-amber { color: var(--amber) !important; }
.val-red { color: var(--red) !important; }
.dot-green { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--green); margin-right: 6px; box-shadow: 0 0 5px var(--green); }
.dot-amber { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--amber); margin-right: 6px; box-shadow: 0 0 5px var(--amber); }
.dot-red { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--red); margin-right: 6px; box-shadow: 0 0 5px var(--red); }

.detail-section { padding-bottom: 12px; }
.detail-section .section-label {
  font-size: 10.5px; color: var(--text-muted); margin-bottom: 8px;
  letter-spacing: 1px; text-transform: uppercase;
  font-weight: 500; display: flex; align-items: center; gap: 6px;
}
.section-label::before {
  content: ''; display: inline-block;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.section-label.accent-blue::before { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.section-label.accent-amber::before { background: var(--amber); box-shadow: 0 0 6px var(--amber); }

.detail-wrapper {
  display: flex; border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); overflow: hidden;
  background: var(--bg-elevated);
  transition: border-color var(--transition), box-shadow var(--transition);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02);
}
.detail-wrapper:hover {
  border-color: var(--border-emphasis);
  box-shadow: 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03);
}
.detail-inner { flex: 1; padding: 10px 8px 10px 10px; min-width: 0; }
.detail-cards-container { display: grid; gap: 10px; height: 160px; }
.detail-cards-container.cols-5 { grid-template-columns: repeat(5, 1fr); }
.detail-cards-container.cols-3 { grid-template-columns: repeat(3, 1fr); height: auto; min-height: 220px; }

.detail-toggle-panel {
  display: flex; flex-direction: column; width: 52px; flex-shrink: 0;
  border-left: 1px solid var(--border-emphasis);
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(21,28,38,0.95) 100%);
}
.sector-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 12px; font-weight: 600;
  color: var(--text-muted); background: transparent; border: none;
  transition: all var(--transition);
  writing-mode: vertical-rl; letter-spacing: 3px;
  position: relative; user-select: none; padding: 6px 0;
}
.sector-btn:first-child { border-radius: 0 16px 0 0; margin: 2px 2px 1px 0; }
.sector-btn:last-child { border-radius: 0 0 16px 0; margin: 1px 2px 2px 0; }
.sector-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.03); }
.sector-btn.active { color: #fff; background: var(--accent); box-shadow: 0 0 12px var(--accent-glow); }
.sector-btn.active:first-child { border-radius: 0 14px 0 0; }
.sector-btn.active:last-child { border-radius: 0 0 14px 0; }
.sector-btn:first-child::after {
  content: ''; position: absolute; bottom: 0; left: 8px; right: 8px;
  height: 1px; background: var(--border-subtle);
}
.sector-btn.active:first-child::after, .sector-btn.active:last-child::after { background: transparent; }

.detail-card {
  background: var(--bg-surface); border: 1px solid var(--border-default);
  border-radius: var(--radius-sm); padding: 10px 10px 6px;
  display: flex; flex-direction: column; height: 100%; overflow: hidden;
  transition: all var(--transition); position: relative;
  min-width: 0;
}
.detail-card::after {
  content: ''; position: absolute;
  left: 0; top: 10px; bottom: 10px;
  width: 2px; border-radius: 0 2px 2px 0;
  background: transparent; transition: all var(--transition); pointer-events: none;
}
.detail-card:hover {
  border-color: var(--border-emphasis); background: var(--bg-card);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.detail-card:hover::after { background: var(--accent); opacity: 0.7; box-shadow: 0 0 6px var(--accent-glow); }
.detail-card .dc-name {
  font-size: 10.5px; color: var(--text-muted); margin-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500; letter-spacing: 0.3px;
}
.detail-card .dc-value {
  font-size: 20px; font-weight: 600; color: var(--text-bright);
  line-height: 1.1; margin-bottom: 2px; font-variant-numeric: tabular-nums;
}
.detail-card .dc-chart-wrap { flex: 1; min-height: 0; position: relative; }
.detail-card .dc-chart-wrap canvas { width: 100% !important; height: 100% !important; }
.detail-card.no-chart { justify-content: center; align-items: center; text-align: center; }
.detail-card.no-chart .dc-value { font-size: 30px; margin-bottom: 0; }
/* 产保比辅助卡片:顶部对齐,不被 no-chart 居中规则影响 */
.detail-card.pr-card-secondary.no-chart {
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 12px;
}
.detail-card.pr-card-secondary.no-chart .dc-name {
  padding-top: 0;
  border-bottom: none;
  padding-bottom: 4px;
  width: 100%;
}
.detail-card.pr-card-secondary.no-chart .dc-value {
  font-size: 28px;
  width: 100%;
}

.detail-card.pr-card-primary {
  border: 1px solid rgba(245,158,11,0.18);
  background: linear-gradient(160deg, rgba(25,32,45,1) 0%, rgba(21,28,38,1) 100%);
  box-shadow: 0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(245,158,11,0.06);
  border-radius: var(--radius-md); z-index: 2;
}
.detail-card.pr-card-primary:hover {
  border-color: rgba(245,158,11,0.3);
  box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(245,158,11,0.12);
}
.detail-card.pr-card-primary::after {
  content: ''; position: absolute;
  top: 0; left: 12px; right: 12px; height: 3px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(90deg, var(--amber), #fcd34d, var(--amber));
  opacity: 0.85; pointer-events: none;
}
.detail-card.pr-card-primary:hover::after { opacity: 1; left: 6px; right: 6px; box-shadow: 0 0 8px rgba(245,158,11,0.35); }

.detail-card.pr-card-secondary {
  border: 1px solid var(--border-default);
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(21,28,36,1) 100%);
  box-shadow: 0 1px 4px rgba(0,0,0,0.15); border-radius: var(--radius-md);
}
.detail-card.pr-card-secondary:hover {
  border-color: var(--border-emphasis);
  background: linear-gradient(180deg, var(--bg-card) 0%, rgba(25,32,42,1) 100%);
  box-shadow: 0 3px 10px rgba(0,0,0,0.25);
}
.detail-card.pr-card-secondary .dc-name {
  font-size: 10.5px; color: var(--text-muted); font-weight: 500;
  letter-spacing: 0.5px; margin-bottom: 6px;
  padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);
}
.detail-card.pr-card-secondary .dc-value { font-size: 30px; font-weight: 700; color: var(--text-bright); }

.detail-card.pr-main-card { flex-direction: column; justify-content: flex-start; align-items: stretch; text-align: left; padding: 0; gap: 0; }
.detail-card.pr-main-card .dc-name {
  margin: 0; padding: 8px 12px 6px;
  font-size: 11px; font-weight: 600;
  color: var(--text-secondary); letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-subtle);
}
.pr-split { display: flex; flex: 1; align-items: stretch; min-height: 0; }
.pr-left {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 8px 10px;
  background: radial-gradient(ellipse 70% 80% at 50% 50%, rgba(91,156,245,0.04) 0%, transparent 100%);
}
.pr-left .dc-value { font-size: 36px; font-weight: 700; line-height: 1; margin-bottom: 6px; }
.pr-left .pr-diff { font-size: 10.5px; font-weight: 500; white-space: nowrap; }
.pr-left .pr-diff-label { font-weight: 400; color: var(--text-muted); }
.pr-divider {
  width: 1px; align-self: stretch;
  margin: 10px 6px;
  background: var(--border-emphasis);
  box-shadow: 0 0 4px rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.pr-right {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  padding: 6px 8px; background: rgba(0,0,0,0.08);
}
.pr-right .pr-sub-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: rgba(255,255,255,0.015);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 5px 10px; width: 100%;
}
.pr-right .pr-sub-label {
  font-size: 9px; color: var(--text-muted);
  letter-spacing: 0.5px; text-transform: uppercase;
}
.pr-right .pr-sub-value {
  font-size: 15px; font-weight: 600;
  color: var(--text-secondary); line-height: 1.2;
}
.pr-right .pr-sub-unit { font-size: 9px; color: var(--text-muted); font-weight: 400; margin-left: 1px; }

.analysis-area {
  display: flex; flex-direction: column;
  min-height: 380px; padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}
.analysis-tabs { display: flex; justify-content: center; gap: 10px; padding: 0 0 12px 0; width: 100%; }
.analysis-tab {
  padding: 9px 26px; cursor: pointer;
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary); background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-pill);
  transition: all var(--transition);
  user-select: none; letter-spacing: 0.5px; white-space: nowrap;
  position: relative;
}
.analysis-tab:hover {
  color: var(--text-primary); border-color: var(--border-emphasis);
  background: var(--bg-card-hover); box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}
.analysis-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #3b7ddd 0%, #2d63b0 100%);
  border-color: transparent;
  box-shadow: 0 2px 14px rgba(59,125,221,0.35), 0 0 20px rgba(59,125,221,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
}
.analysis-content {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-top: 2px solid var(--border-emphasis);
  border-radius: var(--radius-md);
  padding: 14px 16px; height: 440px;
  display: flex; flex-direction: column;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar label { font-size: 11.5px; color: var(--text-secondary); white-space: nowrap; font-weight: 500; }
.export-btn {
  background: transparent; border: 1px solid var(--border-default);
  color: var(--text-secondary); padding: 6px 16px;
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 11.5px; font-weight: 500;
  transition: all var(--transition);
  white-space: nowrap; letter-spacing: 0.3px;
}
.export-btn:hover {
  background: var(--accent); border-color: var(--accent);
  color: #fff; box-shadow: 0 2px 10px var(--accent-glow);
}
.status-cell { display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }

@media (max-width: 1200px) {
  .core-cards { grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px 0; }
  .core-card { padding: 14px 16px 12px; }
  .detail-cards-container.cols-5 { grid-template-columns: repeat(3, 1fr); height: auto; }
}
@media (max-width: 768px) {
  .core-cards { grid-template-columns: 1fr; gap: 10px; padding: 10px 0; }
  .core-card { padding: 12px 14px 10px; }
  .core-card:hover { transform: translateY(-1px); }
  .detail-cards-container.cols-5 { grid-template-columns: 1fr; height: auto; }
  .detail-cards-container.cols-3 { grid-template-columns: 1fr; height: auto; }
  .dashboard { padding: 0 10px; }
  .header h1 { font-size: 18px; }
  .analysis-tabs { flex-wrap: wrap; }
  .pr-split { flex-direction: column; gap: 4px; }
  .pr-divider { width: auto; height: 1px; margin: 2px 10px; background: var(--border-emphasis); box-shadow: none; }
  .pr-left, .pr-right { flex: auto; padding: 6px 8px; }
  .pr-right .pr-sub-item { padding: 4px 8px; }
}
</style>
