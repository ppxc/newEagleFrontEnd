<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchFormState"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :show-reset-button="true"
      :show-search-button="true"
      :disabled-search-button="false"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="flex-1 art-table-card" style="margin-top: 0;padding: 5px;">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">赔案处理率-部门实时</h4>
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
        :data="tableData"
        :columns="columns"
        :height="tableHeight"
        :scrollbar-always-on="true"
        empty-height="660px"
        @pagination:size-change="localHandleSizeChange"
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
  import { useTable } from '@/hooks/core/useTable'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'PacllBmShishiTable' })

  interface PacllBmShishiData {
    comname: string | null
    pacll: number | null
    xzl: number | null
    yjl: number | null
    wjl: number | null
  }
  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { comname: '' }

  const searchBarRef = ref<any>(null)
  let isInitialized = false
  const comnameOptions = ref<SelectOption[]>([])

  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    { key: 'comname', label: '部门', type: 'select', props: { placeholder: '请选择部门', options: comnameOptions.value, clearable: true } }
  ])

  const buildDeptOptions = (data: PacllBmShishiData[]) => {
    if (comnameOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => { if (item.comname) set.add(item.comname) })
    comnameOptions.value = Array.from(set).sort().map((v) => ({ label: v, value: v }))
    ElNotification({ title: '提示', message: `已加载：${comnameOptions.value.length} 个部门`, type: 'success' })
  }

  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<PacllBmShishiData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          comname: tableApiParams.value.comname ?? ''
        }
        const response = await dataReport.axiosRequestPacllBmShishiPage(queryParams)
        const page = (response ?? {}) as UseTableResult<PacllBmShishiData>
        const records = page.records || []
        if (records.length && !isInitialized) { buildDeptOptions(records); isInitialized = true }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        { prop: 'comname', label: '部门', minWidth: 220, align: 'center', fixed: 'left', sortable: true },
        { prop: 'pacll', label: '赔案处理率', width: 120, align: 'center', sortable: true, formatter: (row: any) => row.pacll != null ? (row.pacll * 100).toFixed(2) + '%' : '' },
        { prop: 'xzl', label: '新增案件量', width: 110, align: 'center', sortable: true },
        { prop: 'yjl', label: '已决案件量', width: 110, align: 'center', sortable: true },
        { prop: 'wjl', label: '未决案件量', width: 110, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  const localHandleCurrentChange = (newCurrent: number) => fetchData({ current: newCurrent })
  const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestPacllBmShishi({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) buildDeptOptions(res)
      await fetchData()
    } catch { await fetchData() }
  }

  const handleSearch = async () => {
    try { await searchBarRef.value?.validate() } catch { return }
    tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
    refreshData()
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }

  const exportColumns = (item: PacllBmShishiData, index: number) => ({
    序号: index + 1,
    部门: item.comname,
    赔案处理率: item.pacll != null ? (item.pacll * 100).toFixed(2) + '%' : '',
    新增案件量: item.xzl,
    已决案件量: item.yjl,
    未决案件量: item.wjl
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '赔案处理率-部门实时'

  const handleExportCurrent = () => {
    const data = tableData.value as PacllBmShishiData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestPacllBmShishi(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as PacllBmShishiData[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, SHEET)
      XLSX.writeFile(wb, `${SHEET}_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>

<style scoped>
  :deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }
</style>
