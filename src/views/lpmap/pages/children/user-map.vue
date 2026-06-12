<template>
  <div class="user-map-container" :class="{ 'theme-dark': isDark }">
    <!-- 左侧地图区域 -->
    <div class="map-content">
      <div id="map-container" class="map-container"></div>
      <div v-if="loading" class="loading">地图加载中...</div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="mapRendering" class="map-rendering">
        <div class="rendering-spinner"></div>
        <span>正在渲染标注...</span>
      </div>
      <div v-if="!loading && !mapRendering && locationProgressText" class="map-rendering">
        <div class="rendering-spinner"></div>
        <span>{{ locationProgressText }}</span>
      </div>
    </div>

    <!-- 右侧面板容器 -->
    <div class="sidebar-container">
      <!-- 右侧人员列表 / 详情 -->
      <div class="user-list" :class="{ collapsed: isSidebarCollapsed }">
        <!-- 列表模式 -->
        <div v-if="!showDetailMode" class="list-mode">
          <div class="user-list-fixed">
            <!-- 第一行：标题 + 返回主页 + 行政区划-->
            <div class="top-title-row">
              <h3 class="user-list-title">人员列表</h3>
              <!-- 返回主页按钮 -->
              <div class="district-and-home-btns">
                <!-- 行政区划相关 -->
                <div class="home-icon-btn" @click="toggleDistricts" title="显示/隐藏行政区划">
                  <ArtSvgIcon icon="ri:grid-line" />
                </div>
                <div class="home-icon-btn" @click="goToHomePage" title="返回主页">
                  <ArtSvgIcon icon="ri:home-line" />
                </div>
              </div>
            </div>
            <!-- 第二行：日期选择器 + 片区下拉框 -->
            <div class="search-date-row" style="margin-top: 10px">
              <el-date-picker
                v-model="selectedDate"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="date-picker"
              />
              <el-select
                v-model="selectedGroupCode"
                placeholder="全部片区"
                class="group-select"
                clearable
                @focus="handleGroupSelectFocus"
              >
                <el-option
                  v-for="item in groupOptions"
                  :key="item.groupscode"
                  :label="item.groups"
                  :value="item.groupscode"
                />
              </el-select>
            </div>

            <!-- 第三行： 搜索框 + 筛选按钮 -->
            <div class="search-date-row" style="margin-top: 10px">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索姓名/工号"
                class="search-input"
                clearable
              />
              <el-button type="primary" @click="filterUsers">筛选</el-button>
            </div>
          </div>

          <div class="user-list-scroll">
            <div v-if="loading" class="user-list-loading">
              <!-- <div class="loading-spinner"></div> -->
              <span>加载中...</span>
            </div>
            <div v-else-if="filteredUserList.length === 0" class="user-list-empty"
              >暂无人员数据</div
            >
            <div
              v-for="user in filteredUserList"
              :key="user.usercode"
              class="user-card"
              :class="{ active: selectedUser === user.usercode }"
              @click="showUserDetail(user)"
            >
              <!-- 人员姓名与工号 -->
              <div class="user-card-header">
                <span class="user-code">
                  {{ user.username || user.usercode }}
                  <span v-if="user.username && user.usercode" class="user-code-sub"
                    >({{ user.usercode }})</span
                  >
                </span>
                <span class="user-time">{{ formatTime(user.createTime) }}</span>
              </div>
              <div class="user-card-body">
                <div class="user-location">
                  <span class="label">当前位置</span>
                  <span class="value">{{ user.address || '获取中...' }}</span>
                </div>
                <div class="user-info" v-if="user.ckl || user.dsl">
                  <strong>当日：</strong>
                  <br />
                  查勘量: {{ user.ckl }} &nbsp;&nbsp;|&nbsp;&nbsp; 查勘未完成：{{ user.ckJslWcl }}
                  <br />
                  定损完成量: {{ user.dsl }} &nbsp;&nbsp;|&nbsp;&nbsp;定损提交量：{{ user.dsTjl }}
                  <br />
                  定损支付量: {{ user.dsZfl }} &nbsp;&nbsp;|&nbsp;&nbsp;结案量：{{ user.ja }}
                </div>
                <div class="user-group" v-if="user.groups"> 所属片区：{{ user.groups }} </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 详情模式：轨迹回放 -->
        <div v-else class="detail-mode">
          <div class="detail-header">
            <div class="detail-top">
              <h2 class="detail-title">{{ currentDetailUser.username }}</h2>
              <el-button type="default" size="small" @click="backToList">返回列表</el-button>
            </div>
            <div class="detail-info-row">
              <div
                ><label>工号</label><span>{{ currentDetailUser.usercode }}</span></div
              >
              <div
                ><label>查询日期</label><span>{{ selectedDate }}</span></div
              >
              <div
                ><label>查勘量:</label><span>{{ currentDetailUser.ckl }}</span></div
              >
              <div
                ><label>查勘未完成:</label><span>{{ currentDetailUser.ckJslWcl }}</span></div
              >
              <div
                ><label>定损量:</label><span>{{ currentDetailUser.dsl }}</span></div
              >
              <div
                ><label>定损提交量:</label><span>{{ currentDetailUser.dsTjl }}</span></div
              >
              <div
                ><label>定损支付量:</label><span>{{ currentDetailUser.dsZfl }}</span></div
              >
              <div
                ><label>结案量:</label><span>{{ currentDetailUser.ja }}</span></div
              >
              <div
                ><label>所属片区:</label><span>{{ currentDetailUser.groups }}</span></div
              >
            </div>
          </div>
          <div class="detail-path-list">
            <div class="path-title">轨迹经纬度记录</div>
            <div
              v-for="(item, idx) in currentUserPathList.filter(
                (item) =>
                  item.address &&
                  item.address.trim() !== '' &&
                  item.address !== '坐标无效' &&
                  item.address !== '解析异常'
              )"
              :key="idx"
              class="path-item"
              @click="showPointOnMap(item)"
            >
              <div class="path-time">{{ formatTime(item.createTime) }}</div>
              <div class="path-coord">{{ item.address || '解析中...' }}</div>
            </div>
            <div v-if="trackLoading" class="no-path">
              <div class="loading-spinner-small"></div>
              <span>轨迹解析中...</span>
            </div>
            <div
              v-else-if="
                currentUserPathList.filter(
                  (item) =>
                    item.address &&
                    item.address.trim() !== '' &&
                    item.address !== '坐标无效' &&
                    item.address !== '解析异常'
                ).length === 0
              "
              class="no-path"
              >暂无轨迹点
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 固定展开按钮 -->
    <div
      class="float-toggle-btn"
      @click="isSidebarCollapsed = !isSidebarCollapsed"
      title="收起/展开面板"
    >
      {{ isSidebarCollapsed ? '<' : '>' }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
  import { useSettingStore } from '@/store/modules/setting'
  import { storeToRefs } from 'pinia'
  import { AdministrativeRegionManager } from '../../api/AdministrativeRegionmanager'
  import { personalmap } from '../../api'
  import { MapLoader } from '../../api/mapLoader'
  const settingStore = useSettingStore()
  const { isDark } = storeToRefs(settingStore)
  // import { LogService } from '../../../../api/logServices'
  // const VITE_API_PROXY_PORT_URL = import.meta.env.VITE_API_PROXY_PORT_URL
  const mapLoader = MapLoader.getInstance()

  // ==================== SVG 地图标记图标（替代 PNG 图片） ====================
  // 全部使用官方 remixicon 源 SVG，fill="currentColor" 由外部 color 控制
  // 数据源：@iconify-json/ri（icones.js.org/collection/ri）

  // 从 .user-map-container 容器读取 CSS 变量值（TMap LabelStyle 不支持 var()）
  const cssVar = (name: string, fallback: string): string => {
    const el = document.querySelector('.user-map-container') as HTMLElement | null
    if (!el) return fallback
    const v = getComputedStyle(el).getPropertyValue(name).trim()
    return v || fallback
  }

  const toSvgDataUri = (svg: string, color: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      svg
        .replace(/\n\s*/g, ' ')
        // 在 <svg> 标签内注入 color 样式（currentColor 会自动继承此值）
        .replace(/<svg /, `<svg style="color:${color}" `)
    )}`

  // 官方 remixicon 源 SVG（来自 @iconify-json/ri/icons.json）
  // - location:  ri:map-pin-2-fill  —— 地图钉
  // - startPoint: ri:play-circle-fill —— 起点（播放）
  // - endPoint:  ri:stop-circle-fill —— 终点（停止）
  // - walk:      ri:walk-line  —— 行人
  // 颜色统一通过 CSS 控制（见 .marker-icon-* 样式）
  const markerIcons = {
    location: toSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" stroke="var(--marker-location-stroke, #b91c1c)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill" d="M18.364 17.364L12 23.728l-6.364-6.364a9 9 0 1 1 12.728 0M12 13a2 2 0 1 0 0-4a2 2 0 0 0 0 4"/><circle cx="12" cy="11" r="2" fill="#ffffff"/></svg>`,
      'var(--marker-location, #ef4444)'
    ),
    startPoint: toSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" stroke="var(--marker-start-stroke, #15803d)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10M10.622 8.415a.4.4 0 0 0-.622.332v6.506a.4.4 0 0 0 .622.332l4.879-3.252a.4.4 0 0 0 0-.666z"/><path fill="#ffffff" d="M10.622 8.415a.4.4 0 0 0-.622.332v6.506a.4.4 0 0 0 .622.332l4.879-3.252a.4.4 0 0 0 0-.666z"/></svg>`,
      'var(--marker-start, #22c55e)'
    ),
    endPoint: toSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" stroke="var(--marker-end-stroke, #b91c1c)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10M9 9v6h6V9z"/><rect x="9" y="9" width="6" height="6" fill="#ffffff"/></svg>`,
      'var(--marker-end, #ef4444)'
    ),
    walk: toSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" stroke="var(--marker-walk-stroke, #1d4ed8)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill" d="m7.617 8.712l3.205-2.328A2 2 0 0 1 12.065 6a2.62 2.62 0 0 1 2.427 1.82q.279.875.51 1.181A5 5 0 0 0 19 11v2a6.99 6.99 0 0 1-5.401-2.547l-.698 3.956l2.061 1.729l2.223 6.108l-1.88.684l-2.039-5.604l-3.39-2.845a2 2 0 0 1-.714-1.904l.509-2.885l-.677.492l-2.127 2.928l-1.618-1.176L7.6 8.7zM13.5 5.5a2 2 0 1 1 0-4a2 2 0 0 1 0 4m-2.97 13.181l-3.214 3.83l-1.532-1.285l2.975-3.546l.746-2.18l1.791 1.5z"/></svg>`,
      'var(--marker-walk, #3b82f6)'
    )
  }

  // 全局声明腾讯地图SDK和自定义属性，避免TS类型报错
  declare global {
    interface Window {
      TMap: any
      districtLabelLayer?: any
    }
  }

  // 类型定义
  type AdministrativeRegionManagerType = InstanceType<typeof AdministrativeRegionManager>

  // 腾讯地图api key

  // ==================== 地图实例与图层对象 ====================
  let map: any = null
  let markerLayer: any = null
  let labelLayer: any = null
  let trackLineLayer: any = null
  let startEndMarkerLayer: any = null
  let carMarkerLayer: any = null
  let tempMarker: any = null
  let infoWindow: any = null
  let currentTrackBounds: any = null
  const currentTrackPadding = { top: 50, bottom: 50, left: 50, right: 50 }

  // ==================== 响应式状态 ====================
  const loading = ref(true)
  const error = ref('')
  const mapRendering = ref(false)

  // 进度追踪
  const locationProgressPercent = ref(0)
  const locationProgressText = ref('')
  let locationProgressTimer: ReturnType<typeof setInterval> | null = null

  const userList = ref<any[]>([])
  const isSidebarCollapsed = ref(false)
  const selectedUser = ref<string>('')
  const searchKeyword = ref('')
  const showDetailMode = ref(false)
  const currentDetailUser = ref<any>(null)
  const currentUserPathList = ref<any[]>([])
  const trackLoading = ref(false)

  // 片区相关
  const groupOptions = ref<any[]>([])
  const selectedGroupCode = ref<string>('')

  // ==================== 日期处理 ====================
  const today = new Date()
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const selectedDate = ref<string | null>(formatDate(today))

  // ==================== 计算属性 ====================
  const filteredUserList = computed(() => {
    return userList.value
  })

  // ==================== 工具函数 ====================
  const formatTime = (timeString: string) => {
    if (!timeString) return '未知时间'
    const date = new Date(timeString)
    if (isNaN(date.getTime())) return '时间格式错误'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // ==================== 地图初始化 ====================
  const initMap = async () => {
    try {
      //console.log('开始初始化地图');
      loading.value = true

      // 获取TMap实例 - 现在应该已经加载完成
      //console.log('获取TMap实例');
      const mapLoader = MapLoader.getInstance()
      const TMap = await mapLoader.getMapInstance()
      //console.log('TMap实例获取完成', TMap);

      // 确保DOM已完全渲染后再初始化地图
      //console.log('等待DOM更新');
      await nextTick()

      // 初始化地图
      //console.log('查找地图容器');
      const container = document.getElementById('map-container')
      if (!container) {
        console.error('地图容器不存在')
        throw new Error('地图容器不存在')
      }
      //console.log('地图容器找到，尺寸:', container.offsetWidth, 'x', container.offsetHeight);

      // 确保容器有尺寸
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('地图容器初始尺寸为0，尝试调整尺寸')
        // 强制触发重排
        container.style.display = 'none'
        container.offsetHeight // 触发重排
        container.style.display = ''
      }

      //console.log('开始创建地图实例');
      map = new TMap.Map(container, {
        center: new TMap.LatLng(30.6799, 104.0571),
        zoom: 12,
        minZoom: 8,
        maxZoom: 19,
        draggable: true,
        scrollwheel: true,
        mapStyleId: 'style1'
      })
      //console.log('地图实例创建完成', map);

      const zoomControl = map.getControl(TMap.constants.DEFAULT_CONTROL_ID.ZOOM)
      const rotationControl = map.getControl(TMap.constants.DEFAULT_CONTROL_ID.ROTATION)
      if (zoomControl) zoomControl.setPosition(TMap.constants.CONTROL_POSITION.TOP_LEFT)
      if (rotationControl) rotationControl.setPosition(TMap.constants.CONTROL_POSITION.TOP_LEFT)

      // 初始化行政区划管理器
      administrativeRegionManager = new AdministrativeRegionManager(map)

      // 在后台异步加载数据，不阻塞地图初始化
      fetchLatestLocations().catch((err) => console.error('加载位置数据失败:', err))
      // fetchGroupList().catch(err => console.error('加载分组列表失败:', err));

      loading.value = false
    } catch (err: any) {
      console.error('地图初始化失败', err)
      error.value = '地图加载失败：' + err.message
      loading.value = false
    }
  }

  // ==================== 行政区划功能 ====================
  let administrativeRegionManager: AdministrativeRegionManager | null = null

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

  // ==================== 获取片区列表 ====================
  const handleGroupSelectFocus = () => {
    if (groupOptions.value.length === 0) {
      fetchGroupList()
    }
  }

  const fetchGroupList = async () => {
    try {
      const params: Record<string, any> = {}
      if (selectedDate.value) params.date = selectedDate.value

      const allGroups = await personalmap.axiosRequestGroupList(params)
      const userData = await personalmap.axiosRequestLatestLocations(params)

      const groupsWithData = new Set(userData.map((user: any) => user.groupscode))
      let filteredGroups = (allGroups || []).filter((group: any) =>
        groupsWithData.has(group.groupscode)
      )

      // 只保留"第X片区"类型的小组
      filteredGroups = filteredGroups.filter((group: any) => {
        return /^第[一二三四五六七八九十]+片区$/.test(group.groups)
      })

      // 按 groupscode 去重
      const seen = new Set()
      filteredGroups = filteredGroups.filter((group: any) => {
        if (seen.has(group.groupscode)) return false
        seen.add(group.groupscode)
        return true
      })

      groupOptions.value = filteredGroups.sort((a: any, b: any) =>
        a.groupscode.localeCompare(b.groupscode)
      )
      selectedGroupCode.value = ''
    } catch (err) {
      console.error('获取片区失败', err)
      groupOptions.value = []
    }
  }

  // ==================== 获取人员最新位置（支持日期+片区+关键词） ====================
  const fetchLatestLocations = async () => {
    try {
      // 清除已有的进度轮询
      if (locationProgressTimer) {
        clearInterval(locationProgressTimer)
        locationProgressTimer = null
      }
      locationProgressText.value = ''
      locationProgressPercent.value = 0

      mapRendering.value = true
      const params: Record<string, any> = {}
      if (selectedDate.value) params.date = selectedDate.value
      if (selectedGroupCode.value) params.groupscode = selectedGroupCode.value
      if (searchKeyword.value) params.keyword = searchKeyword.value

      // await LogService.userMapLog('筛选人员', params)

      const data = await personalmap.axiosRequestLatestLocations(params)
      clearOverlays()

      userList.value = data || []

      if (userList.value.length === 0) {
        mapRendering.value = false
        return
      }

      // 渲染点
      const geometries = userList.value.map((user) => ({
        id: `user-${user.usercode}`,
        styleId: 'location',
        position: new window.TMap.LatLng(user.latitude, user.longitude),
        properties: { title: `${user.username || ''} (${user.usercode})`, user }
      }))

      markerLayer = new window.TMap.MultiMarker({
        map,
        styles: {
          location: new window.TMap.MarkerStyle({
            width: 32,
            height: 32,
            anchor: { x: 16, y: 32 },
            src: markerIcons.location
          })
        },
        geometries
      })

      markerLayer.on('click', (evt: any) => {
        const user = evt.geometry?.properties?.user
        if (user) showUserDetail(user)
      })

      const labelGeometries = userList.value.map((user) => ({
        id: `label-${user.usercode}`,
        styleId: 'userLabel',
        position: new window.TMap.LatLng(user.latitude, user.longitude),
        content: user.username || user.usercode,
        offset: { x: 0, y: 20 }
      }))

      labelLayer = new window.TMap.MultiLabel({
        map,
        styles: {
          userLabel: new window.TMap.LabelStyle({
            color: cssVar('--marker-label-color', '#fde047'),
            size: 15,
            offset: { x: 0, y: 2 },
            angle: 0,
            alignment: 'center',
            verticalAlignment: 'top',
            fontFamily: 'Microsoft YaHei',
            weight: 'bold',
            strokeColor: cssVar('--marker-label-stroke', '#1f2937'),
            strokeWidth: 2
          })
        },
        geometries: labelGeometries
      })

      // 自动聚焦所有点
      if (geometries.length) {
        const bounds = new window.TMap.LatLngBounds()
        geometries.forEach((g) => bounds.extend(g.position))
        map.fitBounds(bounds, { padding: currentTrackPadding })
      }
      mapRendering.value = false

      // 启动进度轮询，等待异步地址解析完成
      startLocationProgressPolling()
    } catch (err: any) {
      mapRendering.value = false
      console.error('获取人员数据失败', err)
      error.value = '后端接口异常：' + err.message
    }
  }

  /**
   * 轮询后端地址解析进度，完成后重新获取数据
   */
  const startLocationProgressPolling = () => {
    const params: Record<string, any> = {}
    if (selectedDate.value) params.date = selectedDate.value

    if (locationProgressTimer) clearInterval(locationProgressTimer)

    locationProgressTimer = setInterval(async () => {
      try {
        const res = await personalmap.axiosRequestLocationProgress(params)

        if (res.complete) {
          locationProgressPercent.value = 100
          locationProgressText.value = ''
          if (locationProgressTimer) {
            clearInterval(locationProgressTimer)
            locationProgressTimer = null
          }
          // 重新获取已解析完成的数据
          await fetchLatestLocations()
        } else if (res.processing) {
          locationProgressPercent.value = res.progress || 0
          locationProgressText.value = `正在解析地址，已完成 ${locationProgressPercent.value}%`
        } else {
          // 无需异步处理，停止轮询
          if (locationProgressTimer) {
            clearInterval(locationProgressTimer)
            locationProgressTimer = null
          }
        }
      } catch (err) {
        console.error('获取位置进度失败:', err)
        if (locationProgressTimer) {
          clearInterval(locationProgressTimer)
          locationProgressTimer = null
        }
      }
    }, 2000)
  }

  // 筛选按钮
  const filterUsers = async () => {
    await fetchLatestLocations()
  }

  // 返回主页
  const goToHomePage = async () => {
    selectedUser.value = ''
    searchKeyword.value = ''
    selectedGroupCode.value = ''
    showDetailMode.value = false
    currentDetailUser.value = null
    currentUserPathList.value = []
    clearOverlays()
    await fetchLatestLocations()
    await fetchGroupList()
  }

  // 返回列表
  const backToList = () => {
    showDetailMode.value = false
    currentDetailUser.value = null
    currentUserPathList.value = []
    selectedUser.value = ''
    clearOverlays()
    fetchLatestLocations()
  }

  // 查看人员详情
  const showUserDetail = async (user: any) => {
    // await LogService.userMapLog('查看人员详情', { usercode: user.usercode, username: user.username })

    selectedUser.value = user.usercode
    showDetailMode.value = true
    currentDetailUser.value = user
    await loadUserTrack(user.usercode)
  }

  // ==================== 加载轨迹 ====================
  const loadUserTrack = async (usercode: string) => {
    try {
      trackLoading.value = true
      if (!map) {
        error.value = '地图未初始化'
        trackLoading.value = false
        return
      }
      clearOverlays()

      const params: Record<string, any> = {}
      if (selectedDate.value) params.date = selectedDate.value
      const data = await personalmap.axiosRequestUserTrajectory(usercode, params)

      if (!data || data.length === 0) {
        error.value = '该用户当日无轨迹数据'
        currentUserPathList.value = []
        trackLoading.value = false
        return
      }

      const sorted = [...data].sort(
        (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
      )
      currentUserPathList.value = [...data].sort(
        (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      )

      const path = sorted.map((p) => new window.TMap.LatLng(p.latitude, p.longitude))
      if (path.length < 2) {
        error.value = '轨迹点不足，无法回放'
        trackLoading.value = false
        return
      }

      trackLineLayer = new window.TMap.MultiPolyline({
        map,
        styles: {
          arrow: new window.TMap.PolylineStyle({
            color: '#FF5722',
            borderWidth: 2,
            borderColor: '#FF9800',
            width: 6,
            showArrow: true,
            arrowOptions: { width: 8, height: 5, space: 50, animSpeed: 50 }
          })
        },
        geometries: [{ id: `track-${usercode}`, styleId: 'arrow', paths: path }]
      })

      startEndMarkerLayer = new window.TMap.MultiMarker({
        map,
        styles: {
          start: new window.TMap.MarkerStyle({
            width: 36,
            height: 36,
            anchor: { x: 18, y: 18 },
            src: markerIcons.startPoint
          }),
          end: new window.TMap.MarkerStyle({
            width: 32,
            height: 32,
            anchor: { x: 18, y: 18 },
            src: markerIcons.endPoint
          })
        },
        geometries: [
          { id: 'start', styleId: 'start', position: path[0] },
          { id: 'end', styleId: 'end', position: path[path.length - 1] }
        ]
      })

      carMarkerLayer = new window.TMap.MultiMarker({
        map,
        styles: {
          car: new window.TMap.MarkerStyle({
            width: 36,
            height: 36,
            anchor: { x: 18, y: 28 },
            faceTo: 'map',
            rotate: 0,
            src: markerIcons.walk
          })
        },
        geometries: [{ id: 'car', styleId: 'car', position: path[0] }]
      })

      const bounds = new window.TMap.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      currentTrackBounds = bounds
      map.fitBounds(bounds, { padding: currentTrackPadding })

      setTimeout(() => startPlayback(path), 50)
      setTimeout(() => {
        trackLoading.value = false
      }, 2000)
      error.value = ''
    } catch (err: any) {
      console.error('获取轨迹失败:', err)
      error.value = `获取轨迹失败: ${err.message}`
      trackLoading.value = false
    }
  }

  // 轨迹回放
  const startPlayback = (path: any[]) => {
    if (!carMarkerLayer || path.length < 2) return
    try {
      // 保存路径引用到闭包中，供移动事件使用
      const trackPath = [...path] // 创建副本以防原始路径被修改

      carMarkerLayer.moveAlong({ car: { path: trackPath, speed: 200 } }, { autoRotation: true })
      carMarkerLayer.on('moving', (e: any) => {
        const passed = e.car?.passedLatLngs
        if (passed && passed.length && trackLineLayer) {
          try {
            // 验证轨迹线是否存在对应的几何体
            const geometryId = `track-${currentDetailUser.value?.usercode}`
            const geometries = trackLineLayer.getGeometries()
            const targetGeometry = geometries.find((geo: any) => geo.id === geometryId)

            if (!targetGeometry || !targetGeometry.paths || !Array.isArray(targetGeometry.paths)) {
              console.warn('找不到对应的轨迹线几何体或路径数据')
              return
            }

            const originalPaths = targetGeometry.paths

            // 计算安全索引，确保不超过原始路径长度和passed数组长度
            let safeIndex = Math.min(passed.length - 1, originalPaths.length - 1)

            // 进一步确保safeIndex不为负数
            safeIndex = Math.max(0, safeIndex)

            // 额外检查确保索引有效，且passed数组中有对应元素
            if (
              safeIndex < originalPaths.length &&
              safeIndex < passed.length &&
              passed[safeIndex]
            ) {
              trackLineLayer.eraseTo(geometryId, safeIndex, passed[safeIndex])
            } else {
              // 如果索引无效，可能是在轨迹末尾，可以选择不执行任何操作或结束动画
              if (passed.length >= originalPaths.length) {
                // 到达轨迹终点，可以考虑停止动画
                //console.log('到达轨迹终点');
              }
            }
          } catch (err: any) {
            console.error('擦轨迹失败', err)
          }
        }
      })
    } catch (err: any) {
      console.error('回放失败', err)
    }
  }

  // 清除临时标记
  const clearTempMarkerAndRestoreBounds = () => {
    if (tempMarker) {
      tempMarker.setMap(null)
      tempMarker = null
    }
    if (currentTrackBounds && map)
      map.fitBounds(currentTrackBounds, { padding: currentTrackPadding })
  }

  // 点击轨迹点
  const showPointOnMap = (point: any) => {
    if (!map) return
    if (infoWindow) {
      infoWindow.close()
      infoWindow = null
    }
    if (tempMarker) {
      tempMarker.setMap(null)
      tempMarker = null
    }

    const latLng = new window.TMap.LatLng(point.latitude, point.longitude)
    tempMarker = new window.TMap.MultiMarker({
      map,
      styles: {
        highlight: new window.TMap.MarkerStyle({
          width: 30,
          height: 30,
          anchor: { x: 15, y: 30 },
          src: markerIcons.location
        })
      },
      geometries: [{ id: 'temp-marker', styleId: 'highlight', position: latLng }]
    })

    const closeBtnId = `custom-info-close-${Date.now()}`
    const isDarkMode = isDark.value
    const content = `
  <div style="background:${isDarkMode ? '#1f2937' : '#ffffff'};color:${isDarkMode ? '#e5e7eb' : '#1f2937'};border-radius:12px;padding:12px 16px;min-width:240px;box-shadow:${isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'};font-size:13px;line-height:1.5;border:1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-weight:bold;font-size:14px;">📍 轨迹点详情</span>
      <span id="${closeBtnId}" style="cursor:pointer;font-size:18px;color:${isDarkMode ? '#9ca3af' : '#6b7280'};">&times;</span>
    </div>
    <div>🕒 时间：${formatTime(point.createTime)}</div>
    <div style="margin:6px 0;">🏠 地址：${point.address || '解析中...'}</div>
    <div>📍 坐标：${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}</div>
  </div>`

    infoWindow = new window.TMap.InfoWindow({
      map,
      position: latLng,
      content,
      offset: { x: 0, y: -35 },
      enableCustom: true
    })
    infoWindow.open()
    document.getElementById(closeBtnId)?.addEventListener('click', () => {
      infoWindow?.close()
      infoWindow = null
      clearTempMarkerAndRestoreBounds()
    })
    map.setCenter(latLng)
  }

  // 清空覆盖物
  const clearOverlays = () => {
    if (carMarkerLayer) carMarkerLayer.setMap(null)
    if (markerLayer) markerLayer.setMap(null)
    if (labelLayer) labelLayer.setMap(null)
    if (trackLineLayer) trackLineLayer.setMap(null)
    if (startEndMarkerLayer) startEndMarkerLayer.setMap(null)
    if (tempMarker) tempMarker.setMap(null)
    if (infoWindow) infoWindow.close()
    carMarkerLayer =
      markerLayer =
      labelLayer =
      trackLineLayer =
      startEndMarkerLayer =
      tempMarker =
      infoWindow =
        null
    currentTrackBounds = null
  }

  // 在组件创建时就开始加载地图API，而不是等到mounted
  onMounted(async () => {
    try {
      // 地图API应该已经在组件创建时加载完成，直接初始化地图
      initMap()
      // 地图就绪后预加载表格页核心组件，缩短用户跳转后的首次渲染时间
      mapLoader.getMapInstance().then(() => {
        setTimeout(preloadTableComponents, 1000)
      })
    } catch (error) {
      console.error('地图初始化失败:', error)
    }
  })

  /**
   * 预加载 ArtSearchBar、ArtTableHeader、ArtTable 组件 JS chunk
   * 在用户浏览 user-map 期间后台加载，跳转表格页时可命中浏览器缓存实现瞬开
   * 注：这些组件在项目中为全局 auto-import（unplugin-vue-components），
   *     正常构建时会打包进各页面 chunk；此处手动 import 可确保 Vite 将其拆分
   *     为独立 chunk，配合 webpackPreload 提示浏览器提前缓存。
   */
  const preloadTableComponents = async () => {
    try {
      await Promise.all([
        import(/* webpackPreload: true */ '@/components/core/forms/art-search-bar/index.vue'),
        import(/* webpackPreload: true */ '@/components/core/tables/art-table-header/index.vue'),
        import(/* webpackPreload: true */ '@/components/core/tables/art-table/index.vue')
      ])
      console.log('[预加载] ArtSearchBar / ArtTableHeader / ArtTable 已缓存')
    } catch (e) {
      // 静默失败，不影响主流程
      console.warn('[预加载] 表格组件预加载失败', e)
    }
  }
  onBeforeUnmount(() => {
    if (locationProgressTimer) {
      clearInterval(locationProgressTimer)
      locationProgressTimer = null
    }
    clearOverlays()
    if (map) {
      map.destroy()
      map = null
    }
  })
</script>

<style scoped>
  /* ========== SVG 标记图标颜色（CSS 控制，替代 SVG 内硬编码 fill） ==========
     数据 URI 中 <svg style="color: var(--marker-*)">，
     内部 path 的 fill="currentColor" 自动继承此颜色。
     修改下方变量值即可全局换色，主题切换时只需覆盖 :root 或上层选择器。 */
  .user-map-container {
    /* ==================== 主题色变量（CSS 控制，自动响应主题切换） ====================
       默认值为浅色主题。
       切换到深色主题时由下方 `.user-map-container.theme-dark` 块覆盖。
       主题判断依据：Pinia settingStore.isDark（storeToRefs 响应式绑定到根元素 class）。 */

    /* 起点（绿色，ri:play-circle-fill） */
    --marker-start: #22c55e;
    /* 终点（红色，ri:stop-circle-fill） */
    --marker-end: #ef4444;
    /* 位置/地图钉（红色，ri:map-pin-2-fill） */
    --marker-location: #ef4444;
    /* 行人/轨迹动画（蓝色，ri:walk-line） */
    --marker-walk: #3b82f6;
    /* 边框色（深一档，用于 SVG stroke） */
    --marker-start-stroke: #15803d;
    --marker-end-stroke: #b91c1c;
    --marker-location-stroke: #b91c1c;
    --marker-walk-stroke: #1d4ed8;
    /* 姓名标签边框（控制 TMap.LabelStyle 文字描边） */
    --marker-label-color: #fde047;
    --marker-label-stroke: #1f2937;

    /* ==================== 右侧人员列表（user-list）主题色（浅色默认） ==================== */
    /* 容器 */
    --ul-bg: #ffffff;
    --ul-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    /* 卡片 / 详情头 */
    --ul-card-bg: #f9fafb;
    --ul-card-bg-active: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    --ul-card-header-bg: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    --ul-card-border: #e5e7eb;
    --ul-card-divider: #e5e7eb;
    --ul-card-info-divider: #e5e7eb;
    --ul-card-hover-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);

    /* 文字 */
    --ul-text-primary: #111827;
    --ul-text-code: #0f172a;
    --ul-text-body: #374151;
    --ul-text-secondary: #6b7280;
    --ul-text-tertiary: #6b7280;

    /* 按钮 / 图标 */
    --ul-float-btn-bg: #9ca3af;
    --ul-float-btn-hover: #3b82f6;
    --ul-home-icon-bg: rgba(59, 130, 246, 0.08);
    --ul-home-icon-border: rgba(59, 130, 246, 0.3);
    --ul-home-icon-color: #3b82f6;
    --ul-home-icon-hover-bg: rgba(59, 130, 246, 0.15);
    --ul-home-icon-hover-border: #2563eb;
    --ul-home-icon-hover-color: #1d4ed8;

    /* Element Plus 组件（恢复 Element Plus 默认浅色） */
    --ul-input-color: inherit;
    --ul-input-bg: #ffffff;
    --ul-input-border: #d1d5db;
    --ul-input-placeholder: #9ca3af;
    --ul-input-wrapper-border: #d1d5db;
    --ul-button-default-bg: #ffffff;
    --ul-button-default-border: #d1d5db;
    --ul-button-default-color: #374151;
    --ul-button-default-hover-bg: #f3f4f6;
    --ul-button-default-hover-border: #9ca3af;
    --ul-button-default-hover-color: #111827;
  }

  /* ==================== 深色主题变量（通过 Pinia isDark 响应式绑定 class） ====================
     specificity: .user-map-container.theme-dark[data-v-xxx] = 0,2,1 — 覆盖默认浅色值 (0,1,1) */
  .user-map-container.theme-dark {
    /* 容器 */
    --ul-bg: #1f2937;
    --ul-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

    /* 卡片 / 详情头 */
    --ul-card-bg: #2d3a4a;
    --ul-card-bg-active: linear-gradient(135deg, #1e2a3a 0%, #1f2c3c 100%);
    --ul-card-header-bg: linear-gradient(135deg, #1e2a3a 0%, #1f2c3c 100%);
    --ul-card-border: #374151;
    --ul-card-divider: #374151;
    --ul-card-info-divider: #374151;
    --ul-card-hover-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);

    /* 文字 */
    --ul-text-primary: #f3f4f6;
    --ul-text-code: #f9fafb;
    --ul-text-body: #e5e7eb;
    --ul-text-secondary: #9ca3af;
    --ul-text-tertiary: #9ca3af;

    /* 按钮 / 图标 */
    --ul-float-btn-bg: #89929f;
    --ul-float-btn-hover: #253f78;
    --ul-home-icon-bg: rgba(59, 130, 246, 0.15);
    --ul-home-icon-border: rgba(59, 130, 246, 0.4);
    --ul-home-icon-color: #60a5fa;
    --ul-home-icon-hover-bg: rgba(59, 130, 246, 0.3);
    --ul-home-icon-hover-border: #3b82f6;
    --ul-home-icon-hover-color: #93c5fd;

    /* Element Plus 组件（统一深色化） */
    --ul-input-color: #e5e7eb;
    --ul-input-bg: #1f2937;
    --ul-input-border: #374151;
    --ul-input-placeholder: #9ca3af;
    --ul-input-wrapper-border: #9ca3af;
    --ul-button-default-bg: #374151;
    --ul-button-default-border: #4b5563;
    --ul-button-default-color: #e5e7eb;
    --ul-button-default-hover-bg: #4b5563;
    --ul-button-default-hover-border: #6b7280;
    --ul-button-default-hover-color: #f3f4f6;
  }

  /* ========== Element Plus 组件（响应主题） ==========
     颜色全部走 CSS 变量；浅色主题由 .user-map-container 默认值决定，
     深色主题由 .user-map-container.theme-dark 覆盖（isDark store 驱动）。 */
  :deep(.el-input__inner),
  :deep(.el-select__input) {
    color: var(--ul-input-color) !important;
    background-color: var(--ul-input-bg) !important;
    border-color: var(--ul-input-border) !important;
  }
  :deep(.el-input__inner::placeholder),
  :deep(.el-select__input::placeholder) {
    color: var(--ul-input-placeholder) !important;
  }
  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    background-color: var(--ul-input-bg) !important;
    box-shadow: none !important;
    border: 1px solid var(--ul-input-wrapper-border) !important;
    border-radius: 4px;
  }
  :deep(.el-input__prefix),
  :deep(.el-input__suffix),
  :deep(.el-select__suffix) {
    color: var(--ul-input-placeholder) !important;
  }
  :deep(.el-button--primary) {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }
  :deep(.el-button--default) {
    background-color: var(--ul-button-default-bg);
    border-color: var(--ul-button-default-border);
    color: var(--ul-button-default-color);
  }
  :deep(.el-button--default:hover) {
    background-color: var(--ul-button-default-hover-bg);
    border-color: var(--ul-button-default-hover-border);
    color: var(--ul-button-default-hover-color);
  }

  /* 顶部一行布局 */
  .top-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 0;
  }
  .user-list-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--ul-text-primary);
    margin: 0;
    white-space: nowrap;
  }
  .date-picker {
    flex: 1;
    min-width: 170px;
    max-width: 225px;
  }
  .group-select {
    flex: 1;
    min-width: 130px;
    max-width: 225px;
  }
  .home-icon-btn {
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
  .home-icon-btn:hover {
    background: var(--fs-toolbar-btn-hover-bg);
    border-color: var(--fs-toolbar-btn-hover-border);
    color: var(--fs-toolbar-btn-hover-color);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .district-and-home-btns {
    display: flex;
    gap: 4px; /* 小间隙确保按钮紧贴 */
    align-items: center;
  }

  .search-date-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .search-date-row .search-input {
    flex: 1;
    min-width: 125px;
  }

  .user-map-container {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 10px;
    /* background: #111827; */
  }

  .map-content {
    flex: 1;
    height: 100%;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  .map-container {
    width: 100%;
    height: 100%;
  }
  .sidebar-container {
    position: relative;
    height: 100%;
    flex-shrink: 0;
  }
  .user-list {
    width: 340px;
    height: 100%;
    background: var(--ul-bg);
    border-radius: 12px;
    box-shadow: var(--ul-shadow);
    padding: 20px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }
  .user-list.collapsed {
    width: 0;
    padding: 0;
    border: none;
    box-shadow: none;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
  }
  .float-toggle-btn {
    position: fixed;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 30px;
    background: var(--ul-float-btn-bg);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    font-size: 20px;
    z-index: 99999;
    transition: 0.2s ease;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  }
  .float-toggle-btn:hover {
    background: var(--ul-float-btn-hover);
    width: 30px;
  }
  .list-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .user-list-fixed {
    flex-shrink: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--ul-card-divider);
    margin-bottom: 8px;
  }
  .user-list-scroll {
    flex: 1;
    overflow-y: auto !important;
    padding-top: 12px;
    box-sizing: border-box;
  }
  .user-card {
    background: var(--ul-card-bg);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.28s ease;
    border: 1px solid var(--ul-card-border);
  }
  .user-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--ul-card-hover-shadow);
    border-color: #3b82f6;
  }
  .user-card.active {
    border-color: #3b82f6;
    background: var(--ul-card-bg-active);
  }
  .user-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .user-code {
    font-weight: 600;
    font-size: 15px;
    color: var(--ul-text-code);
  }
  .user-code-sub {
    font-size: 12px;
    color: var(--ul-text-secondary);
    margin-left: 4px;
    font-weight: normal;
  }
  .user-time {
    font-size: 12px;
    color: var(--ul-text-secondary);
    white-space: nowrap;
  }
  .user-card-body {
    font-size: 14px;
    line-height: 1.5;
  }
  .user-location {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .user-location .label {
    color: var(--ul-text-secondary);
    font-size: 13px;
    white-space: nowrap;
  }
  .user-location .value {
    color: var(--ul-text-body);
    font-size: 13px;
    text-align: right;
    word-break: break-all;
  }
  .user-info {
    font-size: 12px;
    color: var(--ul-text-secondary);
    padding: 6px 0;
    border-top: 1px dashed var(--ul-card-info-divider);
    margin: 6px 0;
  }
  .user-group {
    font-size: 12px;
    color: var(--ul-text-secondary);
  }
  .detail-mode {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .detail-header {
    flex-shrink: 0;
    padding: 20px;
    background: var(--ul-card-header-bg);
    border-radius: 12px;
    margin-bottom: 16px;
  }
  .detail-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .detail-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--ul-text-primary);
    margin: 0;
  }
  .detail-info-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;
  }
  .detail-info-row div {
    display: flex;
    align-items: center;
  }
  .detail-info-row label {
    width: 90px;
    font-weight: 600;
    color: var(--ul-text-secondary);
    font-size: 13px;
  }
  .detail-info-row span {
    color: var(--ul-text-body);
  }
  .detail-path-list {
    flex: 1;
    overflow-y: auto !important;
    padding-top: 8px;
    padding-right: 8px;
  }
  .path-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ul-text-body);
    margin-bottom: 12px;
  }
  .path-item {
    padding: 14px;
    border-radius: 10px;
    background: var(--ul-card-bg);
    margin-bottom: 10px;
    border: 1px solid var(--ul-card-border);
    transition: all 0.2s ease;
    cursor: pointer;
  }
  .path-item:hover {
    background: var(--ul-card-border);
    border-color: var(--ul-text-secondary);
  }
  .path-time {
    font-size: 12px;
    color: var(--ul-text-secondary);
    margin-bottom: 6px;
  }
  .path-coord {
    font-size: 13px;
    color: var(--ul-text-body);
  }
  .no-path {
    padding: 40px 0;
    text-align: center;
    color: var(--ul-text-secondary);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #4a5568;
    border-top: 2px solid #4299e1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  .loading-spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid #4a5568;
    border-top: 2px solid #4299e1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 6px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .loading,
  .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    font-size: 14px;
  }
  .error {
    color: #f87171;
  }
  .map-rendering {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(59, 130, 246, 0.9);
    color: #fff;
    padding: 10px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  .rendering-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .user-list-loading,
  .user-list-empty {
    padding: 30px 0;
    text-align: center;
    color: var(--ul-text-secondary);
  }
  @media (max-width: 768px) {
    .user-map-container {
      flex-direction: column;
      gap: 16px;
    }
    .user-list {
      width: 100%;
      height: auto;
      max-height: 280px;
    }
  }

  /* 地图控件样式 */
  .map-control-top-right {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .map-control-btn {
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: white;
    border-radius: 4px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .map-control-btn:hover {
    background: #f5f5f5;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    .map-control-top-right {
      top: 8px;
      right: 8px;
    }
  }

  @reference '@styles/core/tailwind.css';

  .art-button {
    @apply ml-2
    size-8
    flex
    items-center
    justify-center
    cursor-pointer
    rounded-md
    bg-g-300/55
    dark:bg-g-300/40
    text-g-700
    hover:bg-g-300
    md:ml-0
    md:mr-2.5;
  }
</style>

<style>
  /* ==================== 全局滚动条（响应主题） ====================
     这段 CSS 不在 scoped 块内，所以无法直接用 scoped CSS 变量。
     改为通过全局的 html.dark 主题类切换。 */

  /* 浅色主题：默认（无 html.dark 时应用） */
  .user-map-container .user-list-scroll::-webkit-scrollbar-thumb,
  .user-map-container .detail-path-list::-webkit-scrollbar-thumb {
    background: #d1d5db !important;
  }
  .user-map-container .user-list-scroll::-webkit-scrollbar-track,
  .user-map-container .detail-path-list::-webkit-scrollbar-track {
    background: #f3f4f6 !important;
  }

  /* 深色主题：仅当 <html class="dark"> 时覆盖 */
  html.dark .user-map-container .user-list-scroll::-webkit-scrollbar-thumb,
  html.dark .user-map-container .detail-path-list::-webkit-scrollbar-thumb {
    background: #4b5563 !important;
  }
  html.dark .user-map-container .user-list-scroll::-webkit-scrollbar-track,
  html.dark .user-map-container .detail-path-list::-webkit-scrollbar-track {
    background: #1f2937 !important;
  }

  /* 滚动条尺寸（主题无关） */
  .user-map-container .user-list-scroll::-webkit-scrollbar,
  .user-map-container .detail-path-list::-webkit-scrollbar {
    width: 4px !important;
    height: 4px !important;
  }
  .user-map-container .user-list-scroll::-webkit-scrollbar-thumb,
  .user-map-container .detail-path-list::-webkit-scrollbar-thumb {
    border-radius: 10px !important;
  }

  /* 工具栏按钮 CSS 变量（汛期驾驶舱同款） */
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
