<template>
  <div class="flex flex-col gap-2 pb-3">
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

    <!-- 表格卡片容器 -->
    <ElCard class="flex-1 art-table-card" style="margin-top: 0; padding: 5px">
      <template #header>
        <div class="flex-cb">
          <!-- 表格标题 + 动态统计时间 -->
          <h4 class="m-0">未决存量-案件类型【统计时间：{{ currentMaxTjTime }}】</h4>
          <div class="flex gap-1">
            <ElTag v-if="tableError" type="danger">{{ tableError.message }}</ElTag>
            <ElTag v-else-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ tableData.length }} 条数据</ElTag>
          </div>
        </div>
      </template>

      <!-- 表格工具栏：刷新、导出、列设置等 -->
      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        @refresh="handleRefresh"
        layout="refresh,size,fullscreen,columns,settings"
        fullClass="art-table-card"
        style=""
      >
        <template #left>
          <ElSpace wrap>
            <!-- 导出按钮：支持当前页 / 全部 -->
            <ElDropdown split-button type="primary" @click="handleExportCurrent" v-ripple>
              <ElIcon>
                <Download />
              </ElIcon>
              导出当前页
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem @click="handleExportCurrent">导出当前页</ElDropdownItem>
                  <ElDropdownItem @click="handleExportAll">导出全部</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 主表格 -->
      <ArtTable
        ref="tableRef"
        :loading="loading"
        :pagination="pagination"
        :data="mergedData"
        :span-method="spanMethod"
        :columns="columns"
        :height="computedTableHeight"
        :scrollbar-always-on="true"
        empty-height="660px"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="localHandleCurrentChange"
      >
        <!-- 序号列 -->
        <template #index="{ $index }">
          <span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span>
        </template>

        <template #comname="{ row }">
          <span>{{ row.comname }}</span>
        </template>
        <template #lflag="{ row }">
          <span>{{ row.lflag }}</span>
        </template>
        <template #hj="{ row }">
          <span>{{ row.hj }}</span>
        </template>
        <template #bsrs="{ row }">
          <span>{{ row.bsrs }}</span>
        </template>
        <template #rs="{ row }">
          <span>{{ row.rs }}</span>
        </template>
        <template #ztyj="{ row }">
          <span>{{ row.ztyj }}</span>
        </template>
        <template #bsrsyj="{ row }">
          <span>{{ row.bsrsyj }}</span>
        </template>
        <template #rsyj="{ row }">
          <span>{{ row.rsyj }}</span>
        </template>
        <template #ztwjxs="{ row }">
          <span>{{ row.ztwjxs }}</span>
        </template>
        <template #bsrswjxs="{ row }">
          <span>{{ row.bsrswjxs }}</span>
        </template>
        <template #rswjxs="{ row }">
          <span>{{ row.rswjxs }}</span>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useEfficiencyTable } from '../../api/useEfficiencyTable'
  import { useMergeFirstColumn } from '../../api/useMergeFirstColumn'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'WjxsTable' })

  // ==================== 1. 类型定义 ====================
  /** 未决存量-案件类型 表格数据类型 */
  interface WjxsData {
    tjdate: string | null
    comname: string
    comnameSgs: string
    lflag: string
    hj: number
    bsrs: number
    rs: number
    ztyj: number
    bsrsyj: number
    rsyj: number
    ztwjxs: number
    bsrswjxs: number
    rswjxs: number
    maxTjTime: string | null
  }

  /** 下拉框基础选项类型 */
  interface SelectOption {
    label: string
    value: string
  }

  /** 表格请求参数类型 */
  interface UseTableParams {
    current: number
    size: number
    [key: string]: any
  }

  /** 表格接口返回结构 */
  interface UseTableResult<T> {
    records: T[]
    total: number
    current: number
    size: number
  }

  // ==================== 2. 引用与状态变量 ====================
  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  const isInitialized = ref(false)
  const comnameSgsOptions = ref<SelectOption[]>([])

  // ==================== 3. 搜索表单配置 ====================
  const rules = {
    tjDate: [{ required: false, message: '请选择统计日期', trigger: 'change' }]
  }

  const searchFormState = ref({
    tjDate: '',
    comnameSgs: ''
  })

  const tableApiParams = ref({
    current: 1,
    size: 20,
    ...searchFormState.value
  })

  const searchItems = computed(() => [
    {
      key: 'tjDate',
      label: '统计时间',
      type: 'date',
      props: { placeholder: '选择统计日期', valueFormat: 'YYYY-MM-DD' }
    },
    {
      key: 'comnameSgs',
      label: '市公司',
      type: 'select',
      props: {
        placeholder: '请选择市公司',
        options: comnameSgsOptions.value,
        clearable: true
      }
    }
  ])

  // ==================== 4. 表格样式与高度 ====================
  const tableConfig = ref({ height: '100%', fixedHeight: false })
  const computedTableHeight = computed(() =>
    tableConfig.value.fixedHeight ? '660px' : 'calc(100vh - 330px)'
  )

  // ==================== 5. 构建市公司下拉（全量版） ====================
  // 用独立的全量端点（/list, size: 9999）构建市公司下拉，避免首屏分页只有 20 行时遗漏
  // 后续页中才出现的市公司。返回的集合是全量的，与分页结果无关。
  const fetchAllForDropdown = async (tjDate: string) => {
    if (comnameSgsOptions.value.length) return
    try {
      const res = await dataReport.axiosRequestWjxs({
        current: 1,
        size: 9999,
        tjDate,
        comnameSgs: ''
      })
      if (Array.isArray(res) && res.length) {
        const set = new Set<string>()
        res.forEach((item: WjxsData) => {
          if (item.comname) set.add(item.comname)
        })
        comnameSgsOptions.value = Array.from(set)
          .sort()
          .map((v) => ({ label: v, value: v }))
        ElNotification({
          title: '提示',
          message: `已加载：${comnameSgsOptions.value.length} 个市公司`,
          type: 'success'
        })
      }
    } catch {
      /* ignore */
    }
  }

  // ==================== 6. 表格核心 Hook ====================
  const {
    data: tableData,
    loading,
    error: tableError,
    pagination,
    fetchData,
    refreshData,
    handleSizeChange,
    columns,
    columnChecks
  } = useEfficiencyTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<WjxsData>> => {
        const queryParams = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comnameSgs: tableApiParams.value.comnameSgs ?? ''
        }

        const response = await dataReport.axiosRequestWjxsPage(queryParams)
        const page = (response ?? {}) as UseTableResult<WjxsData>
        const records = page.records || []

        if (records.length) {
          if (!isInitialized.value) {
            fetchAllForDropdown(searchFormState.value.tjDate || tableApiParams.value.tjDate || '')
            isInitialized.value = true
          }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          // 无日期条件时默认回填最新数据日期
          if (!searchFormState.value.tjDate && records[0].maxTjTime) {
            const actualDate = records[0].maxTjTime.substring(0, 10)
            searchFormState.value.tjDate = actualDate
            tableApiParams.value.tjDate = actualDate
          }
        } else {
          currentMaxTjTime.value = ''
        }

        return {
          records,
          total: page.total ?? 0,
          current: params.current,
          size: params.size
        }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        {
          prop: 'comname',
          label: '机构名称',
          minWidth: 160,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        {
          prop: 'lflag',
          label: '类型',
          width: 100,
          align: 'center',
          sortable: true
        },
        { prop: 'hj', label: '未决总量', width: 120, align: 'center', sortable: true },
        { prop: 'bsrs', label: '不涉及人伤总量', width: 150, align: 'center', sortable: true },
        { prop: 'rs', label: '涉及人伤总量', width: 130, align: 'center', sortable: true },
        { prop: 'ztyj', label: '整体月均处理量', width: 150, align: 'center', sortable: true },
        {
          prop: 'bsrsyj',
          label: '不涉及人伤月均处理量',
          width: 180,
          align: 'center',
          sortable: true
        },
        {
          prop: 'rsyj',
          label: '涉及人伤月均处理量',
          width: 170,
          align: 'center',
          sortable: true
        },
        {
          prop: 'ztwjxs',
          label: '整体未决存量系数',
          width: 160,
          align: 'center',
          sortable: true
        },
        {
          prop: 'bsrswjxs',
          label: '不涉及人伤未决存量系数',
          width: 200,
          align: 'center',
          sortable: true
        },
        {
          prop: 'rswjxs',
          label: '涉及人伤未决存量系数',
          width: 190,
          align: 'center',
          sortable: true
        }
      ]
    },
    performance: {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
      debounceTime: 300,
      maxCacheSize: 100
    }
  })

  const { mergedData, spanMethod } = useMergeFirstColumn(tableData, columns)

  // ==================== 7. 分页事件 ====================
  const tableRef = ref<any>(null)
  const localHandleCurrentChange = (newCurrent: number) => {
    fetchData({ current: newCurrent })
  }

  // ==================== 8. 页面操作方法 ====================
  const handleRefresh = async () => {
    // 重置初始化标志和下拉，强制重新拉全量
    comnameSgsOptions.value = []
    isInitialized.value = false
    try {
      const res = await dataReport.axiosRequestWjxs({
        current: 1,
        size: 9999,
        tjDate: tableApiParams.value.tjDate || '',
        comnameSgs: ''
      })
      if (Array.isArray(res) && res.length) {
        currentMaxTjTime.value = res[0].maxTjTime || ''
        await fetchAllForDropdown(
          tableApiParams.value.tjDate || res[0].maxTjTime?.substring(0, 10) || ''
        )
        isInitialized.value = true
      }
      await fetchData()
    } catch {
      await fetchData()
    }
  }

  const handleSearch = async () => {
    try {
      if (searchBarRef.value) await searchBarRef.value.validate()
      tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
      refreshData()
      ElNotification({ title: '提示', message: '搜索成功', type: 'success' })
    } catch {
      ElNotification({ title: '错误', message: '搜索条件校验失败', type: 'error' })
    }
  }

  const handleReset = () => {
    searchFormState.value = { tjDate: '', comnameSgs: '' }
    tableApiParams.value = { current: 1, size: 20, ...searchFormState.value }
    refreshData()
  }

  // ==================== 9. 导出功能 ====================
  const handleExportCurrent = async () => {
    const data = tableData.value as WjxsData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }

    const exportData = data.map((item, index) => ({
      序号: index + 1,
      机构名称: item.comname,
      市公司: item.comnameSgs,
      类型: item.lflag,
      未决总量: item.hj,
      不涉及人伤总量: item.bsrs,
      涉及人伤总量: item.rs,
      整体月均处理量: item.ztyj,
      不涉及人伤月均处理量: item.bsrsyj,
      涉及人伤月均处理量: item.rsyj,
      整体未决存量系数: item.ztwjxs,
      不涉及人伤未决存量系数: item.bsrswjxs,
      涉及人伤未决存量系数: item.rswjxs
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '未决存量-案件类型')
    const fileName = `未决存量-案件类型_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(wb, fileName)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestWjxs({
        tjDate: tableApiParams.value.tjDate || '',
        comnameSgs: tableApiParams.value.comnameSgs ?? ''
      })
      const data = (Array.isArray(res) ? res : []) as WjxsData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }

      const exportData = data.map((item, index) => ({
        序号: index + 1,
        机构名称: item.comname,
        类型: item.lflag,
        未决总量: item.hj,
        不涉及人伤总量: item.bsrs,
        涉及人伤总量: item.rs,
        整体月均处理量: item.ztyj,
        不涉及人伤月均处理量: item.bsrsyj,
        涉及人伤月均处理量: item.rsyj,
        整体未决存量系数: item.ztwjxs,
        不涉及人伤未决存量系数: item.bsrswjxs,
        涉及人伤未决存量系数: item.rswjxs
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '未决存量-案件类型')
      const fileName = `未决存量-案件类型_全部_${new Date()
        .toLocaleDateString()
        .replace(/\//g, '-')}.xlsx`
      XLSX.writeFile(wb, fileName)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch {
      ElNotification({ title: '错误', message: '导出失败', type: 'error' })
    }
  }

  // ==================== 生命周期 ====================
  onMounted(async () => {
    await nextTick()
    if (searchBarRef.value) searchBarRef.value.$forceUpdate?.()
  })
</script>

<style scoped>
  :deep(.art-search-bar .el-form-item) {
    align-items: center;
    margin-bottom: 0;
  }
</style>
