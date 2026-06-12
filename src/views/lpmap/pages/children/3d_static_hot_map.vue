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
  import { AdministrativeRegionManager } from '../../api/AdministrativeRegionmanager'
  import { ElRow, ElCol } from 'element-plus'
  import { hotmap } from '../../api'
  import { MapLoader } from '../../api/mapLoader'

  // import LogService from '@/services/logServices'
  // const VITE_API_PROXY_PORT_URL = import.meta.env.VITE_API_PROXY_PORT_URL
  // 全局类型声明
  declare global {
    interface Window {
      TMap: anyW
      heatData: any[]
      districtLabelLayer?: any
    }
  }

  // 地图实例
  let map: any = null
  let heat: any = null
  let administrativeRegionManager: AdministrativeRegionManager | null = null

  // 状态
  const isDistrictsVisible = computed(() => administrativeRegionManager?.showingDistricts.value ?? false)
  const loading = ref(true)
  const error = ref('')

  // 进度追踪
  const progressPercent = ref(0)
  const progressText = ref('')
  let progressTimer: ReturnType<typeof setInterval> | null = null
  // 上一次轮询时缓存中的数据量；用于判断后端是否合并了新批次
  let lastCachedCount = -1

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
        }
      } else {
        // 无需异步处理，使用 fetchHeatMap 中已获取的数据渲染
        if (heat && window.heatData) {
          heat.setData(window.heatData)
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
