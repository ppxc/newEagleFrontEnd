<template>
  <div class="heat-map-page">
    <div class="map-container-box">
      <!-- 统计卡片部分 - 放在地图容器上方 -->
      <div class="controls-and-cards-container">
        <!-- 统计卡片部分 - 与控制按钮在同一样式容器内 -->
        <div class="stats-cards-top">
          <ElRow :gutter="10">
            <ElCol
              :xs="24"
              :sm="12"
              :md="6"
              v-for="card in statsCards"
              :key="card.id"
            >
              <div class="card-wrapper">
                <div
                  class="art-card flex-c px-4 transition-transform duration-200 hover:-translate-y-0.5"
                  :class="card.boxStyle || ''"
                >
                  <div
                    v-if="card.icon"
                    class="mr-4 size-11 flex-cc rounded-lg text-xl text-white"
                    :class="card.iconStyle"
                  >
                    <!-- 使用 remixicon 字体图标（替换原 PNG 图标） -->
                    <ArtSvgIcon :icon="card.icon"></ArtSvgIcon>
                  </div>
                  <div class="flex-1">
                    <ArtCountTo
                      class="m-0 text-2xl font-medium"
                      v-if="card.count !== undefined"
                      :target="card.count"
                      :duration="2000"
                      :decimals="0"
                      :separator="' ,'"
                    />
                    <p class="mt-1 text-sm text-g-500 opacity-90" v-if="card.description">{{
                      card.description
                    }}</p>
                  </div>
                  <div v-if="card.showArrow">
                    <ArtSvgIcon icon="ri:arrow-right-s-line" class="text-xl text-g-500" />
                  </div>
                </div>
              </div>
            </ElCol>
            <!-- 控制按钮部分 -->
            <ElCol :xs="24" :sm="12" :md="6">
              <div xs="24" :sm="12" :md="6" class="search-date-row">
                <el-date-picker
                  v-model="selectedDate"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  class="date-picker"
                />
                <div class="flex-c">
                  <el-button type="primary" @click="fetchHeatMap">筛选</el-button>
                </div>
              </div>
            </ElCol>
          </ElRow>
        </div>
      </div>
      <div id="heat-map-container" class="map-container">
        <!-- 行政区划按钮（改用字体图标） -->
        <div
          class="district-img-btn"
          :class="{ active: isDistrictsVisible }"
          @click="toggleDistricts"
          title="显示/隐藏行政区划"
        >
          <ArtSvgIcon icon="ri:grid-line" />
        </div>
        <!-- 异常高亮开关 -->
        <div
          class="district-img-btn"
          :class="{ active: showAbnormal }"
          @click="showAbnormal = !showAbnormal"
          title="显示/隐藏异常高亮点（count > μ+2σ）"
          style="top: 50px;"
        >
          <ArtSvgIcon icon="ri:alert-line" />
        </div>
        <!-- 异常点详情面板（点击 marker 时显示，与汛期驾驶舱停车场面板同款） -->
        <div v-if="abnormalSelected" class="abnormal-detail-panel">
          <div class="abnormal-detail-header">
            <span class="abnormal-detail-title">异常高值区域</span>
            <div class="abnormal-detail-close" title="关闭" @click.stop="abnormalSelected = null">✕</div>
          </div>
          <div class="abnormal-detail-body">
            <div class="detail-row">
              <span class="detail-label">经度</span>
              <span class="detail-value">{{ abnormalSelected.lng.toFixed(4) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">纬度</span>
              <span class="detail-value">{{ abnormalSelected.lat.toFixed(4) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">该地点案件量</span>
              <span class="detail-value text-red-500 font-bold">{{ abnormalSelected.count }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">阈值</span>
              <span class="detail-value">{{ abnormalSelected.threshold }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="loading" class="loading">地图加载中...</div>
      <div v-if="!loading && progressText" class="loading progress-indicator">
        {{ progressText }}
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
  import { useSettingStore } from '@stores/modules/setting'
  import { AdministrativeRegionManager } from '../../api/administrative_regionmanager'
  import { ElRow, ElCol } from 'element-plus'
  import { hotmap } from '../../api'
  import { MapLoader } from '../../api/map_loader'

  // import LogService from '@/services/logServices'
  // const VITE_API_PROXY_PORT_URL = import.meta.env.VITE_API_PROXY_PORT_URL
  // 全局类型声明
  declare global {
    interface Window {
      TMap: any
      heatData: any[]
      districtLabelLayer?: any
    }
  }

  // 地图实例
  let map: any = null
  let heat: any = null
  let administrativeRegionManager: AdministrativeRegionManager | null = null
  let abnormalMarkerLayer: any = null
  let abnormalInfoWindow: any = null

  // SVG data URI 生成工具（与 user-map.vue 保持一致）
  const toSvgDataUri = (svg: string, color: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      svg
        .replace(/\n\s*/g, ' ')
        .replace(/<svg /, `<svg style="color:${color}" `)
    )}`

  // 警告图标：红色三角中间白色感叹号
  const warningIcon = toSvgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <polygon points="16,2 30,28 2,28" fill="#ff4d4f" stroke="#cc0000" stroke-width="1"/>
      <text x="16" y="24" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff" font-family="Arial">!</text>
    </svg>`,
    '#fff'
  )

  // 状态
  const isDistrictsVisible = computed(() => administrativeRegionManager?.showingDistricts.value ?? false)
  const loading = ref(true)
  const error = ref('')
  // 异常高亮点开关
  const showAbnormal = ref(true)
  // 当前选中的异常点
  const abnormalSelected = ref<{ lng: number; lat: number; count: number; threshold: string } | null>(null)

  // 主题色：跟随系统设置切换
  const settingStore = useSettingStore()
  const isDark = computed(() => settingStore.isDark)
  const infoWindowBg = computed(() => isDark.value ? '#1f2937' : '#ffffff')
  const infoWindowText = computed(() => isDark.value ? '#e5e7eb' : '#374151')
  const infoWindowLabel = computed(() => isDark.value ? '#9ca3af' : '#6b7280')
  const infoWindowAccent = computed(() => '#ff4d4f')

  // 进度追踪
  const progressPercent = ref(0)
  const progressText = ref('')
  let progressTimer: ReturnType<typeof setInterval> | null = null
  // 上一次轮询时缓存中的数据量；用于判断后端是否合并了新批次
  let lastCachedCount = -1
  // 标记刚刚点击了 marker,用于阻止同一 tick 内 map.on('click') 关闭详情
  let suppressMapClick = false

  // 统计卡片默认数据（使用 remixicon 字体图标，不再依赖图片资源）
  const statsCards = ref([
    {
      id: 1,
      title: '新增立案',
      count: 0,
      description: '当日新增立案量',
      icon: 'ri:file-add-line',
      iconStyle: 'bg-primary',
      boxStyle: 'h-22',
      textColor: 'var(--theme-color)',
      showArrow: false
    },
    {
      id: 2,
      title: '已决案件',
      count: 0,
      description: '当日已决量',
      icon: 'ri:checkbox-circle-line',
      iconStyle: 'bg-success',
      boxStyle: 'h-22',
      textColor: 'var(--theme-color)',
      showArrow: false
    },
    {
      id: 3,
      title: '未决案件',
      count: 0,
      description: '截止统计日期未决量',
      icon: 'ri:hourglass-line',
      iconStyle: 'bg-warning',
      boxStyle: 'h-22',
      textColor: 'var(--theme-color)',
      showArrow: false
    }
  ])

  // ==================== 获取统计卡片数据 ====================
  const fetchStatsCardsData = async () => {
    try {
      const params = selectedDate.value ? { date: selectedDate.value } : {}

      // console.log('请求统计数据URL:', `${VITE_API_PROXY_PORT_URL}api/statsCardsData`, params)  // 调试信息

      const data = await hotmap.axiosRequestStatsCardsData(params)
      // console.log('后端返回数据:', data)  // 调试信息

      // 空值保护：后端可能返回 null / undefined / 空数组
      // （例如当天没有统计数据、或者 axios 解包失败）
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(
          '[fetchStatsCardsData] 接口返回空数据，保持卡片默认显示。date=',
          params.date
        )
        return
      }

      // 更新统计卡片数据
      let matchedCount = 0
      statsCards.value.forEach((card) => {
        const cardData = data.find((item: any) => item.title === card.title)
        // console.log(`匹配卡片 ${card.title}:`, cardData)  // 调试信息
        if (cardData) {
          // count 可能为 null/undefined，默认 0；description 同理（缺则保留前端默认值）
          card.count = cardData.count ?? 0
          if (cardData.description != null) {
            card.description = cardData.description
          }
          matchedCount++
          // console.log(`更新卡片 ${card.title}: count=${card.count}, description=${card.description}`)  // 调试信息
        } else {
          // console.log(`未找到匹配的卡片数据: ${card.title}`)  // 调试信息
        }
      })

      // 全部 3 张卡片都没匹配上时，提示后端字段名可能已变更
      if (matchedCount === 0) {
        console.warn(
          '[fetchStatsCardsData] 返回数据与前端 title 字段全部不匹配，请检查后端 StatsCardData.title 命名。原始数据:',
          data
        )
      }
    } catch (err) {
      console.error('获取统计卡片数据失败:', err)
    }
  }

  // 地图加载器实例
  const mapLoader = MapLoader.getInstance()

  // ==================== 动态加载官方热力数据（你要的Promise方式） ====================
  // 选择日期
  const today = new Date()
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate() - 1).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const selectedDate = ref<string | null>(formatDate(today))

  //   const loadHeatDataScript = () => {
  //     return new Promise((resolve, reject) => {
  //       const script = document.createElement('script')
  //       script.src = `${VITE_TENCENT_MAP_WSAPI_URL}web/lbs/visualizationApi/demo/data/heat.js`
  //       script.onload = resolve
  //       script.onerror = reject
  //       document.body.appendChild(script)
  //     })
  //   }
  const fetchHeatMap = async () => {
    try {
      // 清除已有的进度轮询
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
      progressText.value = ''
      progressPercent.value = 0

      const params = selectedDate.value ? { date: selectedDate.value } : {}

      const data = await hotmap.axiosRequestHeatMapData(params)
      // await LogService.hotmapLog('筛选并查看', params)

      window.heatData = data

      // 同时获取统计卡片数据
      await fetchStatsCardsData()

      // 启动进度轮询，等待异步地理编码完成后统一设置热力图数据
      // 不在此时调用 heat.setData()，避免与轮询完成后的 setData 重复触发动画
      startProgressPolling()
    } catch (err: any) {
      error.value = '热力图加载失败：' + err.message
      loading.value = false
    }
  }

  /**
   * 轮询后端进度，按批次刷新热力图：
   * - complete=true 时拉取最终完整数据；
   * - processing=true 时，若缓存有新增（cachedCount 增长），立即拉取最新缓存并渲染，
   *   这样用户能在第一批 50 条解析完成时立刻看到热力点，无需等到 100% 完成。
   */
  const pollProgress = async (params: Record<string, string | undefined>) => {
    try {
      const res: any = await hotmap.axiosRequestHotmapProgress(params)

      if (res.complete) {
        progressPercent.value = 100
        progressText.value = ''
        if (progressTimer) {
          clearInterval(progressTimer)
          progressTimer = null
        }
        // 重新获取完整数据
        const data: any[] = (await hotmap.axiosRequestHeatMapData(params)) as any[]
        window.heatData = data
        if (heat) {
          heat.setData(window.heatData)
          renderAbnormalMarkers(window.heatData)
        }
        lastCachedCount = res.cachedCount ?? data.length
      } else if (res.processing) {
        progressPercent.value = res.progress || 0
        progressText.value = `正在解析地址，已完成 ${progressPercent.value}%`

        // 当后端缓存出现新批次时（每合并 50 条触发一次），立即拉取并刷新地图
        const currentCachedCount = res.cachedCount ?? 0
        if (heat && currentCachedCount !== lastCachedCount) {
          lastCachedCount = currentCachedCount
          const data: any[] = (await hotmap.axiosRequestHeatMapData(params)) as any[]
          window.heatData = data
          heat.setData(window.heatData)
          renderAbnormalMarkers(window.heatData)
        }
      } else {
        // 无需异步处理，使用 fetchHeatMap 中已获取的数据渲染
        if (heat && window.heatData) {
          heat.setData(window.heatData)
          renderAbnormalMarkers(window.heatData)
        }
        if (progressTimer) {
          clearInterval(progressTimer)
          progressTimer = null
        }
      }
    } catch (err) {
      console.error('获取进度失败:', err)
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    }
  }

  const startProgressPolling = () => {
    const params = selectedDate.value ? { date: selectedDate.value } : {}

    if (progressTimer) clearInterval(progressTimer)
    // 重置上次缓存量计数，避免上一个日期的残留值影响新日期的首轮判断
    lastCachedCount = -1

    // 立即执行首次检查，避免 2 秒空白等待
    pollProgress(params)

    progressTimer = setInterval(() => pollProgress(params), 2000)
  }

  // ==================== 行政区划功能 ====================
  const toggleDistricts = () => {
    if (administrativeRegionManager) {
      administrativeRegionManager.toggleDistricts()
    }
  }

  const showDistricts = async () => {
    if (administrativeRegionManager) {
      await administrativeRegionManager.showDistricts()
    }
  }

  const hideDistricts = async () => {
    if (administrativeRegionManager) {
      await administrativeRegionManager.hideDistricts()
    }
  }

  // ==================== 初始化地图 ====================
  const initMap = async () => {
    try {
      // 使用MapLoader加载地图API
      await mapLoader.loadMapApi()

      const container = document.getElementById('heat-map-container')
      if (!container) return

      const center = new window.TMap.LatLng(30.6799, 104.0571)

      // 创建地图
      map = new window.TMap.Map(container, {
        zoom: 9.5,
        pitch: 45,
        center: center,
        mapStyleId: 'style1' // 根据HTML文件修改

        // baseMap: {
        //   type: 'vector',
        //   features: [
        //     'base',
        //     'building3d',
        //     'arrow',//箭头
        //     'label'//标签
        //   ]
        // }
      })

      // 初始化行政区划管理器
      administrativeRegionManager = new AdministrativeRegionManager(map)

      // 点击地图空白处关闭异常高值详情
      map.on('click', () => {
        if (suppressMapClick) return
        abnormalSelected.value = null
      })

      // 先初始化热力图，再加载数据
      initHeatMap()
      // fetchHeatMap() 内部已经 await fetchStatsCardsData()，无需在此重复调用
      await fetchHeatMap()

      // 默认显示行政区划
      await showDistricts()

      loading.value = false
    } catch (err: any) {
      error.value = '地图加载失败：' + err.message
      loading.value = false
    }
  }

  // ==================== 异常高亮点渲染 ====================
  const renderAbnormalMarkers = (data: any[]) => {
    console.log('[renderAbnormalMarkers] 调用', {
      dataLen: data?.length,
      showAbnormal: showAbnormal.value,
      abnormalCount: data?.filter((d: any) => d.abnormal).length,
      mapReady: !!map
    })

    if (abnormalMarkerLayer) {
      abnormalMarkerLayer.setMap(null)
      abnormalMarkerLayer = null
    }
    if (abnormalInfoWindow) {
      abnormalInfoWindow.setMap(null)
      abnormalInfoWindow = null
    }
    if (!showAbnormal.value) {
      console.log('[renderAbnormalMarkers] 跳过：showAbnormal=false')
      return
    }

    const abnormalData = data.filter((d: any) => d.abnormal)
    console.log('[renderAbnormalMarkers] 异常数据点:', abnormalData)
    if (!abnormalData.length || !map) {
      console.log('[renderAbnormalMarkers] 跳过：数据为空或map未就绪', { abnormalLen: abnormalData.length, mapReady: !!map })
      return
    }

    abnormalMarkerLayer = new window.TMap.MultiMarker({
      id: 'abnormal-layer',
      map,
      styles: {
        abnormal: new window.TMap.MarkerStyle({
          width: 32,
          height: 32,
          anchor: { x: 16, y: 32 },
          src: warningIcon
        })
      },
      geometries: abnormalData.map((d: any, idx: number) => ({
        id: `abnormal-${idx}`,
        styleId: 'abnormal',
        position: new window.TMap.LatLng(d.lat, d.lng),
        properties: { count: d.count }
      }))
    })

    abnormalMarkerLayer.on('click', (e: any) => {
      e?.originalEvent?.stopPropagation?.()
      e?.stopPropagation?.()
      suppressMapClick = true
      const { lat, lng } = e.geometry.position
      const count = e.geometry.properties?.count ?? 0
      abnormalSelected.value = { lng, lat, count, threshold: '> μ+2σ' }
      setTimeout(() => { suppressMapClick = false }, 0)
    })
  }

  // 切换异常高亮显示/隐藏
  const toggleAbnormalMarkers = (show: boolean) => {
    if (abnormalMarkerLayer) {
      abnormalMarkerLayer.setMap(show ? map : null)
    }
  }

  // showAbnormal 变化时：开关图层可见性；如果图层还没创建则立即用当前数据渲染
  watch(showAbnormal, (val) => {
    if (abnormalMarkerLayer) {
      abnormalMarkerLayer.setMap(val ? map : null)
    } else if (val && window.heatData?.length) {
      renderAbnormalMarkers(window.heatData)
    }
  })

  // 监听热力图数据变化，数据更新时重新渲染异常点标记
  watch(
    () => window.heatData,
    (newData) => {
      if (newData?.length && showAbnormal.value) {
        renderAbnormalMarkers(newData)
      }
    },
    { deep: true }
  )

  // ==================== 初始化3D热力图 ====================
  const initHeatMap = () => {
    heat = new window.TMap.visualization.Heat({
      max: 3, // 热力最强阈值
      min: 0, // 热力最弱阈值
      height: 80, // 峰值高度
      radius: 30, // 最大辐射半径
      transitAnimation: {
        duration: 3000 //动画时长
      }
    }).addTo(map)
    // 注意：数据将在 fetchHeatMap() 中设置，此处不设置数据
  }

  // ==================== 生命周期 ====================
  onMounted(() => {
    initMap()
  })

  onBeforeUnmount(() => {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    if (abnormalMarkerLayer) {
      abnormalMarkerLayer.setMap(null)
      abnormalMarkerLayer = null
    }
    if (abnormalInfoWindow) {
      abnormalInfoWindow.setMap(null)
      abnormalInfoWindow = null
    }
    if (map) {
      map.destroy()
      map = null
      heat = null
    }
    // 清理地图加载器（可选）
    // mapLoader.reset()
  })
</script>

<style scoped>
  /* ==================== 主容器样式 ==================== */
  .heat-map-page {
    width: 100%;
    height: 100%;
    padding: 10px;
    /* background: #111827; */
  }

  .map-container-box {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .map-container {
    width: 100%;
    height: 88%;
    border-radius: 8px;
    position: relative;
  }

  .controls-and-cards-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    /* 控件和卡片之间的间距 */
    margin-bottom: 10px;
    /* 卡片与地图的距离，与页面顶部内边距 10px 保持一致 */
  }

  .search-date-row {
    display: flex;
    gap: 15px;
    align-items: center;
    height: 88px;
    /* 与卡片高度一致 */
    padding: 15px 15px;
    /* 调整内边距以适应高度 */
    background: var(--default-box-color, rgba(17, 17, 17, 0.9));
    border: 0.5px solid;
    border-radius: 16px;
    /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); */
    pointer-events: auto;
    /* margin-left: 5px; */
    min-width: 24%;
  }

  /* 深色主题下的样式 */
  .dark .search-date-row {
    border-color: rgba(0, 0, 0, 0.8); /* 深色主题边框 */
  }

  /* 浅色主题下的样式 */
  :not(.dark) .search-date-row {
    border-color: rgba(156, 163, 175, 0.2); /* 浅色主题边框 */
  }

  /* 调整日期选择器和按钮的高度 */
  .search-date-row :deep(.el-date-editor.el-input),
  .search-date-row :deep(.el-date-editor.el-input__wrapper) {
    height: 60px;
    font-size: 18px;
  }

  /* 日期选择器向右扩展填满可用空间，右边框贴近筛选按钮 */
  .search-date-row .date-picker {
    flex: 1;
  }

  .search-date-row :deep(.el-button--default) {
    height: 60px !important;
    padding: 8px 16px; /* 调整按钮内边距以适应高度 */
    font-size: 18px;
  }

  .stats-cards-top {
    margin-bottom: 0;
    /* 已经通过gap控制间距 */
  }

  .hot-map-title {
    position: relative;
    width: auto;
    font-size: 18px;
    font-weight: 600;
    color: #f3f4f6;
    padding-left: 10px;
    padding-top: 5px;
    padding-bottom: 5px;
    margin-bottom: 10px;
    white-space: nowrap;
    background: rgba(31, 41, 55, 0.9);
    border-radius: 8px;
  }

  .district-img-btn {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 9999;
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

  .loading,
  .error {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
  }

  .progress-indicator {
    width: 200px;
    height: 35px;
    background: rgba(31, 41, 55, 0.8);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid #374151;
    font-size: 14px;
    color: #e5e7eb;
  }

  .stats-cards-top {
    margin-bottom: 0;
    /* 卡片与地图的间距统一由 .card-wrapper 的 margin-bottom 控制 */
  }

  .card-wrapper {
    height: 70px;
    /* 减小高度 */
    min-width: 200px;
    margin-bottom: 8px;
    /* 添加底部间距 */
  }

  .custom-height {
    height: 100px;
  }

  /* 响应式调整 */
  @media (max-width: 768px) {
    .card-wrapper {
      height: 65px;
      min-width: 180px;
    }
  }

  @media (max-width: 480px) {
    .card-wrapper {
      height: 60px;
      min-width: 160px;
    }

    .stats-cards-top .art-card {
      padding-left: 4px;
      padding-right: 4px;
    }
  }
</style>

<!-- 异常点详情面板样式（与汛期驾驶舱停车场面板同款） -->
<style scoped>
  .abnormal-detail-panel {
    position: absolute;
    top: 100px;
    left: 12px;
    width: 280px;
    background: var(--fs-bg-panel, rgba(255,255,255,0.97));
    border: 1px solid var(--fs-border-color, rgba(0,0,0,0.08));
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 1000;
    pointer-events: auto;
    animation: abnormal-detail-in 0.2s ease-out;
  }
  @keyframes abnormal-detail-in {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .abnormal-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--fs-border-color, rgba(0,0,0,0.08));
  }
  .abnormal-detail-title {
    font-size: 14px;
    font-weight: 600;
    color: #ff4d4f;
  }
  .abnormal-detail-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 14px;
    color: var(--fs-text-secondary, #9ca3af);
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .abnormal-detail-close:hover {
    background: rgba(0,0,0,0.06);
    color: #ef4444;
  }
  .abnormal-detail-body {
    padding: 10px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    line-height: 1.5;
  }
  .detail-label {
    color: var(--fs-text-secondary, #6b7280);
    flex-shrink: 0;
  }
  .detail-value {
    color: var(--fs-text-primary, #374151);
    font-weight: 500;
    text-align: right;
    word-break: break-all;
  }
</style>

<!-- 全局 CSS 变量：汛期驾驶舱工具栏按钮同款 -->
<style>
  :root {
    --fs-toolbar-btn-bg: rgba(55, 65, 81, 0.6);
    --fs-toolbar-btn-border: rgba(156, 163, 175, 0.15);
    --fs-toolbar-btn-color: #9ca3af;
    --fs-toolbar-btn-hover-bg: rgba(75, 85, 99, 0.8);
    --fs-toolbar-btn-hover-border: rgba(156, 163, 175, 0.3);
    --fs-toolbar-btn-hover-color: #f3f4f6;
    --fs-bg-blue: rgba(59, 130, 246, 0.2);
    --fs-accent: #60a5fa;
    --fs-accent-border: rgba(96, 165, 250, 0.3);
    --fs-accent-glow: rgba(96, 165, 250, 0.25);
    --fs-bg-panel: rgba(17, 17, 17, 0.85);
    --fs-border-color: rgba(255, 255, 255, 0.1);
    --fs-text-primary: #e5e7eb;
    --fs-text-secondary: #9ca3af;
  }
  html.dark {
    --fs-toolbar-btn-bg: rgba(55, 65, 81, 0.6);
    --fs-toolbar-btn-border: rgba(156, 163, 175, 0.15);
    --fs-toolbar-btn-color: #9ca3af;
    --fs-toolbar-btn-hover-bg: rgba(75, 85, 99, 0.8);
    --fs-toolbar-btn-hover-border: rgba(156, 163, 175, 0.3);
    --fs-toolbar-btn-hover-color: #f3f4f6;
    --fs-bg-blue: rgba(59, 130, 246, 0.2);
    --fs-accent: #60a5fa;
    --fs-accent-border: rgba(96, 165, 250, 0.3);
    --fs-accent-glow: rgba(96, 165, 250, 0.25);
    --fs-bg-panel: rgba(17, 17, 17, 0.85);
    --fs-border-color: rgba(255, 255, 255, 0.1);
    --fs-text-primary: #e5e7eb;
    --fs-text-secondary: #9ca3af;
  }
  html:not(.dark) {
    --fs-toolbar-btn-bg: rgba(255, 255, 255, 0.8);
    --fs-toolbar-btn-border: rgba(0, 0, 0, 0.08);
    --fs-toolbar-btn-color: #6b7280;
    --fs-toolbar-btn-hover-bg: rgba(59, 130, 246, 0.1);
    --fs-toolbar-btn-hover-border: rgba(59, 130, 246, 0.25);
    --fs-toolbar-btn-hover-color: #3b82f6;
    --fs-bg-blue: rgba(59, 130, 246, 0.08);
    --fs-accent: #3b82f6;
    --fs-accent-border: rgba(59, 130, 246, 0.25);
    --fs-accent-glow: rgba(59, 130, 246, 0.15);
    --fs-bg-panel: rgba(255, 255, 255, 0.97);
    --fs-border-color: rgba(0, 0, 0, 0.08);
    --fs-text-primary: #374151;
    --fs-text-secondary: #6b7280;
  }
</style>

<!-- <style scoped>
.heat-map-page {
  width: 100%;
  height: 100%;
  /* background: #111827; */

}

.map-container-box {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  position: relative;
}

.search-date-row {
  display: flex;
  gap: 8px;
  align-items: center;
  position: absolute;
  left: 20px;
  top: 20px;
  z-index: 9999;
  padding: 10px;
  background: rgba(31, 41, 55, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.search-date-row .el-date-picker {
  width: auto;
  min-width: 80px;
}

.search-date-row .el-button {
  pointer-events: auto;
}

.hot-map-title {
  position: relative;
  width: auto;
  font-size: 18px;
  font-weight: 600;
  color: #f3f4f6;
  padding-left:10px;
  padding-top:5px;
  padding-bottom: 5px;
  margin-bottom: 10px;
  white-space: nowrap;
  background: rgba(31, 41, 55, 0.9);
  border-radius: 8px;

}

.loading,
.error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
}
</style> -->
