<template>
  <div class="workload-drill-chart flex flex-col gap-2 pb-3">
    <!-- 搜索条件区域 -->
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchFormState"
      :items="searchItems"
      :rules="rules"
      :is-expand="false"
      :show-expand="true"
      :show-reset-button="true"
      :show-search-button="true"
      :disabled-search-button="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 图表卡片 -->
    <ElCard class="flex-1 art-table-card" style="margin-top: 0; padding: 5px">
      <template #header>
        <div class="flex-cb">
          <div class="flex items-center gap-2">
            <ElButton v-if="currentLevel !== 'department'" @click="goBack" size="small">
              ← 返回{{ currentLevel === 'employee' ? '小组' : '部门' }}视图
            </ElButton>
            <h4 class="m-0">{{ viewTitle }}</h4>
          </div>
          <div class="flex gap-2 items-center">
            <span class="text-sm text-gray-500">Y轴指标：</span>
            <ElSelect v-model="yAxisKey" size="small" style="width: 120px">
              <ElOption value="zl" label="总量" />
              <ElOption value="ja" label="结案量" />
              <ElOption value="ckJsl" label="查勘接收量" />
              <ElOption value="dsTjl" label="定损提交量" />
            </ElSelect>
            <ElTag v-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else-if="chartData.length > 0" type="success"
              >{{ chartData.length }} 条线</ElTag
            >
            <ElTag v-else type="danger">暂无数据</ElTag>
          </div>
        </div>
      </template>

      <!-- 折线图 -->
      <WorkloadLineChart
        v-if="chartData.length > 0"
        ref="chartRef"
        :chart-data="chartData"
        :loading="loading"
        :height="chartHeight"
        :y-axis-key="yAxisKey"
        @series-click="handleSeriesClick"
      />
      <div v-else-if="!loading" class="empty-state">
        <ElEmpty :description="emptyDescription" :image-size="100" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessage, ElEmpty } from 'element-plus'
  import { workloadTrend } from '../../../api'
  import WorkloadLineChart from './WorkloadLineChart.vue'

  // ============ 类型定义 ============
  interface MonthData {
    period: string
    zl: number
    ja: number
    ckJsl: number
    dsTjl: number
    isAbnormal?: boolean
    abnormalType?: string
  }

  interface SeriesData {
    name: string
    data: MonthData[]
    isAbnormal?: boolean
    groupsCode?: string
    comCode?: string
  }
  // ============ 常量 ============

  const chartHeight = 600

  // ============ 状态 ============
  type ViewLevel = 'department' | 'group' | 'employee'
  const route = useRoute()
  const searchBarRef = ref<any>(null)
  const loading = ref(false)

  // 视图层级状态
  const currentLevel = ref<ViewLevel>('department')
  const selectedComcode = ref<string>('')
  const selectedComname = ref<string>('') // 用于显示（非钻取条件）
  const selectedGroupscode = ref<string>('')
  const selectedGroupsname = ref<string>('') // 用于显示（非钻取条件）

  // Y轴指标
  const yAxisKey = ref<'zl' | 'ja' | 'ckJsl' | 'dsTjl'>('zl')

  // 搜索表单
  const searchFormState = ref({
    startDate: '',
    endDate: '',
    granularity: 'month'
  })

  const rules = {
    startDate: [],
    endDate: []
  }

  // ============ 计算属性 ============
  const viewTitle = computed(() => {
    if (currentLevel.value === 'department') return '部门视图'
    if (currentLevel.value === 'group')
      return `小组视图 - ${selectedComname.value || selectedComcode.value}`
    return `员工视图 - ${selectedGroupsname.value || selectedGroupscode.value}`
  })

  const emptyDescription = computed(() => {
    if (currentLevel.value === 'department') return '暂无部门工作量数据'
    if (currentLevel.value === 'group')
      return `【${selectedComname.value || '该部门'}】暂无下辖小组数据，可能该部门为汇总部门或数据未导入`
    return `【${selectedGroupsname.value || '该小组'}】暂无员工数据，可能该小组为虚拟组织或数据未导入`
  })

  const chartData = ref<SeriesData[]>([])

  const searchItems = computed(() => [
    {
      key: 'startDate',
      label: '开始日期',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择开始日期' }
    },
    {
      key: 'endDate',
      label: '结束日期',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择结束日期' }
    },
    {
      key: 'granularity',
      label: '时间粒度',
      type: 'select',
      props: {
        options: [
          { label: '月', value: 'month' },
          { label: '周', value: 'week' },
          { label: '日', value: 'day' }
        ]
      }
    }
  ])

  // ============ 数据加载 ============
  const loadData = async () => {
    loading.value = true
    // 不再清空 chartData.value，避免触发两次 watch 导致图表闪烁
    // 图表子组件在 watch 触发时用 clear() + setOption(完整option) 重建
    try {
      const params = {
        startDate: searchFormState.value.startDate,
        endDate: searchFormState.value.endDate,
        granularity: searchFormState.value.granularity
      }

      let response: any[] = []

      if (currentLevel.value === 'department') {
        response = await workloadTrend.axiosRequestDepartmentWorkload(params)
        console.log('[部门数据原始返回]', JSON.stringify(response?.slice(0, 3)))
        chartData.value = transformDeptData(response)
      } else if (currentLevel.value === 'group') {
        response = await workloadTrend.axiosRequestGroupWorkload({
          ...params,
          comCode: selectedComcode.value
        })
        console.log('[小组数据原始返回]', JSON.stringify(response))
        chartData.value = transformGroupData(response)
      } else {
        response = await workloadTrend.axiosRequestEmployeeWorkload({
          ...params,
          groupsCode: selectedGroupscode.value
        })
        chartData.value = transformEmpData(response)
      }
    } catch (error: any) {
      ElMessage.error('加载数据失败：' + (error.message || '未知错误'))
    } finally {
      loading.value = false
    }
  }

  // ============ 数据转换 ============
  const transformDeptData = (data: any[]): SeriesData[] => {
    if (!Array.isArray(data)) return []
    return data.map((item) => ({
      name: item.comName || item.comCode,
      data: (item.data || []).map((d: any) => ({
        period: d.period,
        zl: d.zl || 0,
        ja: d.ja || 0,
        ckJsl: d.ckJsl || 0,
        dsTjl: d.dsTjl || 0,
        isAbnormal: d.isAbnormal || false,
        abnormalType: d.abnormalType || null
      }))
    }))
  }

  const transformGroupData = (data: any[]): SeriesData[] => {
    if (!Array.isArray(data)) return []
    const result = data.map((item) => ({
      name: item.groupsName || item.groupsCode,
      data: (item.data || []).map((d: any) => ({
        period: d.period,
        zl: d.zl || 0,
        ja: d.ja || 0,
        ckJsl: d.ckJsl || 0,
        dsTjl: d.dsTjl || 0,
        isAbnormal: d.isAbnormal || false,
        abnormalType: d.abnormalType || null
      })),
      groupsCode: item.groupsCode,
      comCode: item.comCode
    }))
    console.log(
      '[transformGroupData] 原始数据:',
      JSON.stringify(data.map((i) => ({ groupsName: i.groupsName, groupsCode: i.groupsCode })))
    )
    console.log(
      '[transformGroupData] 输出:',
      JSON.stringify(result.map((r) => ({ name: r.name, groupsCode: r.groupsCode })))
    )
    return result
  }

  const transformEmpData = (data: any[]): SeriesData[] => {
    if (!Array.isArray(data)) return []
    const result = data.map((item) => ({
      name: item.userName || item.userCode,
      data: (item.data || []).map((d: any) => ({
        period: d.period,
        zl: d.zl || 0,
        ja: d.ja || 0,
        ckJsl: d.ckJsl || 0,
        dsTjl: d.dsTjl || 0,
        isAbnormal: d.isAbnormal || false,
        abnormalType: d.abnormalType || null
      })),
      isAbnormal: item.isAbnormal || false
    }))
    // 打印前两条数据的异常标记，用于排查
    const sample = result.slice(0, 2).map((r) => ({
      name: r.name,
      data: r.data.slice(0, 3).map((d: any) => ({
        period: d.period,
        zl: d.zl,
        isAbnormal: d.isAbnormal,
        abnormalType: d.abnormalType
      }))
    }))
    console.log('[transformEmpData]', JSON.stringify(sample))
    return result
  }

  // ============ 钻取交互 ============
  const handleSeriesClick = async (seriesName: string) => {
    if (currentLevel.value === 'department') {
      // 部门 → 小组：先获取部门编码（用于下一级 group 查询过滤）
      try {
        const code = await workloadTrend.axiosRequestComCodeByName({ comName: seriesName })
        if (code) {
          selectedComcode.value = code
          selectedComname.value = seriesName // 保存部门名称用于显示
          currentLevel.value = 'group'
        } else {
          ElMessage.warning('未找到该部门')
        }
      } catch {
        ElMessage.error('获取部门编码失败')
      }
    } else if (currentLevel.value === 'group') {
      // 小组 → 员工：优先从缓存取 groupsCode，为空则调用后端接口查询
      const groupItem = chartData.value.find((g) => g.name === seriesName)
      if (groupItem && groupItem.groupsCode) {
        // 缓存命中：直接使用
        selectedGroupscode.value = groupItem.groupsCode
        selectedGroupsname.value = seriesName
        currentLevel.value = 'employee'
      } else {
        // 缓存为空：通过后端接口查询（用 comcode + groupsname 联合定位）
        try {
          const code = await workloadTrend.axiosRequestGroupsCodeByName({
            comCode: selectedComcode.value,
            groupsName: seriesName
          })
          if (code) {
            selectedGroupscode.value = code
            selectedGroupsname.value = seriesName
            currentLevel.value = 'employee'
          } else {
            ElMessage.error(`未找到小组[${seriesName}]的编码（数据库中可能无此小组的 groupscode）`)
          }
        } catch {
          ElMessage.error('获取小组编码失败')
        }
      }
    }
  }

  // 返回上一级
  const goBack = () => {
    if (currentLevel.value === 'employee') {
      currentLevel.value = 'group'
      selectedGroupscode.value = ''
      selectedGroupsname.value = ''
    } else if (currentLevel.value === 'group') {
      currentLevel.value = 'department'
      selectedComcode.value = ''
      selectedComname.value = ''
    }
  }

  // ============ 搜索/重置 ============
  const handleSearch = async () => {
    await searchBarRef.value?.validate()
    loadData()
  }

  const handleReset = () => {
    searchFormState.value = {
      startDate: '',
      endDate: '',
      granularity: 'month'
    }
    loadData()
  }

  // ============ URL 同步 ============
  const buildUrl = () => {
    const params = new URLSearchParams()
    if (searchFormState.value.startDate) params.set('startDate', searchFormState.value.startDate)
    if (searchFormState.value.endDate) params.set('endDate', searchFormState.value.endDate)
    if (searchFormState.value.granularity)
      params.set('granularity', searchFormState.value.granularity)
    if (selectedComcode.value) params.set('comcode', selectedComcode.value)
    if (selectedComname.value) params.set('comname', selectedComname.value)
    if (selectedGroupscode.value) params.set('groupscode', selectedGroupscode.value)
    if (selectedGroupsname.value) params.set('groupsname', selectedGroupsname.value)
    const query = params.toString()
    return query
      ? `/efficiency/operations/pages/workload/workload-drill?${query}`
      : '/efficiency/operations/pages/workload/workload-drill'
  }

  // 钻取时层级变化 → 重新加载数据
  watch(currentLevel, () => {
    loadData()
  })

  // URL 同步：状态变化时更新地址栏
  watch(
    [
      currentLevel,
      selectedComcode,
      selectedGroupscode,
      () => searchFormState.value.startDate,
      () => searchFormState.value.endDate,
      () => searchFormState.value.granularity
    ],
    () => {
      const url = buildUrl()
      history.replaceState(null, '', url)
    },
    { immediate: false }
  )

  // ============ 初始化 ============
  onMounted(() => {
    // 从 URL 恢复钻取状态
    if (route.query.comcode) {
      selectedComcode.value = route.query.comcode as string
      selectedComname.value = (route.query.comname as string) || ''
      currentLevel.value = 'group'
    }
    if (route.query.groupscode) {
      selectedGroupscode.value = route.query.groupscode as string
      selectedGroupsname.value = (route.query.groupsname as string) || ''
      currentLevel.value = 'employee'
    }
    if (route.query.startDate) searchFormState.value.startDate = route.query.startDate as string
    if (route.query.endDate) searchFormState.value.endDate = route.query.endDate as string
    if (route.query.granularity)
      searchFormState.value.granularity = route.query.granularity as string

    loadData()
  })
</script>

<style scoped>
  .workload-drill-chart {
    padding: 12px;
  }
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }
</style>
