<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchFormState"
      :items="searchItems"
      :rules="rules"
      :show-expand="false"
      :show-reset-button="true"
      :show-search-button="true"
      :disabled-search-button="false"
      @search="handleSearch"
      @reset="handleReset"
    />
    <ElCard class="flex-1 art-table-card" style="margin-top: 0; padding: 5px">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">综合赔付率-险种【统计时间：{{ currentMaxTjTime }}】</h4>
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
              <ElIcon><Download /></ElIcon>导出当前页
              <template #dropdown
                ><ElDropdownMenu
                  ><ElDropdownItem @click="handleExportAll"
                    >导出全部</ElDropdownItem
                  ></ElDropdownMenu
                ></template
              >
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
        <template #index="{ $index }"
          ><span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span></template
        >
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
  import { comprehensiveLossRate } from '../../api'
  defineOptions({ name: 'ZhpflXzTable' })

  interface Data {
    id: number | null | undefined
    tjDate: string | null
    comnameSgs: string
    xl: string
    jbf: number
    pfcb: number
    fy: number
    glfy: number
    zhcbl: string
    zhcblTb: string
    zhpl: string
    zhplTb: string
    maxTjTime: string | null
  }
  interface SelectOption {
    label: string
    value: string
  }
  interface UseTableParams {
    current: number
    size: number
    [k: string]: any
  }
  interface UseTableResult<T> {
    records: T[]
    total: number
    current: number
    size: number
  }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', xl: '' }

  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const xlOptions = ref<SelectOption[]>([])
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
      key: 'xl',
      label: '险种',
      type: 'select',
      props: { placeholder: '请选择险种', options: xlOptions.value, clearable: true }
    }
  ])

  // ==================== 5. 构建下拉 (全量版) ====================
  // 用独立的全量端点（/list, size: 9999）构建市公司下拉，避免首屏分页只有 20 行时遗漏
  // 后续页中才出现的市公司。返回的集合是全量的，与分页结果无关。
  const fetchAllForDropdown = async () => {
    if (xlOptions.value.length) return
    try {
      const res = await comprehensiveLossRate.axiosRequestZhpflXz({
        current: 1,
        size: 9999,
        tjDate: tableApiParams.value.tjDate || '',
        xl: tableApiParams.value.xl ?? ''
      })
      if (Array.isArray(res) && res.length) {
        const set = new Set<string>()
        res.forEach((item) => {
          if (item.xl) set.add(item.xl)
        })
        xlOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
        ElNotification({
          title: '提示',
          message: `已加载：${xlOptions.value.length} 个市公司`,
          type: 'success'
        })
      }
    } catch {
      /* ignore */
    }
  }
  const buildOptions = (data: Data[]) => {
    if (xlOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => {
      if (item.xl) set.add(item.xl)
    })
    xlOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
    ElNotification({
      title: '提示',
      message: `已加载：${xlOptions.value.length} 个险种`,
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
      apiFn: async (params: UseTableParams): Promise<UseTableResult<Data>> => {
        const queryParams = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          xl: tableApiParams.value.xl ?? ''
        }
        const response = await comprehensiveLossRate.axiosRequestZhpflXzPage(queryParams)
        const page = (response ?? {}) as UseTableResult<Data>
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
          minWidth: 200,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        { prop: 'xl', label: '险种', width: 120, align: 'center', fixed: 'left', sortable: true },
        { prop: 'jbf', label: '净保费', width: 140, align: 'center', sortable: true },
        { prop: 'pfcb', label: '赔付成本', width: 140, align: 'center', sortable: true },
        { prop: 'fy', label: '费用', width: 120, align: 'center', sortable: true },
        { prop: 'glfy', label: '管理费用', width: 120, align: 'center', sortable: true },
        { prop: 'zhcbl', label: '综合成本率', width: 130, align: 'center', sortable: true },
        { prop: 'zhcblTb', label: '综合成本率同比', width: 150, align: 'center', sortable: true },
        { prop: 'zhpl', label: '综合利润率', width: 130, align: 'center', sortable: true },
        { prop: 'zhplTb', label: '综合利润率同比', width: 150, align: 'center', sortable: true }
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
  const localHandleCurrentChange = (n: number) => {
    fetchData({ current: n })
  }
  const handleRefresh = async () => {
    try {
      const res = await comprehensiveLossRate.axiosRequestZhpflXz({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildOptions(res)
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
      tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
      refreshData()
    } catch {
      /* ignore */
    }
  }
  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }
  const exportColumns = (item: Data, i: number) => ({
    序号: i + 1,
    市公司: item.comnameSgs,
    险种: item.xl,
    净保费: item.jbf,
    赔付成本: item.pfcb,
    费用: item.fy,
    管理费用: item.glfy,
    综合成本率: item.zhcbl,
    综合成本率同比: item.zhcblTb,
    综合利润率: item.zhpl,
    综合利润率同比: item.zhplTb
  })
  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const handleExportCurrent = () => {
    const data = tableData.value as Data[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '综合赔付率-险种')
    XLSX.writeFile(wb, `综合赔付率-险种_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }
  const handleExportAll = async () => {
    try {
      const res = await comprehensiveLossRate.axiosRequestZhpflXz(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as Data[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '综合赔付率-险种')
      XLSX.writeFile(wb, `综合赔付率-险种_全部_${dateSuffix()}.xlsx`)
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
