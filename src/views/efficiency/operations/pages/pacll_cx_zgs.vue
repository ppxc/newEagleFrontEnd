<template>
  <div class="flex flex-col gap-2 pb-3">
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

    <ElCard class="flex-1 art-table-card" style="margin-top: 0; padding: 5px">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">车险结案率-支公司【统计时间：{{ currentMaxTjTime }}】</h4>
          <div class="flex gap-1">
            <ElTag v-if="tableError" type="danger">{{ tableError.message }}</ElTag>
            <ElTag v-else-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ tableData.length }} 条数据</ElTag>
          </div>
        </div>
      </template>

      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        @refresh="handleRefresh"
        layout="refresh,size,fullscreen,columns,settings"
        fullClass="art-table-card"
      >
        <template #left>
          <ElSpace wrap>
            <ElDropdown split-button type="primary" @click="handleExportCurrent" v-ripple>
              <ElIcon><Download /></ElIcon>
              导出当前页
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem @click="handleExportAll">导出全部</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :pagination="pagination"
        :data="mergedData"
        :span-method="spanMethod"
        :columns="columns"
        :height="tableHeight"
        :scrollbar-always-on="true"
        empty-height="660px"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="localHandleCurrentChange"
      >
        <template #index="{ $index }">
          <span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useEfficiencyTable } from '../../api/useEfficiencyTable'
  import { useMergeFirstColumn } from '../../api/useMergeFirstColumn'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'PacllCxZgsTable' })

  interface PacllCxZgsData {
    tjDate: string | null
    comnameSgs: string | null
    comname: string | null
    xzlBn: number | null
    yclBn: number | null
    qnWjl: number | null
    dqwj: number | null
    dqwjQn: number | null
    cll: number | null
    lajal: number | null
    cllTb: number | null
    lajalTb: number | null
    maxTjTime: string | null
  }
  interface SelectOption {
    label: string
    value: string
  }
  interface UseTableParams {
    current: number
    size: number
    [key: string]: any
  }
  interface UseTableResult<T> {
    records: T[]
    total: number
    current: number
    size: number
  }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comnameSgs: '' }

  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const comnameSgsOptions = ref<SelectOption[]>([])

  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    {
      key: 'tjDate',
      label: '统计时间',
      type: 'date',
      props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' }
    },
    {
      key: 'comnameSgs',
      label: '市公司',
      type: 'select',
      props: { placeholder: '请选择市公司', options: comnameSgsOptions.value, clearable: true }
    }
  ])

  // ==================== 5. 构建下拉 (全量版) ====================
  // 用独立的全量端点（/list, size: 9999）构建市公司下拉，避免首屏分页只有 20 行时遗漏
  // 后续页中才出现的市公司。返回的集合是全量的，与分页结果无关。
  const fetchAllForDropdown = async () => {
    if (comnameSgsOptions.value.length) return
    try {
      const res = await dataReport.axiosRequestPacllCxZgs({
        current: 1,
        size: 9999,
        tjDate: tableApiParams.value.tjDate || '',
        comnameSgs: tableApiParams.value.comnameSgs ?? ''
      })
      if (Array.isArray(res) && res.length) {
        const set = new Set<string>()
        res.forEach((item) => {
          if (item.comnameSgs) set.add(item.comnameSgs)
        })
        comnameSgsOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
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
  const buildSgsOptions = (data: PacllCxZgsData[]) => {
    if (comnameSgsOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => {
      if (item.comnameSgs) set.add(item.comnameSgs)
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
      apiFn: async (params: UseTableParams): Promise<UseTableResult<PacllCxZgsData>> => {
        const queryParams = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comnameSgs: tableApiParams.value.comnameSgs ?? ''
        }
        const response = await dataReport.axiosRequestPacllCxZgsPage(queryParams)
        const page = (response ?? {}) as UseTableResult<PacllCxZgsData>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) {
            fetchAllForDropdown()
            isInitialized = true
          }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) {
            searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10)
          }
        } else {
          currentMaxTjTime.value = ''
        }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        {
          prop: 'comnameSgs',
          label: '市公司',
          minWidth: 140,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        {
          prop: 'comname',
          label: '支公司',
          minWidth: 200,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        { prop: 'xzlBn', label: '新增案件量', width: 110, align: 'center', sortable: true },
        { prop: 'yclBn', label: '已结案件量', width: 110, align: 'center', sortable: true },
        { prop: 'qnWjl', label: '去年末未决', width: 110, align: 'center', sortable: true },
        { prop: 'dqwj', label: '当前未决', width: 100, align: 'center', sortable: true },
        { prop: 'dqwjQn', label: '去年同期未决', width: 120, align: 'center', sortable: true },
        { prop: 'cll', label: '结案率', width: 100, align: 'center', sortable: true },
        { prop: 'lajal', label: '立案结案率', width: 110, align: 'center', sortable: true },
        { prop: 'cllTb', label: '结案率同比', width: 110, align: 'center', sortable: true },
        { prop: 'lajalTb', label: '立案结案率同比', width: 130, align: 'center', sortable: true }
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

  const localHandleCurrentChange = (newCurrent: number) => fetchData({ current: newCurrent })
  // const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestPacllCxZgs({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildSgsOptions(res)
        currentMaxTjTime.value = res[0].maxTjTime || ''
      }
      await fetchData()
    } catch {
      await fetchData()
    }
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
    } catch {
      return
    }
    tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
    refreshData()
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }

  const exportColumns = (item: PacllCxZgsData, index: number) => ({
    序号: index + 1,
    市公司: item.comnameSgs,
    支公司: item.comname,
    新增案件量: item.xzlBn,
    已结案件量: item.yclBn,
    去年末未决: item.qnWjl,
    当前未决: item.dqwj,
    去年同期未决: item.dqwjQn,
    结案率: item.cll,
    立案结案率: item.lajal,
    结案率同比: item.cllTb,
    立案结案率同比: item.lajalTb
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '车险结案率-支公司'

  const handleExportCurrent = () => {
    const data = tableData.value as PacllCxZgsData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestPacllCxZgs(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as PacllCxZgsData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, SHEET)
      XLSX.writeFile(wb, `${SHEET}_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch {
      ElNotification({ title: '错误', message: '导出失败', type: 'error' })
    }
  }
</script>

<style scoped>
  :deep(.art-search-bar .el-form-item) {
    align-items: center;
    margin-bottom: 0;
  }
</style>
