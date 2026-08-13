<script setup lang="ts">
/**
 * 送修资源管理看板
 *
 * 数据流:
 *  - onMounted → fetchAll() 并行调用 RepairCockpit.* 6 个占位方法
 *  - 当前阶段方法体只 console.info + 返回空,见 console 留痕
 *  - 接口返回空时,fallback 到 MOCK_* 常量(页面有数据可看)
 *  - 等后端 /api/repair/* 就绪后,把 fetchAll 里的 if (!isEmpty(x)) 改为直接赋值即可
 *
 * 表格列定义 + Excel 导出列定义 共用 tab1ColumnDefs / tab2ColumnDefs(单一来源)
 */
import { ref, computed, watch, onBeforeUnmount, nextTick, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { ElNotification } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import ArtTable from '@/components/core/tables/art-table/index.vue'
import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
import type { ColumnOption } from '@/types/component'
import { RepairCockpit } from '../api'
import type {
  StoreType,
  DimensionType,
  PrStatus,
  PersonnelDim,
  ActiveDetailCard,
  RepairCoreMetricsVO,
  RepairTrendVO,
  RepairTableRowVO,
  PrTableRowVO,
  PersonnelRowVO,
  ColumnOptionExt
} from '../api/types'

// Chart.js 通过 index.html 的 CDN <script> 全局加载,挂载 window.Chart。这里声明全局类型。
declare global {
  interface Window {
    Chart: any
  }
}

defineOptions({ name: 'RepairManagement' })

// ===== 占位 Mock(等后端 API 就绪后可删除或迁入 tests) =====
const MONTHS = ['2月', '3月', '4月', '5月', '6月', '7月']

const MOCK_CORE: RepairCoreMetricsVO = {
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

const MOCK_TREND: RepairTrendVO = {
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

const MOCK_ORG_DIM: Record<DimensionType, RepairTableRowVO[]> = {
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
    { name: '蔚来',   firstPushSuccess: 856,  firstPushTotal: 1089, successRate: 78.6, firstPushRate: 73.8, returnRate: 3.4, publicRes: 580, thirdPartyPush: 240, secondPushRate: 35.4 },
    { name: '小鹏',   firstPushSuccess: 945,  firstPushTotal: 1234, successRate: 76.6, firstPushRate: 72.1, returnRate: 3.8, publicRes: 640, thirdPartyPush: 280, secondPushRate: 34.2 },
    { name: '理想',   firstPushSuccess: 1123, firstPushTotal: 1456, successRate: 77.1, firstPushRate: 72.8, returnRate: 3.5, publicRes: 760, thirdPartyPush: 310, secondPushRate: 34.8 }
  ],
  '集团': [
    { name: '人保集团-华东', firstPushSuccess: 2450, firstPushTotal: 3012, successRate: 81.3, firstPushRate: 76.8, returnRate: 2.7, publicRes: 1620, thirdPartyPush: 720, secondPushRate: 38.9 },
    { name: '人保集团-华南', firstPushSuccess: 2135, firstPushTotal: 2720, successRate: 78.5, firstPushRate: 74.2, returnRate: 3.2, publicRes: 1420, thirdPartyPush: 580, secondPushRate: 36.4 },
    { name: '人保集团-华北', firstPushSuccess: 1987, firstPushTotal: 2543, successRate: 78.1, firstPushRate: 73.5, returnRate: 3.4, publicRes: 1320, thirdPartyPush: 540, secondPushRate: 35.7 },
    { name: '人保集团-西南', firstPushSuccess: 1456, firstPushTotal: 1987, successRate: 73.3, firstPushRate: 69.2, returnRate: 4.6, publicRes: 980,  thirdPartyPush: 380, secondPushRate: 31.5 }
  ]
}

const MOCK_ORG_PR: Record<DimensionType, PrTableRowVO[]> = {
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
    { name: '蔚来',   claimAmount: 1450, premium: 1620, prodRatio: 0.90, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.89, laborDiscount: 0.84, status: 'warning' }
  ],
  '集团': [
    { name: '人保集团-华东', claimAmount: 3450, premium: 3960, prodRatio: 0.87, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.87, laborDiscount: 0.81, status: 'warning' },
    { name: '人保集团-华南', claimAmount: 3120, premium: 3680, prodRatio: 0.85, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.85, laborDiscount: 0.79, status: 'normal' },
    { name: '人保集团-华北', claimAmount: 2890, premium: 3240, prodRatio: 0.89, targetRatio: 0.85, thresholdRatio: 0.90, partsDiscount: 0.88, laborDiscount: 0.83, status: 'warning' }
  ]
}

const MOCK_TEAM: Record<PersonnelDim, PersonnelRowVO[]> = {
  '分部': [
    { name: '华东分部', pushTotal: 2840, firstPushSuccess: 1200, firstPushTotal: 1600, successRate: 76.2, secondRate: 32.1 },
    { name: '华南分部', pushTotal: 2150, firstPushSuccess: 1000, firstPushTotal: 1300, successRate: 74.8, secondRate: 30.5 },
    { name: '华北分部', pushTotal: 1980, firstPushSuccess: 900,  firstPushTotal: 1200, successRate: 77.5, secondRate: 34.8 },
    { name: '西南分部', pushTotal: 1620, firstPushSuccess: 700,  firstPushTotal: 950,  successRate: 72.3, secondRate: 28.9 },
    { name: '华中分部', pushTotal: 1750, firstPushSuccess: 800,  firstPushTotal: 1050, successRate: 75.1, secondRate: 31.6 },
    { name: '东北分部', pushTotal: 1320, firstPushSuccess: 550,  firstPushTotal: 800,  successRate: 70.8, secondRate: 27.4 }
  ],
  '小组': [
    { name: '华东一组', pushTotal: 1240, firstPushSuccess: 580, firstPushTotal: 720, successRate: 80.5, secondRate: 35.2 },
    { name: '华东二组', pushTotal: 980,  firstPushSuccess: 420, firstPushTotal: 580, successRate: 72.4, secondRate: 28.9 }
  ],
  '个人': [
    { name: '张三', pushTotal: 320, firstPushSuccess: 180, firstPushTotal: 210, successRate: 85.7, secondRate: 38.5 },
    { name: '李四', pushTotal: 280, firstPushSuccess: 145, firstPushTotal: 190, successRate: 76.3, secondRate: 30.2 }
  ]
}

// ===== 工具函数 =====
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

// 简单 HTML 转义,防 XSS(数据来源是后端 mock,但保守起见)
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;' : '&#39;'
  )

// ===== 自定义 sparkline tooltip(HTML 浮层;Chart.js canvas tooltip 受 canvas 宽度约束,改不动) =====
// 单例 DOM 节点,在 5 个 sparkline 间共享,通过 CSS 变量 `--spark-color` 切换颜色
let sparkTooltipEl: HTMLDivElement | null = null

const ensureSparkTooltipEl = (): HTMLDivElement => {
  if (!sparkTooltipEl) {
    sparkTooltipEl = document.createElement('div')
    sparkTooltipEl.className = 'sparkline-tooltip'
    sparkTooltipEl.style.opacity = '0'
    document.body.appendChild(sparkTooltipEl)
  }
  return sparkTooltipEl
}

const hideSparkTooltip = (): void => {
  if (sparkTooltipEl) sparkTooltipEl.style.opacity = '0'
}

const showSparkTooltip = (title: string, bodyLine: string, color: string, caretX: number, caretY: number, chart: any): void => {
  const el = ensureSparkTooltipEl()
  el.style.setProperty('--spark-color', color)
  el.innerHTML =
    `<div class="t-title">${escapeHtml(title)}</div>` +
    `<div class="t-body">${escapeHtml(bodyLine)}</div>`
  // 用 canvas 的 getBoundingClientRect 把 caret 坐标换成 page 坐标;浮层定位在点正上方 10px
  const rect = chart.canvas.getBoundingClientRect()
  const x = window.scrollX + rect.left + caretX
  const y = window.scrollY + rect.top + caretY
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 10px))`
  el.style.opacity = '1'
}

// 判断 API 返回是否"占位空"(用于决定是否 fallback 到 MOCK_*)
const isEmpty = (v: unknown): boolean =>
  v == null ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) ||
  (Array.isArray(v) && v.length === 0)

// ===== 全局状态 =====
const activeDetailCard = ref<ActiveDetailCard>('card1')
const activeAnalysisTab = ref<'tab1' | 'tab2'>('tab1')
const storeType = ref<StoreType>('4s')
const dimensionFilter = ref<DimensionType>('机构')
const personnelDim = ref<PersonnelDim>('分部')
const loading = ref(false)

const coreMetrics = ref<RepairCoreMetricsVO>(MOCK_CORE)
const storeTypeDetailData = ref<RepairTrendVO>(MOCK_TREND)
const orgDimData = ref<Record<DimensionType, RepairTableRowVO[]>>(MOCK_ORG_DIM)
const orgPrData = ref<Record<DimensionType, PrTableRowVO[]>>(MOCK_ORG_PR)
const teamData = ref<Record<PersonnelDim, PersonnelRowVO[]>>(MOCK_TEAM)

// ===== 一次性拉取(占位阶段 fallback,接 API 后改为直接赋值) =====
const fetchAll = async (): Promise<void> => {
  loading.value = true
  try {
    const [kpi, trend, pr, orgDim, orgPr, team] = await Promise.all([
      RepairCockpit.getKpi(),
      RepairCockpit.getTrend({ storeType: storeType.value }),
      RepairCockpit.getPrRatio({ storeType: storeType.value }),
      RepairCockpit.getOrgDim({ dimension: dimensionFilter.value }),
      RepairCockpit.getOrgPrDim({ dimension: dimensionFilter.value }),
      RepairCockpit.getTeamDim({ dimension: personnelDim.value })
    ])
    // 占位阶段:接口返回空时保留 mock。等真实接口实现,把这些 if 改为直接赋值
    if (!isEmpty(kpi)) coreMetrics.value = { ...MOCK_CORE, ...kpi } as RepairCoreMetricsVO
    if (!isEmpty(trend)) storeTypeDetailData.value = { ...MOCK_TREND, ...trend } as RepairTrendVO
    if (!isEmpty(pr)) {/* 单条 PR detail,占位阶段保留 mock */}
    if (!isEmpty(orgDim)) orgDimData.value = { ...MOCK_ORG_DIM, ...orgDim } as Record<DimensionType, RepairTableRowVO[]>
    if (!isEmpty(orgPr)) orgPrData.value = { ...MOCK_ORG_PR, ...orgPr } as Record<DimensionType, PrTableRowVO[]>
    if (!isEmpty(team)) teamData.value = { ...MOCK_TEAM, ...team } as Record<PersonnelDim, PersonnelRowVO[]>
  } catch (e) {
    console.error('[repair_management] fetchAll failed', e)
    ElNotification({ title: '错误', message: '数据加载失败,使用本地占位数据', type: 'error' })
  } finally {
    loading.value = false
  }
}

// ===== Chart.js(UMD 全局)实例管理 =====
const chartInstances: any[] = []

const createMiniChart = (
  canvas: HTMLCanvasElement | null,
  data: number[],
  color: string
): void => {
  if (!canvas) return
  if (!window.Chart) {
    console.warn('[repair_management] window.Chart 未加载(CDN 失败?),跳过 sparkline 渲染')
    return
  }
  const chart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.08),
        borderWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: 'transparent',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context: any) => {
            const t = context.tooltip
            if (!t || t.opacity === 0) {
              hideSparkTooltip()
              return
            }
            const title = (t.title && t.title[0]) || ''
            const bodyLine = (t.body && t.body[0] && t.body[0].lines && t.body[0].lines[0]) || ''
            showSparkTooltip(title, bodyLine, color, t.caretX, t.caretY, context.chart)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5c6678', display: false },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
          border: { display: false },
          beginAtZero: false
        }
      },
      elements: {
        line: { tension: 0.4, borderWidth: 1.5 },
        point: { radius: 2.5, hitRadius: 12 }
      }
    }
  })
  chartInstances.push(chart)
}

const destroyCharts = (): void => {
  chartInstances.forEach((c) => {
    try { c.destroy?.() } catch (_) {}
  })
  chartInstances.length = 0
}

// 4 张核心卡 PR 颜色
const prColorClass = computed(() => {
  const c = coreMetrics.value
  if (c.card2ProdRatio <= c.card2Target) return 'val-green'
  if (c.card2ProdRatio <= c.card2Threshold) return 'val-amber'
  return 'val-red'
})

const onDetailBtnClick = (cardId: ActiveDetailCard): void => {
  if (cardId === 'card3' || cardId === 'card4') return
  activeDetailCard.value = cardId
}

const SECTION_LABELS: Record<ActiveDetailCard, string> = {
  card1: '▸ 送修资源总量明细',
  card2: '▸ 产保比管控明细',
  card3: '▸ 4S店送修台次占比明细',
  card4: '▸ 4S店定损金额占比明细'
}
const detailSectionLabel = computed(() => SECTION_LABELS[activeDetailCard.value])

const trendKeys = ['successRate', 'returnRate', 'publicResRate', 'thirdPartyPush', 'secondPushTrigger']
const trendColors = ['#5b9cf5', '#34d399', '#f59e0b', '#fb923c', '#a78bfa']

const prData = computed(() => storeTypeDetailData.value[storeType.value].card2)
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

const showTogglePanel = computed(() =>
  activeDetailCard.value !== 'card3' && activeDetailCard.value !== 'card4'
)

const renderMiniCharts = async (): Promise<void> => {
  destroyCharts()
  await nextTick()
  if (activeDetailCard.value === 'card2') return
  const trends = storeTypeDetailData.value[storeType.value].card1
  trendKeys.forEach((k, i) => {
    const canvas = document.getElementById(`chart-${k}`) as HTMLCanvasElement | null
    if (canvas) createMiniChart(canvas, trends[k].trend, trendColors[i])
  })
}

watch([activeDetailCard, storeType], renderMiniCharts, { immediate: false })

onMounted(async () => {
  await fetchAll()
  await nextTick()
  // Chart.js 内置 ResizeObserver 自动响应窗口变化,无需手动 resize listener
  await renderMiniCharts()
})

onBeforeUnmount(() => {
  destroyCharts()
  // 移除自定义 sparkline tooltip DOM 节点
  if (sparkTooltipEl) {
    sparkTooltipEl.remove()
    sparkTooltipEl = null
  }
})

// ===== 表格列定义(单一来源 → 驱动 el-table + XLSX 导出) =====
const tab1Title = computed(() =>
  activeDetailCard.value === 'card2' ? '产保比管控明细' : '送修资源多指标明细'
)

// 表格数据(根据当前激活的卡片 / 维度取)
const tab1Data = computed<RepairTableRowVO[] | PrTableRowVO[]>(() => {
  if (activeDetailCard.value === 'card2') return orgPrData.value[dimensionFilter.value]
  return orgDimData.value[dimensionFilter.value]
})

const tab2Data = computed<PersonnelRowVO[]>(() => teamData.value[personnelDim.value])

// tab1 列定义 — ArtTable + 列筛选 + XLSX 导出 三处共用。
// `visible: false` 表示列筛选 popover 默认未勾选(隐藏);ArtTableHeader v-model:columns 会原地 mutate visible。
// activeDetailCard / dimensionFilter 切换时,watch 重算 → 列集刷新(用户列筛选状态会重置)。
type ColumnOptWExt = ColumnOption & ColumnOptionExt

// 工厂:返回给定 card 类型对应的"初始默认列",name 列 label 由 caller 注入
const makeCard1Columns = (nameLabel: string): ColumnOptWExt[] => [
  { prop: 'name', label: nameLabel, width: 140, visible: true },
  { prop: 'successRate', label: '成功率(%)', width: 110, visible: true,
    export: (row: RepairTableRowVO) => row.successRate.toFixed(1) },
  { prop: 'secondPushRate', label: '整体二推触发率(%)', width: 160, visible: true,
    export: (row: RepairTableRowVO) => row.secondPushRate.toFixed(1) },
  { prop: 'firstPushSuccess', label: '首推成功台次', width: 130, visible: false },
  { prop: 'firstPushTotal', label: '首推台次', width: 130, visible: false },
  { prop: 'firstPushRate', label: '标的首推成功率(%)', width: 180, visible: false,
    export: (row: RepairTableRowVO) => row.firstPushRate.toFixed(1) },
  { prop: 'returnRate', label: '返修率(%)', width: 130, visible: false,
    export: (row: RepairTableRowVO) => row.returnRate.toFixed(1) },
  { prop: 'publicRes', label: '公共资源(台次)', width: 130, visible: false },
  { prop: 'thirdPartyPush', label: '三者推送台次', width: 120, visible: false }
]

const makeCard2Columns = (nameLabel: string): ColumnOptWExt[] => [
  { prop: 'name', label: nameLabel, width: 140, visible: true },
  { prop: 'claimAmount', label: '定损金额(万元)', width: 130, visible: true },
  { prop: 'premium', label: '签单保费(万元)', width: 130, visible: true },
  { prop: 'prodRatio', label: '产保比', width: 100, visible: true,
    useSlot: true, slotName: 'prodRatio',
    export: (row: PrTableRowVO) => row.prodRatio.toFixed(2) },
  { prop: 'targetRatio', label: '目标值', width: 100, visible: false,
    export: (row: PrTableRowVO) => row.targetRatio.toFixed(2) },
  { prop: 'thresholdRatio', label: '阈值', width: 100, visible: false,
    export: (row: PrTableRowVO) => row.thresholdRatio.toFixed(2) },
  { prop: 'partsDiscount', label: '零配件折率', width: 110, visible: false,
    export: (row: PrTableRowVO) => row.partsDiscount.toFixed(2) },
  { prop: 'laborDiscount', label: '工时折率', width: 110, visible: false,
    export: (row: PrTableRowVO) => row.laborDiscount.toFixed(2) },
  { prop: 'status', label: '预警状态', width: 110, visible: true,
    useSlot: true, slotName: 'status',
    export: (row: PrTableRowVO) => statusTextMap[row.status].text }
]

// tab1 用 ref(v-model:columns 要求 writable),按 activeDetailCard/dimensionFilter 切换时重算
const tab1Columns = ref<ColumnOptWExt[]>(makeCard1Columns(dimensionFilter.value))
watch(
  [activeDetailCard, dimensionFilter],
  ([card, dim]) => {
    tab1Columns.value = card === 'card2' ? makeCard2Columns(dim) : makeCard1Columns(dim)
  }
)

// tab2 全开,允许列筛选 + 拖动重排(无外部依赖,直接 ref)
const tab2Columns = ref<ColumnOptWExt[]>([
  { prop: 'name', label: '分部', width: 140, visible: true },
  { prop: 'pushTotal', label: '推送总量(台次)', width: 130, visible: true },
  { prop: 'successRate', label: '成功率(%)', width: 110, visible: true,
    export: (row: PersonnelRowVO) => row.successRate.toFixed(1) },
  { prop: 'secondRate', label: '二推触发率(%)', width: 130, visible: true,
    export: (row: PersonnelRowVO) => row.secondRate.toFixed(1) }
])

// 实际传给 ArtTable 渲染 + XLSX 导出的"可见列"(单一来源驱动表格和导出)
const visibleTab1Columns = computed<ColumnOptWExt[]>(() =>
  tab1Columns.value.filter((col) => col.visible !== false)
)
const visibleTab2Columns = computed<ColumnOptWExt[]>(() =>
  tab2Columns.value.filter((col) => col.visible !== false)
)

// 产保比单元格染色
const getPrCellClass = (row: PrTableRowVO): string => {
  if (row.prodRatio > row.targetRatio && row.prodRatio <= row.thresholdRatio) return 'val-amber'
  if (row.prodRatio > row.thresholdRatio) return 'val-red'
  return 'val-green'
}

// prodRatio 列 max/min 高亮(card2 / 产保比明细专用;其他 tab 用空)
const tab1MaxMin = computed(() => {
  if (activeDetailCard.value !== 'card2') return { max: null as number | null, min: null as number | null }
  const rows = (orgPrData.value[dimensionFilter.value] || []) as PrTableRowVO[]
  if (!rows.length) return { max: null, min: null }
  const vals = rows.map((r) => r.prodRatio)
  return { max: Math.max(...vals), min: Math.min(...vals) }
})

const cellMaxMinClass = (row: PrTableRowVO): string => {
  if (activeDetailCard.value !== 'card2') return ''
  if (row.prodRatio === tab1MaxMin.value.max) return 'cell-max'
  if (row.prodRatio === tab1MaxMin.value.min) return 'cell-min'
  return ''
}

const statusTextMap: Record<PrStatus, { text: string; cls: string }> = {
  normal:  { text: '正常', cls: 'dot-green' },
  warning: { text: '预警', cls: 'dot-amber' },
  danger:  { text: '高危', cls: 'dot-red'   }
}

// ===== Excel 导出(参照 chakan_month.vue 范式) =====
const dateSuffix = (): string => new Date().toLocaleDateString().replace(/\//g, '-')

// 去除 Excel 非法字符 + 限 31 字符
const safeSheetName = (raw: string): string =>
  raw.replace(/[\\/?*[\]:]/g, '').slice(0, 31)

const buildExportRow = (cols: ColumnOptWExt[], row: any, idx: number): Record<string, any> => {
  const out: Record<string, any> = { 序号: idx + 1 }
  for (const col of cols) {
    const key = col.label || col.prop || ''
    out[key] = col.export ? col.export(row) : row[col.prop || '']
  }
  return out
}

const handleExportTab1 = (): void => {
  const data = tab1Data.value
  if (!data?.length) {
    ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
    return
  }
  const cols = visibleTab1Columns.value
  const rawName = activeDetailCard.value === 'card2'
    ? `产保比管控明细-${dimensionFilter.value}`
    : `多指标明细-${dimensionFilter.value}`
  const sheetName = safeSheetName(rawName)
  const ws = XLSX.utils.json_to_sheet(
    (data as any[]).map((r, i) => buildExportRow(cols, r, i))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `送修资源-多维分析-${sheetName}-${dateSuffix()}.xlsx`)
  ElNotification({ title: '成功', message: '导出成功', type: 'success' })
}

// 占位阶段:导出全部走同一接口,行为等价于导出当前;等真实分页接口就绪后区分
const handleExportTab1All = (): void => handleExportTab1()

const handleExportTab2 = (): void => {
  const data = tab2Data.value
  if (!data?.length) {
    ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
    return
  }
  const cols = visibleTab2Columns.value
  const rawName = `查勘人员效能-${personnelDim.value}`
  const sheetName = safeSheetName(rawName)
  const ws = XLSX.utils.json_to_sheet(
    data.map((r, i) => buildExportRow(cols, r, i))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `送修资源-人员效能-${sheetName}-${dateSuffix()}.xlsx`)
  ElNotification({ title: '成功', message: '导出成功', type: 'success' })
}

const handleExportTab2All = (): void => handleExportTab2()

// 顶栏时间
const updateTime = new Date().toISOString().slice(0, 10) + ' 09:30'

const changeUpCls = (v: number): string => v >= 0 ? 'change-up' : 'change-down'
const changeArrow = (v: number): string => v >= 0 ? '▲' : '▼'
</script>

<template>
  <div class="dashboard" v-loading="loading">

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
        <transition name="fade-slide" mode="out-in">
          <!-- tab1 -->
          <div v-if="activeAnalysisTab === 'tab1'" key="tab1">
            <div style="margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--text-primary);">{{ tab1Title }}</div>
            <ArtTableHeader
              v-model:columns="tab1Columns"
              :loading="loading"
              @refresh="fetchAll"
              layout="refresh,size,fullscreen,columns"
            >
              <template #left>
                <ElDropdown split-button type="primary" @click="handleExportTab1">
                  <ElIcon><Download /></ElIcon>
                  导出当前页
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="handleExportTab1All">导出全部</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </template>
            </ArtTableHeader>
            <ArtTable
              :loading="loading"
              :data="tab1Data as any[]"
              :columns="visibleTab1Columns"
              :show-overflow-tooltip="true"
              highlight-current-row
              class="analysis-table"
              size="small"
              stripe
              style="margin-top: 10px;"
            >
              <!-- 产保比单元格特殊渲染(染色 + 左色条 + max/min 高亮) -->
              <template #prodRatio="{ row }">
                <span
                  class="pr-cell"
                  :class="[getPrCellClass(row as PrTableRowVO), cellMaxMinClass(row as PrTableRowVO)]"
                >
                  <span class="pr-cell-bar"></span>
                  <span class="pr-cell-text">{{ (row as PrTableRowVO).prodRatio }}</span>
                </span>
              </template>
              <!-- 预警状态徽标 -->
              <template #status="{ row }">
                <span class="status-cell">
                  <span :class="statusTextMap[(row as PrTableRowVO).status].cls"></span>
                  {{ statusTextMap[(row as PrTableRowVO).status].text }}
                </span>
              </template>
            </ArtTable>
          </div>

          <!-- tab2 -->
          <div v-else key="tab2">
            <div style="margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--text-primary);">查勘人员送修效能监控</div>
            <ArtTableHeader
              v-model:columns="tab2Columns"
              :loading="loading"
              @refresh="fetchAll"
              layout="refresh,size,fullscreen,columns"
            >
              <template #left>
                <ElDropdown split-button type="primary" @click="handleExportTab2">
                  <ElIcon><Download /></ElIcon>
                  导出当前页
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem @click="handleExportTab2All">导出全部</ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </template>
            </ArtTableHeader>
            <ArtTable
              :loading="loading"
              :data="tab2Data"
              :columns="visibleTab2Columns"
              :show-overflow-tooltip="true"
              highlight-current-row
              class="analysis-table"
              size="small"
              stripe
              style="margin-top: 10px;"
            />
          </div>
        </transition>
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

/* ===== sparkline tooltip(HTML 浮层;必须全局因为 DOM 在 body) ===== */
.sparkline-tooltip {
  --spark-color: #5b9cf5;
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(15, 22, 32, 0.96);
  border: 1px solid var(--spark-color);
  border-radius: 8px;
  padding: 12px 16px;
  pointer-events: none;
  z-index: 9999;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.18s ease;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  backdrop-filter: blur(6px);
}
.sparkline-tooltip .t-title {
  color: #9aa4b8;
  font-size: 12px;
  font-weight: 400;
  margin-bottom: 6px;
  letter-spacing: 0.4px;
}
.sparkline-tooltip .t-body {
  color: var(--spark-color);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
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

/* ============================================================
 * 表格美化 A+B
 * (ArtTable 是 wrapper,真正的 DOM 在 .el-table;所有 :deep 穿透)
 * ============================================================ */

/* ----- A.1 表头底色 + 标题字号 ----- */
.analysis-area .analysis-table :deep(.el-table__header-wrapper) {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-emphasis);
}
.analysis-area .analysis-table :deep(th.el-table__cell) {
  background: transparent !important;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.4px;
  padding: 12px 14px !important;
}

/* ----- A.2 行 padding/行高 + tabular-nums ----- */
.analysis-area .analysis-table :deep(.el-table__row td.el-table__cell) {
  padding: 10px 14px !important;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle) !important;
}
.analysis-area .analysis-table :deep(.el-table__row) {
  height: 44px;
}

/* ----- A.3 状态徽标升级为 pill ----- */
.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.status-cell:has(.dot-green) { background: var(--green-soft); color: var(--green); }
.status-cell:has(.dot-amber) { background: var(--amber-soft); color: var(--amber); }
.status-cell:has(.dot-red)   { background: var(--red-soft);   color: var(--red);   }

/* ----- A.4 prodRatio 左色条 ----- */
.pr-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  padding-left: 4px;
  padding-right: 1px;
}
.pr-cell-bar {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: currentColor;
  flex-shrink: 0;
}
.pr-cell-text {
  font-variant-numeric: tabular-nums;
}

/* ----- B.1 行 hover ----- */
.analysis-area .analysis-table :deep(.el-table__row:hover > td.el-table__cell) {
  background: var(--bg-card-hover) !important;
  transition: background 0.15s ease;
}

/* ----- B.2 tab 切换淡入 ----- */
.fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to   { opacity: 0; transform: translateY(-8px); }
.fade-slide-enter-active,
.fade-slide-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }

/* ----- B.3 ArtTableHeader 按钮 hover 微光 ----- */
.analysis-area :deep(#art-table-header .button:hover) {
  background: var(--accent-soft) !important;
  color: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
  transition: all 0.18s ease;
}

/* ----- B.4 当前行高亮(custom row-class-name) ----- */
.analysis-area .analysis-table :deep(.el-table__row.row-current > td.el-table__cell) {
  background: var(--accent-soft) !important;
  color: var(--text-bright);
}

/* ----- C.2 prodRatio 列 max/min 高亮 ----- */
.analysis-area .analysis-table :deep(.cell-max) {
  box-shadow: inset 0 0 0 1.5px var(--amber);
  border-radius: 2px;
}
.analysis-area .analysis-table :deep(.cell-min) {
  box-shadow: inset 0 0 0 1px var(--border-emphasis);
  opacity: 0.85;
}
</style>
