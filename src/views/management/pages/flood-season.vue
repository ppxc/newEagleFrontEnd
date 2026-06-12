<template>
  <div class="flood-cockpit" :style="{ minHeight: containerMinHeight }">
    <!-- ==================== 顶部标题 ==================== -->
    <p class="cockpit-title">成都理赔中心——汛期驾驶舱</p>

    <!-- ==================== 气象信息滚动 ==================== -->
    <div class="scroll-bar">
      <ArtTextScroll
        direction="left"
        :speed="50"
        :type="scrollBarType"
      >
        <template v-if="dayLevelsData.length">
          <span
            v-for="(d, i) in dayLevelsData"
            :key="i"
            :class="getRankClass(d.warning)"
          >【{{ d.rank || '等级待定' }}】 {{ d.warning || '' }} — {{ d.meteor || '' }}</span>
          <!-- <span v-for="(d, i) in dayLevelsData" :key="'sep' + i"> </span> -->
        </template>
        <span v-else>今日暂无气象预警信息</span>
      </ArtTextScroll>
    </div>

    <!-- ==================== 左 + 右 主体 ==================== -->
    <div class="cockpit-body">
      <!-- ============ 左侧 60% ============ -->
      <div class="left-col">
        <!-- 5 张占位统计卡片 -->
        <div class="stats-row">
          <div class="card-wrapper" v-for="c in statsCards" :key="c.id">
            <ArtStatsCard
              :title="c.title"
              :count="c.count"
              :description="c.description"
              :icon="c.icon"
              :icon-style="c.iconStyle"
              :style="{ height: '80px' }"
            />
          </div>
        </div>

        <!-- 地图容器 -->
        <div class="map-wrapper">
          <div
            id="rain-map-container"
            class="map-container"
            :class="{ 'map-fullscreen': isMapFullscreen }"
          >
            <div class="map-toolbar">
              <div
                class="district-img-btn"
                :class="{ active: isDistrictsVisible }"
                @click="toggleDistricts"
                title="显示/隐藏行政区划"
              >
                <ArtSvgIcon icon="ri:grid-line" />
              </div>
              <div
                class="district-img-btn"
                :class="{ active: isMapFullscreen }"
                @click="toggleMapFullscreen"
                title="切换全屏"
              >
                <ArtSvgIcon
                  :icon="isMapFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'"
                />
              </div>
            </div>
            <!-- 当前预警措施浮窗（地图左下角） -->
            <div class="flood-place-panel" :class="{ collapsed: isPlacePanelCollapsed }">
              <div class="place-panel-header">
                <span class="place-panel-title">当前预警措施</span>
                <span
                  class="place-panel-toggle"
                  :title="isPlacePanelCollapsed ? '展开' : '收起'"
                  @click="isPlacePanelCollapsed = !isPlacePanelCollapsed"
                >
                  {{ isPlacePanelCollapsed ? '▶' : '◀' }}
                </span>
              </div>

              <div class="place-panel-body" v-show="!isPlacePanelCollapsed"
                :style="{ '--scrollbar-danger-color': scrollbarDangerColor }">
                <div v-if="processes.length === 0" class="place-empty">今日暂无预警措施</div>
                <div v-else class="process-list" ref="processListRef">
                  <div class="process-scroll-inner" :class="{ 'scroll-active': needsScroll }">
                    <div v-for="p in processes" :key="p.number" class="process-item">
                      <span class="process-text">{{ p.measure }}</span>
                    </div>
                    <!-- 内容溢出时才接副本做无缝滚动 -->
                    <template v-if="needsScroll">
                      <div v-for="p in processes" :key="'copy-' + p.number" class="process-item">
                        <span class="process-text">{{ p.measure }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 停车场详情面板（点击 marker 时显示） -->
            <div v-if="selectedPlace" class="parking-detail-panel">
              <div class="parking-detail-header">
                <span class="parking-detail-title" :title="selectedPlace.pname">
                  {{ selectedPlace.pname }}
                </span>
                <span class="parking-detail-close" title="关闭" @click="selectedPlace = null"
                  >✕</span
                >
              </div>
              <div class="parking-detail-body">
                <div class="detail-row">
                  <span class="detail-label">地址</span>
                  <span class="detail-value" :title="selectedPlace.address">
                    {{ selectedPlace.address || '—' }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">区域</span>
                  <span class="detail-value">{{ selectedPlace.region || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">联系人</span>
                  <span class="detail-value">{{ selectedPlace.conPerson || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">电话</span>
                  <span class="detail-value">{{ selectedPlace.tel || '—' }}</span>
                </div>
                <div v-if="selectedPlace.tel1" class="detail-row">
                  <span class="detail-label">备用电话</span>
                  <span class="detail-value">{{ selectedPlace.tel1 }}</span>
                </div>
                <div v-if="selectedPlace.remarks" class="detail-row">
                  <span class="detail-label">备注</span>
                  <span class="detail-value">{{ selectedPlace.remarks }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="mapLoading" class="map-loading">地图加载中...</div>
        </div>
      </div>

      <!-- ============ 右侧 40% ============ -->
      <div class="right-col">
        <!-- 值班信息 -->
        <div class="right-block zhiban-block">
          <div class="block-header">
            <span class="block-title">值班信息</span>
            <span class="block-date">{{ todayDate }}</span>
          </div>
          <div class="zhiban-cards">
            <div v-if="zhibans.length === 0" class="zhiban-empty">今日暂无值班信息</div>
            <div v-else class="zhiban-card" v-for="(z, idx) in zhibans" :key="idx">
              <div class="zhiban-card-left">
                <div class="zhiban-role">值班人员</div>
                <div class="zhiban-name">{{ z.nameWorker || '—' }}</div>
              </div>
              <div class="zhiban-card-divider"></div>
              <div class="zhiban-card-right">
                <div class="zhiban-role">值班领导</div>
                <div class="zhiban-name">{{ z.nameLeader || '—' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据报表 -->
        <div class="right-block report-block">
          <div class="block-header">
            <span class="block-title">数据报表</span>
          </div>
          <div class="report-cards">
            <div v-if="reportTableData.length === 0" class="report-empty">暂无报表数据</div>
            <div v-else class="report-scroll">
              <div v-for="(row, idx) in reportTableData" :key="idx" class="report-card">
                <div class="report-card-header">
                  <span class="report-area">{{ row.areaflag }}</span>
                  <span class="report-org">{{ row.codecname }}</span>
                </div>
                <div class="report-card-body">
                  <div class="report-metric">
                    <span class="metric-label">报案量-当日</span>
                    <span class="metric-value">{{ row.bal_dr ?? '—' }}</span>
                  </div>
                  <div class="report-metric">
                    <span class="metric-label">报案量-累计</span>
                    <span class="metric-value">{{ row.bal_lj ?? '—' }}</span>
                  </div>
                  <div class="report-metric">
                    <span class="metric-label">已赔付件数</span>
                    <span class="metric-value">{{ row.ja_lj ?? '—' }}</span>
                  </div>
                  <div class="report-metric col-span-2">
                    <span class="metric-label">估计赔款(万元)</span>
                    <span class="metric-value highlight">{{
                      row.sumestipaid != null ? Number(row.sumestipaid).toFixed(2) : '—'
                    }}</span>
                  </div>
                  <div class="report-metric col-span-2">
                    <span class="metric-label">已赔付金额(万元)</span>
                    <span class="metric-value highlight">{{
                      row.sumpaid_lj != null ? Number(row.sumpaid_lj).toFixed(2) : '—'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 标签页 -->
        <div class="right-block tabs-block">
          <ElTabs v-model="activeTab" class="rain-tabs">
            <ElTabPane label="物资" name="items">
              <div class="items-list">
                <div v-if="items.length === 0" class="items-empty">暂无物资数据</div>
                <div v-else class="items-rows">
                  <div v-for="item in items" :key="item.id" class="items-card">
                    <div class="items-card-header">
                      <span class="items-name" :title="item.item">{{ item.item }}</span>
                      <span class="items-type" :title="item.type">{{ item.type }}</span>
                    </div>
                    <div class="items-card-body">
                      <div class="items-metric">
                        <span class="items-metric-label">总库存</span>
                        <span class="items-metric-value num-muted">{{ item.inv }}</span>
                      </div>
                      <div class="items-metric">
                        <span class="items-metric-label">剩余</span>
                        <span
                          :class="[
                            'items-metric-value',
                            'num-highlight',
                            getStatusInfo(getProgressPercent(item)).className
                          ]"
                          >{{ item.surplus }}</span
                        >
                      </div>
                      <div class="items-metric">
                        <span class="items-metric-label">状态</span>
                        <span
                          :class="[
                            'status-badge',
                            getStatusInfo(getProgressPercent(item)).className
                          ]"
                        >
                          {{ getStatusInfo(getProgressPercent(item)).text }}
                        </span>
                      </div>
                      <div class="items-metric items-metric-progress">
                        <span class="items-metric-label">库存剩余百分比</span>
                        <div class="items-progress-wrap">
                          <div class="progress-track">
                            <div
                              :class="[
                                'progress-fill',
                                getStatusInfo(getProgressPercent(item)).className
                              ]"
                              :style="{ width: getProgressPercent(item) + '%' }"
                            />
                          </div>
                          <span class="progress-label">{{ getProgressPercent(item) }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ElTabPane>
            <ElTabPane label="施救单位" name="repair">
              <div class="cards-list">
                <div v-if="repairs.length === 0" class="items-empty">暂无施救单位数据</div>
                <div v-else class="cards-scroll">
                  <div v-for="r in repairs" :key="r.id" class="rescue-card">
                    <div class="rescue-card-top">
                      <div class="rescue-icon">
                        <ArtSvgIcon icon="ri:heart-pulse-line" />
                      </div>
                      <div class="rescue-name" :title="r.name">{{ r.name }}</div>
                    </div>
                    <div class="rescue-card-body">
                      <div class="rescue-info-row">
                        <span class="rescue-info-label">联系人</span>
                        <span class="rescue-info-value">{{ r.conPerson || '—' }}</span>
                      </div>
                      <div class="rescue-info-row">
                        <span class="rescue-info-label">联系电话</span>
                        <span class="rescue-info-value tel" :title="r.tel">{{ r.tel || '—' }}</span>
                      </div>
                      <div class="rescue-info-row">
                        <span class="rescue-info-label">服务区域</span>
                        <span class="rescue-info-value region" :title="r.region">{{
                          r.region || '—'
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ElTabPane>
            <ElTabPane label="中心对口联络机制" name="lianluo">
              <div class="cards-list">
                <div v-if="lianluos.length === 0" class="items-empty">暂无联络机制数据</div>
                <div v-else class="cards-scroll">
                  <div v-for="(l, idx) in lianluos" :key="idx" class="liaison-card">
                    <div class="liaison-card-left">
                      <div class="liaison-index">{{ idx + 1 }}</div>
                      <div class="liaison-group">{{ l.workGroup }}</div>
                    </div>
                    <div class="liaison-card-right">
                      <div class="liaison-person">
                        <span class="liaison-role-tag">联络人</span>
                        <span class="liaison-name">{{ l.conPerson || '—' }}</span>
                      </div>
                      <div class="liaison-person">
                        <span class="liaison-role-tag">工作人员</span>
                        <span class="liaison-name">{{ l.nameWorker || '—' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ElTabPane>
          </ElTabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'
  import { ElRow, ElCol, ElTabs, ElTabPane, ElTable, ElTableColumn } from 'element-plus'
  import { MapLoader } from '../../lpmap/api/mapLoader'
  import { AdministrativeRegionManager } from '../../lpmap/api/AdministrativeRegionmanager'
  import { useAutoLayoutHeight } from '@/hooks/core/useLayoutHeight'
  import { RainCockpit } from '@views/management/api'

  defineOptions({ name: 'FloodSeasonCockpit' })

  // 高度自适应：扣除顶栏 + 面包屑/页头后剩余可用高度，作为最小高度
  // 内容由 CSS flex 比例（22/35/43）自然填充右侧三表；左侧 flex:1 地图自动跟随
  // 左右两列在父级 .cockpit-body（display:flex）中自动等高 → 底部始终对齐，无 JS 测量
  const { containerMinHeight } = useAutoLayoutHeight()

  // ==================== 类型 ====================
  interface DayLevel {
    tjDate: string
    id: number
    rank: string
    warning: string
    meteor: string
  }
  interface CarPlace {
    id: number
    pname: string
    address: string
    region: string
    conPerson: string
    tel: string
    tel1: string
    remarks: string
    longitudeNew: number
    latitudeNew: number
  }
  interface Zhiban {
    tjDate: string
    nameWorker: string
    nameLeader: string
  }
  interface Repair {
    id: number
    name: string
    conPerson: string
    tel: string
    region: string
    scopeS: string
    remarks: string
  }
  interface Lianluo {
    workGroup: string
    conPerson: string
    nameWorker: string
  }
  interface Item {
    id: number
    type: string
    item: string
    surplus: number
    inv: number
  }

  interface CardData {
    tjdate: string
    areaflag: string
    codecname: string
    bal_lj: number
    sumestipaid: number
    ja_lj: number
    sumpaid_lj: number
    bal_dr: string | null
    sumestipaid_dr: string | null
  }

  interface HeatDataPoint {
    lat: number
    lng: number
    count: number
  }

  // ==================== 列表（直接展示后端原数据） ====================
  const zhibans = ref<Zhiban[]>([])
  const repairs = ref<Repair[]>([])
  const lianluos = ref<Lianluo[]>([])
  const items = ref<Item[]>([])
  const reportTableData = ref<CardData[]>([])

  // ==================== 滚动文字 ====================
  // 保留原始数据，供按等级着色使用
  const dayLevelsData = ref<DayLevel[]>([])
  const activeTab = ref<'repair' | 'lianluo' | 'items'>('items')
  const todayDate = computed(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // ==================== 占位统计卡片 ====================
  const statsCards = [
    {
      id: 1,
      title: '报案量-当日',
      count: 0,
      description: '当日报案数',
      icon: 'ri:file-list-2-line',
      iconStyle: 'bg-primary'
    },
    {
      id: 2,
      title: '报案量-累计',
      count: 0,
      description: '累计报案数',
      icon: 'ri:folder-history-line',
      iconStyle: 'bg-success'
    },
    {
      id: 3,
      title: '估计赔款（万元）',
      count: 0,
      description: '估计赔款金额',
      icon: 'ri:bank-card-line',
      iconStyle: 'bg-warning'
    },
    {
      id: 4,
      title: '已赔付件数',
      count: 0,
      description: '已决件数',
      icon: 'ri:checkbox-circle-line',
      iconStyle: 'bg-info'
    },
    {
      id: 5,
      title: '已赔付金额（万元）',
      count: 0,
      description: '已赔付金额',
      icon: 'ri:wallet-3-line',
      iconStyle: 'bg-danger'
    }
  ]

  // ==================== 预警措施（今日） ====================
  interface LevelProcess {
    number: number
    measure: string
  }
  const processes = ref<LevelProcess[]>([])
  const processListRef = ref<HTMLElement | null>(null)
  const needsScroll = ref(false)

  const checkOverflow = () => {
    const listEl = processListRef.value
    if (!listEl) return
    const containerH = listEl.clientHeight
    // 无副本时 scrollHeight = 单份高度；有副本时 = 2× 单份高度
    const singleH = needsScroll.value ? listEl.scrollHeight / 2 : listEl.scrollHeight
    const overflow = singleH > containerH
    if (overflow !== needsScroll.value) {
      needsScroll.value = overflow
    }
  }

  watch(processes, async () => {
    await nextTick()
    setTimeout(checkOverflow, 0)
  })

  // needsScroll 变为 true 后副本才渲染，需再测一次校准（此时始终 true）
  watch(needsScroll, async (val) => {
    if (val) {
      await nextTick()
      setTimeout(checkOverflow, 0)
    }
  })

  // 滚动条颜色：取 processes 中最小编号（最危险）的颜色渐变
  // 编号越小越危险 → 红色渐变；编号越大越安全 → 绿色
  const scrollbarDangerColor = computed(() => {
    if (!processes.value.length) return 'var(--fs-scrollbar-thumb)'
    const minNumber = Math.min(...processes.value.map((p) => p.number))
    // danger 1~3: 红, 4~6: 橙, 7+: 绿
    if (minNumber <= 3) return '#ef4444'
    if (minNumber <= 6) return '#f97316'
    return '#22c55e'
  })

  // ==================== 停车场数据（地图 marker） ====================
  const pendingPlaces = ref<CarPlace[]>([])

  // ==================== 浮窗状态 ====================
  const isPlacePanelCollapsed = ref(false)
  const isMapFullscreen = ref(false)

  // ==================== 选中的停车场（点击 marker 后显示详情） ====================
  const selectedPlace = ref<CarPlace | null>(null)

  // ==================== 地图 ====================
  const mapLoading = ref(true)
  let map: any = null
  let markerLayer: any = null
  let regionManager: AdministrativeRegionManager | null = null
  let heat: any = null
  const mapLoader = MapLoader.getInstance()

  declare global {
    interface Window {
      TMap: any
    }
  }

  const toggleDistricts = () => regionManager?.toggleDistricts()
  const isDistrictsVisible = computed(() => regionManager?.showingDistricts.value ?? false)

  const toggleMapFullscreen = () => {
    isMapFullscreen.value = !isMapFullscreen.value
  }

  // 标记刚刚点击了 marker,用于阻止同一 tick 内 map.on('click') 关闭详情
  let suppressMapClick = false

  // ==================== 拉取所有非地图数据 ====================
  const fetchAll = async () => {
    try {
      const [dayLevels, places, z, r, l, it, lp, cd, rt] = await Promise.all([
        RainCockpit.getDayLevels() as Promise<DayLevel[]>,
        RainCockpit.getCarPlaces() as Promise<CarPlace[]>,
        RainCockpit.getZhibans() as Promise<Zhiban[]>,
        RainCockpit.getRepairs() as Promise<Repair[]>,
        RainCockpit.getLianluos() as Promise<Lianluo[]>,
        RainCockpit.getItems() as Promise<Item[]>,
        RainCockpit.getLevelProcesses() as Promise<LevelProcess[]>,
        RainCockpit.getCardData() as Promise<CardData>,
        RainCockpit.getReportTable() as Promise<CardData[]>
      ])

      // 滚动文字
      dayLevelsData.value = dayLevels || []

      zhibans.value = z || []
      repairs.value = r || []
      lianluos.value = l || []
      items.value = it || []
      processes.value = lp || []

      // 卡片数据
      if (cd) {
        statsCards[0].count = cd.bal_dr !== null && cd.bal_dr !== undefined ? Number(cd.bal_dr) : 0
        statsCards[1].count = cd.bal_lj || 0
        statsCards[2].count = cd.sumestipaid || 0
        statsCards[3].count = cd.ja_lj || 0
        statsCards[4].count = cd.sumpaid_lj || 0
        const dateStr = cd.tjdate ? cd.tjdate.substring(0, 10) : ''
        statsCards.forEach((card) => {
          card.description = dateStr
        })
      }

      // 数据报表
      reportTableData.value = rt || []

      // 暂存停车点位，等地图就绪后渲染（修复竞态）
      pendingPlaces.value = places || []
      if (map) renderMarkers(pendingPlaces.value)
    } catch (err) {
      console.error('[汛期驾驶舱] 数据拉取失败：', err)
    }
  }

  // ==================== 物资状态计算 ====================
  type StatusLevel = 'plenty' | 'normal' | 'low' | 'out'

  interface StatusInfo {
    className: StatusLevel
    text: string
  }

  /** 根据剩余百分比推导状态 */
  const getStatusInfo = (percent: number): StatusInfo => {
    if (percent >= 70) return { className: 'plenty', text: '充足' }
    if (percent >= 30) return { className: 'normal', text: '适中' }
    if (percent >= 10) return { className: 'low', text: '低库存' }
    return { className: 'out', text: '缺货' }
  }

  /** 进度百分比 = 剩余 / 库存，含零除与越界防御 */
  const getProgressPercent = (item: Item): number => {
    if (!item.inv || item.inv <= 0) return 0
    const pct = Math.round((item.surplus / item.inv) * 100)
    return Math.max(0, Math.min(100, pct))
  }

  // ==================== 等级颜色映射 ====================
  const getRankClass = (warning: string) => {
    const w = warning?.toLowerCase() || ''
    if (w.includes('红色')) return 'rank-red'
    if (w.includes('橙色')) return 'rank-orange'
    if (w.includes('黄色')) return 'rank-yellow'
    if (w.includes('蓝色')) return 'rank-blue'
    return 'rank-default'
  }

  // 计算最高预警等级，决定滚动条容器颜色（对应 ArtTextScroll type 主题）
  type ThemeType = 'theme' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'danger'
  const scrollBarType = computed<ThemeType>(() => {
    if (!dayLevelsData.value.length) return 'success'                  // 无预警：绿色
    if (dayLevelsData.value.some((d) => (d.warning || '').includes('红色'))) return 'danger'   // 红色
    if (dayLevelsData.value.some((d) => (d.warning || '').includes('橙色'))) return 'warning'  // 黄色
    if (dayLevelsData.value.some((d) => (d.warning || '').includes('黄色'))) return 'warning'  // 黄色
    if (dayLevelsData.value.some((d) => (d.warning || '').includes('蓝色'))) return 'secondary'     // 蓝色
    return 'success'
  })

   // ==================== 地图初始化 ====================
  const initMap = async () => {
    try {
      await mapLoader.loadMapApi()
      await nextTick()

      const container = document.getElementById('rain-map-container')
      if (!container) return

      const center = new window.TMap.LatLng(30.6799, 104.0571)
      map = new window.TMap.Map(container, {
        zoom: 9.5,
        pitch: 45,
        center,
        mapStyleId: 'style1'
      })

      // 阻止地图容器上的 wheel 冒泡到地图（地图会用它缩放）
      container.addEventListener('wheel', (e) => {
        const panel = document.querySelector('.flood-place-panel .place-panel-body') as HTMLElement
        if (panel && panel.contains(e.target as Node)) {
          e.preventDefault()
        }
      }, { capture: true, passive: false })

      // 点击地图空白处关闭停车场详情
      map.on('click', () => {
        if (suppressMapClick) return
        selectedPlace.value = null
      })

      regionManager = new AdministrativeRegionManager(map)
      await regionManager.showDistricts()

      // 初始化热力图层（数据为占位，接口待定）
      initHeatMap()
      refreshHeatMap()

      // 地图就绪后再渲染 marker（若数据已回来）
      if (pendingPlaces.value.length) renderMarkers(pendingPlaces.value)

      mapLoading.value = false
    } catch (err: any) {
      console.error('地图加载失败：', err)
      mapLoading.value = false
    }
  }

  // ==================== 渲染停车点位 ====================
  const renderMarkers = (places: CarPlace[]) => {
    if (!map || !window.TMap) return
    const valid = places.filter((p) => p.longitudeNew && p.latitudeNew)
    if (!valid.length) return

    const geometries = valid.map((p) => ({
      id: String(p.id),
      styleId: 'parking',
      position: new window.TMap.LatLng(p.latitudeNew, p.longitudeNew),
      properties: { data: p }
    }))

    if (markerLayer) markerLayer.setMap(null)
    markerLayer = new window.TMap.MultiMarker({
      map,
      styles: {
        parking: new window.TMap.MarkerStyle({
          width: 34,
          height: 40,
          anchor: { x: 17, y: 40 },
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'%3E%3Cdefs%3E%3Cfilter id='s' x='-20%25' y='-20%25' width='140%25' height='140%25'%3E%3CfeDropShadow dx='0' dy='3' stdDeviation='4' flood-color='%23000' flood-opacity='0.35'/%3E%3C/filter%3E%3C/defs%3E%3Cellipse cx='50' cy='42' rx='38' ry='38' fill='%23ff6b35' filter='url(%23s)'/%3E%3Cellipse cx='50' cy='42' rx='38' ry='38' fill='none' stroke='%23fff' stroke-width='3' opacity='0.3'/%3E%3Ccircle cx='50' cy='42' r='28' fill='white' opacity='0.95'/%3E%3Ctext x='50' y='54' font-family='Arial,sans-serif' font-size='36' font-weight='bold' text-anchor='middle' fill='%23ff6b35'%3EP%3C/text%3E%3Cpolygon points='50,80 36,110 64,110' fill='%23ff6b35'/%3E%3C/svg%3E"
        })
      },
      geometries
    })

    // 点击 marker 显示该停车场详情
    markerLayer.on('click', (evt: any) => {
      // 阻止冒泡，避免 map.on('click') 立即把面板关掉
      evt?.originalEvent?.stopPropagation?.()
      evt?.stopPropagation?.()
      const place = evt.geometry?.properties?.data as CarPlace | undefined
      if (place) {
        suppressMapClick = true
        selectedPlace.value = place
        // 下一帧后释放,允许后续点击地图关闭
        setTimeout(() => {
          suppressMapClick = false
        }, 0)
      }
    })

    // 自适应视野
    const bounds = new window.TMap.LatLngBounds()
    valid.forEach((p) => bounds.extend(new window.TMap.LatLng(p.latitudeNew, p.longitudeNew)))
    map.fitBounds(bounds, { padding: 60 })
  }

  // ==================== 热力图 ====================
  const initHeatMap = () => {
    if (!map || !window.TMap?.visualization?.Heat) return
    heat = new window.TMap.visualization.Heat({
      max: 20,
      min: 0,
      height: 60,
      radius: 30,
      transitAnimation: { duration: 3000 }
    }).addTo(map)
  }

  const refreshHeatMap = async () => {
    if (!heat) return
    try {
      const data: HeatDataPoint[] = await RainCockpit.getFloodSeasonHeatmapData()
      if (data && data.length > 0) {
        const heatData = data.map((p: HeatDataPoint) => ({
          lat: p.lat,
          lng: p.lng,
          weight: p.count || 1
        }))
        heat.setData(heatData)
        console.log('[汛期驾驶舱] 热力图数据已刷新，共', heatData.length, '个坐标点')
      } else {
        heat.setData([])
      }
    } catch (err) {
      console.error('[汛期驾驶舱] 热力图数据加载失败：', err)
    }
  }

  // ==================== 生命周期 ====================
  onMounted(() => {
    initMap()
    fetchAll()
  })

  onBeforeUnmount(() => {
    if (heat && typeof heat.setMap === 'function') {
      heat.setMap(null)
      heat = null
    }
    if (markerLayer) markerLayer.setMap(null)
    if (map) {
      map.destroy()
      map = null
    }
  })
</script>

<style scoped>
  .flood-cockpit {
    width: 100%;
    height: auto; /* 由 :style.height 精确控制为 viewport - 头 - footer，避免被 100vh 撑得过高 */
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* 由 :style.minHeight 保证至少 100vh-头；overflow:visible 允许内容超出时出现滚动条 */
    overflow: visible;
  }

  /* ==================== 标题 ==================== */
  .cockpit-title {
    margin: 0;
    padding: 10px 0;
    text-align: center;
    font-size: 22px;
    font-weight: 600;
    color: var(--fs-text-primary);
    background: var(--fs-title-bg);
    border-radius: 8px;
    letter-spacing: 4px;
  }

  /* ==================== 滚动条 ==================== */
  .scroll-bar {
    height: 36px;
  }

  /* ==================== 主体 ==================== */
  .cockpit-body {
    flex: 1;
    display: flex;
    align-items: stretch; /* 两列强制等高 → 地图底部与右侧表格底部自动对齐 */
    gap: 10px;
    min-height: 0;
    max-height: 75vh;
    /* overflow 由子列 .left-col/.right-col 各自管理 */
  }

  .left-col,
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    /* 不设 height:100% —— 父级 align-items:stretch 已保证两列等高；
       height:100% 在父级无 definite size 时会退化为 auto，导致两列各自按内容撑高、底部错位 */
    overflow: hidden;
  }

  /* 让右侧最底下的 .tabs-block 与 .right-col 底部之间有 10px 间距，
     对应左侧 .map-wrapper 的 margin-bottom: 10px（地图底部到 .left-col 底部），两侧底部对齐且呼吸感一致 */
  .right-col {
    padding-bottom: 10px;
  }

  .left-col {
    flex: 1 1 60%; /* 维持左 60% 比例；flex:1 让两列在父容器 .cockpit-body 内等高 */
    min-width: 0;
  }

  .right-col {
    flex: 1 1 calc(40% - 10px); /* 维持右 40% 比例（含一个 gap） */
    min-width: 0;
  }

  /* ==================== 卡片 ==================== */
  .stats-row {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    margin-bottom: 10px;
  }
  .card-wrapper {
    flex: 1 1 0;
    min-width: 0;
    height: 75px;
  }
  /* 覆盖 ArtStatsCard 内部样式，让 60px 容器装下三行 */
  .card-wrapper :deep(.text-lg) {
    font-size: 11px !important;
    line-height: 1.05;
  }
  .card-wrapper :deep(.text-2xl) {
    font-size: 13px !important;
    line-height: 1.05;
  }
  .card-wrapper :deep(.text-sm) {
    font-size: 11px !important;
    line-height: 1.05;
  }
  .card-wrapper :deep(.size-11) {
    width: 28px !important;
    height: 28px !important;
  }
  .card-wrapper :deep(.text-xl) {
    font-size: 14px !important;
  }
  .card-wrapper :deep(.art-card) {
    padding-left: 6px !important;
    padding-right: 6px !important;
  }

  /* ==================== 地图 ==================== */
  .map-wrapper {
    position: relative;
    flex: 1 1 auto;
    min-height: 320px;
    margin-bottom: 10px;
    overflow: hidden;
  }

  .map-container {
    width: 100%;
    height: 100%; /* 跟随 .map-wrapper（flex:1 撑满），不再用 65vh，与右侧三表底部对齐 */
    border-radius: 8px;
    position: relative;
    transition: all 0.3s ease;
  }

  .map-container.map-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    border-radius: 0;
  }

  .map-toolbar {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--fs-toolbar-bg);
    padding: 5px 8px;
    border-radius: 10px;
    border: 1px solid var(--fs-toolbar-border);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .district-img-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    background: var(--fs-toolbar-btn-bg);
    border: 1px solid var(--fs-toolbar-btn-border);
    border-radius: 8px;
    color: var(--fs-toolbar-btn-color);
    font-size: 16px;
  }
  .district-img-btn:hover {
    background: var(--fs-toolbar-btn-hover-bg);
    border-color: var(--fs-toolbar-btn-hover-border);
    color: var(--fs-toolbar-btn-hover-color);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .district-img-btn.active {
    background: var(--fs-bg-blue);
    border-color: var(--fs-accent-border);
    color: var(--fs-accent);
    box-shadow: 0 0 10px var(--fs-accent-glow);
  }

  .map-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--fs-text-primary);
    background: var(--fs-bg-inner);
    padding: 12px 24px;
    border-radius: 8px;
  }

  /* ==================== 停车场详情面板（点击 marker） ==================== */
  .parking-detail-panel {
    position: absolute;
    left: 10px;
    top: 50px;
    z-index: 9999;
    width: 300px;
    max-height: calc(100% - 70px);
    background: var(--fs-bg-panel);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    color: var(--fs-text-secondary);
    font-size: 13px;
    overflow: hidden;
    border: 1px solid var(--fs-border);
    animation: parking-detail-in 0.2s ease-out;
  }
  @keyframes parking-detail-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .parking-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    background: var(--fs-bg-inner);
    border-bottom: 1px solid var(--fs-border);
  }
  .parking-detail-title {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--fs-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .parking-detail-close {
    flex-shrink: 0;
    cursor: pointer;
    color: var(--fs-text-muted);
    font-size: 14px;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition:
      background 0.2s ease,
      color 0.2s ease;
  }
  .parking-detail-close:hover {
    background: var(--fs-border);
    color: var(--fs-text-primary);
  }

  .parking-detail-body {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: calc(100vh - 220px);
    overflow-y: auto;
  }
  .parking-detail-body::-webkit-scrollbar {
    width: 4px;
  }
  .parking-detail-body::-webkit-scrollbar-thumb {
    background: var(--fs-scrollbar-thumb);
    border-radius: 10px;
  }
  .parking-detail-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--fs-bg-inner);
    border: 1px solid var(--fs-border);
    border-radius: 6px;
    padding: 6px 10px;
    line-height: 1.5;
    font-size: 12px;
  }
  .detail-label {
    flex-shrink: 0;
    min-width: 56px;
    color: var(--fs-text-muted);
  }
  .detail-value {
    flex: 1;
    color: var(--fs-text-primary);
    word-break: break-all;
  }

  /* ==================== 停车场详情面板 ==================== */
  .flood-place-panel {
    position: absolute;
    right: 10px;
    bottom: 10px;
    max-height: 260px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    width: 320px;
    background: var(--fs-bg-panel);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    color: var(--fs-text-secondary);
    font-size: 13px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid var(--fs-border);
  }

  .flood-place-panel.collapsed {
    width: 130px;
  }

  .place-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--fs-bg-inner);
    border-bottom: 1px solid var(--fs-border);
    cursor: default;
  }

  .place-panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--fs-text-primary);
  }

  .place-panel-toggle {
    cursor: pointer;
    color: var(--fs-text-muted);
    font-size: 12px;
    user-select: none;
    padding: 2px 6px;
    border-radius: 4px;
    transition:
      background 0.2s ease,
      color 0.2s ease;
  }
  .place-panel-toggle:hover {
    background: var(--fs-border);
    color: var(--fs-text-primary);
  }

  .place-panel-body {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 60vh;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .place-empty {
    text-align: center;
    color: var(--fs-text-muted);
    font-size: 12px;
    padding: 20px 0;
  }

  .process-list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }

  .process-scroll-inner {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .process-scroll-inner.scroll-active {
    animation: scroll-up 20s linear infinite;
  }

  .process-scroll-inner.scroll-active:hover {
    animation-play-state: paused;
  }

  @keyframes scroll-up {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }

  .process-item {
    display: flex;
    align-items: flex-start;
    background: var(--fs-bg-inner);
    border: 1px solid var(--fs-border);
    border-radius: 8px;
    padding: 10px 12px;
    line-height: 1.6;
    flex-shrink: 0;
  }

  .process-text {
    flex: 1;
    color: var(--fs-text-secondary);
    font-size: 12px;
    word-break: break-all;
  }

  .place-panel-body::-webkit-scrollbar {
    width: 4px;
  }
  .place-panel-body::-webkit-scrollbar-thumb {
    background: var(--scrollbar-danger-color, var(--fs-scrollbar-thumb));
    border-radius: 10px;
  }
  .place-panel-body::-webkit-scrollbar-track {
    background: var(--fs-scrollbar-track);
  }

  /* ==================== 右侧 ==================== */
  .right-block {
    background: var(--fs-bg-panel);
    border: 0.5px solid var(--fs-border-medium);
    border-radius: 8px;
    padding: 10px;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .right-block > * {
    min-height: 0;
  }

  /* 第二个 right-block 被上方的统一 .tabs-block 规则覆盖，此处删除 */

  .rain-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .rain-tabs :deep(.el-tabs__header) {
    margin: 0 0 8px 0;
    flex-shrink: 0;
  }
  .rain-tabs :deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  .rain-tabs :deep(.el-tab-pane) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 约束子元素，迫使 .items-list/.cards-list 的 overflow-y:auto 生效 */
  }

  /* ==================== 表格区 ==================== */

  /* 三表高度由 flex 比例自然瓜分 right-col 剩余空间（总计 22+35+43=100）
     与左侧地图共享 .cockpit-body 等高容器 → 底部自动对齐
     max-height 防止大屏下表无限拉长，触及上限后多余空间留在 right-col 底部 */
  .zhiban-block {
    flex: 22; /* 22% */
    min-height: 125px;
    max-height: 125px; /* 值班信息内容少，固定 125px */
    overflow: hidden;
  }

  /* 数据报表：35% */
  .report-block {
    flex: 35;
    min-height: 140px;
    max-height: 220px;
    overflow: hidden;
  }

  /* Tab 表：43% */
  .tabs-block {
    flex: 43;
    min-height: 120px;
    max-height: 300px;
    overflow: hidden;
  }
  .block-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 0 4px 8px;
  }
  .block-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--fs-text-primary);
  }
  .block-date {
    font-size: 12px;
    color: var(--fs-text-muted);
    background: var(--fs-bg-card);
    padding: 2px 8px;
    border-radius: 10px;
    border: 0.5px solid var(--fs-border-light);
  }

  .zhiban-cards {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }
  .zhiban-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--fs-text-empty);
    font-size: 13px;
  }
  .zhiban-card {
    display: flex;
    align-items: center;
    background: var(--fs-bg-card);
    border: 0.5px solid var(--fs-border);
    border-radius: 10px;
    padding: 12px 14px;
    gap: 0;
  }
  .zhiban-card-left,
  .zhiban-card-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .zhiban-card-right {
    text-align: right;
  }
  .zhiban-card-divider {
    width: 1px;
    height: 36px;
    background: var(--fs-border);
    margin: 0 14px;
    flex-shrink: 0;
  }
  .zhiban-role {
    font-size: 11px;
    color: var(--fs-text-muted);
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .zhiban-name {
    font-size: 15px;
    color: var(--fs-text-primary);
    font-weight: 600;
  }

  /* ==================== ElTable 暗色主题（Tab 1/2）==================== */
  .tabs-table-dark :deep(.el-table) {
    background: transparent !important;
    color: var(--fs-text-primary);
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: rgba(17, 24, 39, 0.85);
    --el-table-header-text-color: #f3f4f6;
    --el-table-border-color: rgba(156, 163, 175, 0.18);
    --el-table-header-border-color: rgba(156, 163, 175, 0.25);
    --el-table-row-hover-bg-color: rgba(31, 41, 55, 0.6);
    --el-table-current-row-bg-color: transparent;
  }

  .tabs-table-dark :deep(.el-table th.el-table__cell) {
    background: rgba(17, 24, 39, 0.85) !important;
    color: #f3f4f6 !important;
    border-bottom: 0.5px solid rgba(156, 163, 175, 0.3) !important;
    font-weight: 600;
  }

  .tabs-table-dark :deep(.el-table td.el-table__cell) {
    background: transparent !important;
    border-bottom: 0.5px solid rgba(156, 163, 175, 0.12) !important;
    color: #e5e7eb !important;
  }

  .tabs-table-dark :deep(.el-table tr:hover > td.el-table__cell) {
    background: rgba(31, 41, 55, 0.7) !important;
  }

  .tabs-table-dark :deep(.el-table__empty-block) {
    background: transparent;
    min-height: 120px;
  }
  .tabs-table-dark :deep(.el-table__empty-text) {
    color: #9ca3af !important;
  }

  .tabs-table-dark :deep(.el-table__body-wrapper::-webkit-scrollbar) {
    width: 4px;
  }
  .tabs-table-dark :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
    background: #4b5563;
    border-radius: 10px;
  }
  .tabs-table-dark :deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
    background: transparent;
  }

  /* ==================== 数据报表表格暗色主题 ==================== */
  .report-table :deep(.el-table) {
    background: transparent !important;
    color: var(--fs-text-primary);
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: rgba(17, 24, 39, 0.85);
    --el-table-header-text-color: #f3f4f6;
    --el-table-border-color: rgba(156, 163, 175, 0.18);
    --el-table-header-border-color: rgba(156, 163, 175, 0.25);
    --el-table-row-hover-bg-color: rgba(31, 41, 55, 0.6);
    --el-table-current-row-bg-color: transparent;
  }

  .report-table :deep(.el-table th.el-table__cell) {
    background: rgba(17, 24, 39, 0.85) !important;
    color: #f3f4f6 !important;
    border-bottom: 0.5px solid rgba(156, 163, 175, 0.3) !important;
    font-weight: 600;
  }

  .report-table :deep(.el-table td.el-table__cell) {
    background: transparent !important;
    border-bottom: 0.5px solid rgba(156, 163, 175, 0.12) !important;
    color: #e5e7eb !important;
  }

  .report-table :deep(.el-table tr:hover > td.el-table__cell) {
    background: rgba(31, 41, 55, 0.7) !important;
  }

  .report-table :deep(.el-table__empty-block) {
    background: transparent;
    min-height: 80px;
  }
  .report-table :deep(.el-table__empty-text) {
    color: #9ca3af !important;
  }

  .report-table :deep(.el-table__body-wrapper::-webkit-scrollbar) {
    width: 4px;
  }
  .report-table :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
    background: #4b5563;
    border-radius: 10px;
  }
  .report-table :deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
    background: transparent;
  }

  /* ==================== Tab 物资 - 卡片式列表 ==================== */
  .items-list {
    flex: 1;
    min-height: 0;
    background: var(--fs-bg-inner-light);
    border: 0.5px solid var(--fs-border-medium);
    border-radius: 8px;
    padding: 8px 6px;
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  .items-list::-webkit-scrollbar {
    width: 4px;
  }
  .items-list::-webkit-scrollbar-thumb {
    background: var(--fs-scrollbar-thumb);
    border-radius: 10px;
  }
  .items-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .items-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .items-card {
    background: var(--fs-bg-card);
    border: 0.5px solid var(--fs-border);
    border-radius: 10px;
    padding: 10px 12px;
    color: var(--fs-text-primary);
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .items-card:hover {
    background: var(--fs-bg-card-hover);
    border-color: var(--fs-border-strong);
  }

  .items-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--fs-border-light);
  }

  .items-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--fs-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .items-type {
    font-size: 11px;
    color: var(--fs-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .items-card-body {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
  }

  .items-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 60px;
  }

  .items-metric-progress {
    flex: 1 1 0;
    min-width: 140px;
  }

  .items-metric-label {
    font-size: 10px;
    color: var(--fs-text-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .items-metric-value {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .items-metric-value.num-muted {
    color: var(--fs-text-muted);
    font-weight: 500;
  }

  .items-metric-value.num-highlight {
    color: var(--fs-text-primary);
  }

  .items-metric-value.num-highlight.plenty {
    color: var(--fs-green);
  }
  .items-metric-value.num-highlight.normal {
    color: var(--fs-text-secondary);
  }
  .items-metric-value.num-highlight.low {
    color: var(--fs-yellow);
  }
  .items-metric-value.num-highlight.out {
    color: var(--fs-red);
  }

  .items-progress-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: 700px) {
    .items-metric-progress {
      flex: 0 0 100%;
      min-width: 0;
    }
  }

  /* ===== 状态徽章 ===== */
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 9999px;
    white-space: nowrap;
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .status-badge {
      padding: 2px 5px;
      font-size: 10px;
    }
  }
  .status-badge.plenty {
    background: rgba(16, 185, 129, 0.18);
    color: var(--fs-green);
    border: 1px solid rgba(16, 185, 129, 0.4);
  }
  .status-badge.normal {
    background: rgba(156, 163, 175, 0.18);
    color: var(--fs-text-secondary);
    border: 1px solid rgba(156, 163, 175, 0.35);
  }
  .status-badge.low {
    background: rgba(245, 158, 11, 0.18);
    color: var(--fs-yellow);
    border: 1px solid rgba(245, 158, 11, 0.4);
  }
  .status-badge.out {
    background: rgba(239, 68, 68, 0.18);
    color: var(--fs-red);
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  /* ===== 进度条 ===== */
  .progress-track {
    flex: 1;
    height: 6px;
    background: rgba(75, 85, 99, 0.5);
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .progress-fill.plenty {
    background: var(--fs-green);
  }
  .progress-fill.normal {
    background: var(--fs-text-muted);
  }
  .progress-fill.low {
    background: var(--fs-yellow);
  }
  .progress-fill.out {
    background: var(--fs-red);
  }
  .progress-label {
    font-size: 12px;
    color: var(--fs-text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: right;
  }

  /* ===== 空态 ===== */
  .items-empty {
    height: 100%;
    min-height: 125px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fs-text-empty);
    font-size: 13px;
  }

  /* ==================== 数据报表卡片 ==================== */
  .report-cards {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--fs-bg-inner-light);
    border: 0.5px solid var(--fs-border-medium);
    border-radius: 8px;
    padding: 6px;
    box-sizing: border-box;
  }

  .report-scroll {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .report-empty {
    height: 100%;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fs-text-empty);
    font-size: 13px;
  }

  .report-card {
    background: var(--fs-bg-card);
    border: 0.5px solid var(--fs-border);
    border-radius: 10px;
    padding: 10px 12px;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .report-card:hover {
    background: var(--fs-bg-card-hover);
    border-color: var(--fs-border-strong);
  }

  .report-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--fs-border-light);
  }

  .report-area {
    font-size: 11px;
    font-weight: 600;
    color: var(--fs-accent);
    background: var(--fs-bg-badge);
    border: 0.5px solid var(--fs-border-badge);
    padding: 1px 8px;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .report-org {
    font-size: 13px;
    font-weight: 600;
    color: var(--fs-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .report-card-body {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
  }

  .report-metric {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 70px;
  }

  .report-metric.col-span-2 {
    min-width: 120px;
  }

  .metric-label {
    font-size: 10px;
    color: var(--fs-text-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  .metric-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--fs-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .metric-value.highlight {
    color: var(--fs-yellow);
  }

  /* ==================== 施救单位卡片 ==================== */
  .cards-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--fs-bg-inner-light);
    border: 0.5px solid var(--fs-border-medium);
    border-radius: 8px;
    padding: 6px;
    box-sizing: border-box;
  }

  .cards-scroll {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rescue-card {
    background: var(--fs-bg-card);
    border: 0.5px solid var(--fs-border);
    border-radius: 10px;
    padding: 10px 12px;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .rescue-card:hover {
    background: var(--fs-bg-card-hover);
    border-color: var(--fs-border-strong);
  }

  .rescue-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .rescue-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--fs-bg-red);
    border: 0.5px solid rgba(245, 101, 101, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fs-red);
    font-size: 16px;
    flex-shrink: 0;
  }

  .rescue-name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--fs-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rescue-card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .rescue-info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid var(--fs-border-light);
  }

  .rescue-info-row:last-child {
    border-bottom: none;
  }

  .rescue-info-label {
    font-size: 11px;
    color: var(--fs-text-muted);
    width: 56px;
    flex-shrink: 0;
  }

  .rescue-info-value {
    font-size: 12px;
    color: var(--fs-text-secondary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rescue-info-value.tel {
    color: var(--fs-accent);
  }

  .rescue-info-value.region {
    color: var(--fs-purple);
    font-size: 11px;
  }

  /* ==================== 中心对口联络机制卡片 ==================== */
  .liaison-card {
    background: var(--fs-bg-card);
    border: 0.5px solid var(--fs-border);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
  }

  .liaison-card:hover {
    background: var(--fs-bg-card-hover);
    border-color: var(--fs-border-strong);
  }

  .liaison-card-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .liaison-index {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--fs-bg-purple);
    border: 0.5px solid rgba(139, 92, 246, 0.4);
    color: var(--fs-purple);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .liaison-group {
    font-size: 11px;
    color: var(--fs-text-muted);
    max-width: 60px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .liaison-card-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .liaison-person {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .liaison-role-tag {
    font-size: 10px;
    color: var(--fs-text-muted);
    background: var(--fs-bg-inner-light);
    border: 0.5px solid var(--fs-border);
    padding: 1px 6px;
    border-radius: 9999px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .liaison-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--fs-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ==================== 滚动条统一 ==================== */
  .report-cards::-webkit-scrollbar,
  .cards-list::-webkit-scrollbar {
    width: 4px;
  }
  .report-cards::-webkit-scrollbar-thumb,
  .cards-list::-webkit-scrollbar-thumb {
    background: var(--fs-scrollbar-thumb);
    border-radius: 10px;
  }
  .report-cards::-webkit-scrollbar-track,
  .cards-list::-webkit-scrollbar-track {
    background: transparent;
  }

  /* ==================== 预警等级颜色 ==================== */
  .rank-red    { color: var(--fs-red)       !important; font-weight: 700; }
  .rank-orange { color: var(--fs-orange)    !important; font-weight: 700; }
  .rank-yellow { color: var(--fs-yellow)    !important; font-weight: 600; }
  .rank-blue   { color: var(--fs-blue-badge) !important; font-weight: 500; }
  .rank-default{ color: var(--fs-success) !important; }
</style>

<style>
  /* ==================== 汛期驾驶舱主题变量 ====================
   利用项目已有的 html.dark 主题切换机制，
   在此处定义亮/暗主题对应的 CSS 变量，非 scoped，全局生效 */

  :root {
    /* 背景色 */
    --fs-bg-panel: rgba(17, 17, 17, 0.7);
    --fs-bg-card: rgba(31, 41, 55, 0.6);
    --fs-bg-card-hover: rgba(31, 41, 55, 0.85);
    --fs-bg-inner: rgba(31, 41, 55, 0.7);
    --fs-bg-input: rgba(31, 41, 55, 0.6);
    --fs-bg-inner-light: rgba(31, 41, 55, 0.4);
    --fs-bg-blue: rgba(59, 130, 246, 0.2);
    --fs-bg-purple: rgba(139, 92, 246, 0.2);
    --fs-bg-red: rgba(245, 101, 101, 0.15);

    /* 文字色 */
    --fs-text-primary: #f3f4f6;
    --fs-text-secondary: #e5e7eb;
    --fs-text-muted: #9ca3af;
    --fs-text-empty: #6b7280;

    /* 边框色 */
    --fs-border: rgba(156, 163, 175, 0.12);
    --fs-border-light: rgba(156, 163, 175, 0.1);
    --fs-border-medium: rgba(156, 163, 175, 0.18);
    --fs-border-strong: rgba(156, 163, 175, 0.25);

    /* 强调色 */
    --fs-accent: #60a5fa;
    --fs-accent-bg: rgba(96, 165, 250, 0.12);
    --fs-accent-border: rgba(96, 165, 250, 0.3);
    --fs-accent-glow: rgba(96, 165, 250, 0.25);
    --fs-yellow: #fbbf24;
    --fs-green: #34d399;
    --fs-red: #f87171;
    --fs-purple: #a78bfa;
    --fs-orange: #ff6b35;
    --fs-blue-badge: #60a5fa;
    --fs-bg-badge: rgba(96, 165, 250, 0.12);
    --fs-border-badge: rgba(96, 165, 250, 0.3);

    /* 滚动条 */
    --fs-scrollbar-thumb: #4b5563;
    --fs-scrollbar-track: transparent;

    /* 地图工具栏 */
    --fs-toolbar-bg: rgba(17, 24, 39, 0.88);
    --fs-toolbar-border: rgba(156, 163, 175, 0.2);
    --fs-toolbar-btn-bg: rgba(55, 65, 81, 0.6);
    --fs-toolbar-btn-border: rgba(156, 163, 175, 0.15);
    --fs-toolbar-btn-color: #9ca3af;
    --fs-toolbar-btn-hover-bg: rgba(75, 85, 99, 0.8);
    --fs-toolbar-btn-hover-border: rgba(156, 163, 175, 0.3);
    --fs-toolbar-btn-hover-color: #f3f4f6;

    /* 标题渐变 */
    --fs-title-bg: linear-gradient(
      90deg,
      rgba(31, 41, 55, 0.95),
      rgba(17, 24, 39, 0.95),
      rgba(31, 41, 55, 0.95)
    );
  }

  /* 暗色主题：覆盖为当前值（与页面默认深色一致） */
  html.dark {
    --fs-bg-panel: rgba(17, 17, 17, 0.7);
    --fs-bg-card: rgba(31, 41, 55, 0.6);
    --fs-bg-card-hover: rgba(31, 41, 55, 0.85);
    --fs-bg-inner: rgba(31, 41, 55, 0.7);
    --fs-bg-input: rgba(31, 41, 55, 0.6);
    --fs-bg-inner-light: rgba(31, 41, 55, 0.4);
    --fs-bg-blue: rgba(59, 130, 246, 0.2);
    --fs-bg-purple: rgba(139, 92, 246, 0.2);
    --fs-bg-red: rgba(245, 101, 101, 0.15);
    --fs-text-primary: #f3f4f6;
    --fs-text-secondary: #e5e7eb;
    --fs-text-muted: #9ca3af;
    --fs-text-empty: #6b7280;
    --fs-border: rgba(156, 163, 175, 0.12);
    --fs-border-light: rgba(156, 163, 175, 0.1);
    --fs-border-medium: rgba(156, 163, 175, 0.18);
    --fs-border-strong: rgba(156, 163, 175, 0.25);
    --fs-accent: #60a5fa;
    --fs-accent-bg: rgba(96, 165, 250, 0.12);
    --fs-accent-border: rgba(96, 165, 250, 0.3);
    --fs-accent-glow: rgba(96, 165, 250, 0.25);
    --fs-yellow: #fbbf24;
    --fs-green: #34d399;
    --fs-red: #f87171;
    --fs-purple: #a78bfa;
    --fs-orange: #ff6b35;
    --fs-blue-badge: #60a5fa;
    --fs-bg-badge: rgba(96, 165, 250, 0.12);
    --fs-border-badge: rgba(96, 165, 250, 0.3);
    --fs-scrollbar-thumb: #4b5563;
    --fs-scrollbar-track: transparent;
    --fs-toolbar-bg: rgba(17, 24, 39, 0.88);
    --fs-toolbar-border: rgba(156, 163, 175, 0.2);
    --fs-toolbar-btn-bg: rgba(55, 65, 81, 0.6);
    --fs-toolbar-btn-border: rgba(156, 163, 175, 0.15);
    --fs-toolbar-btn-color: #9ca3af;
    --fs-toolbar-btn-hover-bg: rgba(75, 85, 99, 0.8);
    --fs-toolbar-btn-hover-border: rgba(156, 163, 175, 0.3);
    --fs-toolbar-btn-hover-color: #f3f4f6;
    --fs-title-bg: linear-gradient(
      90deg,
      rgba(31, 41, 55, 0.95),
      rgba(17, 24, 39, 0.95),
      rgba(31, 41, 55, 0.95)
    );
  }

  /* 亮色主题 */
  html:not(.dark) {
    --fs-bg-panel: rgba(249, 250, 251, 0.85);
    --fs-bg-card: rgba(255, 255, 255, 0.85);
    --fs-bg-card-hover: rgba(243, 245, 249, 0.95);
    --fs-bg-inner: rgba(255, 255, 255, 0.8);
    --fs-bg-input: rgba(243, 245, 249, 0.8);
    --fs-bg-inner-light: rgba(249, 250, 251, 0.6);
    --fs-bg-blue: rgba(59, 130, 246, 0.08);
    --fs-bg-purple: rgba(139, 92, 246, 0.08);
    --fs-bg-red: rgba(245, 101, 101, 0.08);
    --fs-text-primary: #1f2937;
    --fs-text-secondary: #374151;
    --fs-text-muted: #6b7280;
    --fs-text-empty: #9ca3af;
    --fs-border: rgba(0, 0, 0, 0.08);
    --fs-border-light: rgba(0, 0, 0, 0.05);
    --fs-border-medium: rgba(0, 0, 0, 0.1);
    --fs-border-strong: rgba(0, 0, 0, 0.15);
    --fs-accent: #3b82f6;
    --fs-accent-bg: rgba(59, 130, 246, 0.08);
    --fs-accent-border: rgba(59, 130, 246, 0.25);
    --fs-accent-glow: rgba(59, 130, 246, 0.15);
    --fs-yellow: #d97706;
    --fs-green: #059669;
    --fs-red: #dc2626;
    --fs-purple: #7c3aed;
    --fs-orange: #ea580c;
    --fs-blue-badge: #3b82f6;
    --fs-bg-badge: rgba(59, 130, 246, 0.1);
    --fs-border-badge: rgba(59, 130, 246, 0.25);
    --fs-scrollbar-thumb: #d1d5db;
    --fs-scrollbar-track: transparent;
    --fs-toolbar-bg: rgba(255, 255, 255, 0.88);
    --fs-toolbar-border: rgba(0, 0, 0, 0.08);
    --fs-toolbar-btn-bg: rgba(255, 255, 255, 0.8);
    --fs-toolbar-btn-border: rgba(0, 0, 0, 0.08);
    --fs-toolbar-btn-color: #6b7280;
    --fs-toolbar-btn-hover-bg: rgba(59, 130, 246, 0.1);
    --fs-toolbar-btn-hover-border: rgba(59, 130, 246, 0.25);
    --fs-toolbar-btn-hover-color: #3b82f6;
    --fs-title-bg: linear-gradient(
      90deg,
      rgba(219, 228, 239, 0.95),
      rgba(243, 245, 249, 0.95),
      rgba(219, 228, 239, 0.95)
    );
  }
</style>
