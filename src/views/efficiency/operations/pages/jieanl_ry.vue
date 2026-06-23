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

    <ElCard class="flex-1 art-table-card" style="margin-top: 0;padding: 5px;">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">每日结案量-人员实时【统计时间：{{ currentMaxTjTime }}】</h4>
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

  defineOptions({ name: 'JieanlRyTable' })

  interface JieanlRyData {
    tjDate: string | null
    comname: string | null
    username: string | null
    hj: number | null
    day01: number | null; day02: number | null; day03: number | null; day04: number | null
    day05: number | null; day06: number | null; day07: number | null; day08: number | null
    day09: number | null; day10: number | null; day11: number | null; day12: number | null
    day13: number | null; day14: number | null; day15: number | null; day16: number | null
    day17: number | null; day18: number | null; day19: number | null; day20: number | null
    day21: number | null; day22: number | null; day23: number | null; day24: number | null
    day25: number | null; day26: number | null; day27: number | null; day28: number | null
    day29: number | null; day30: number | null; day31: number | null
    maxTjTime: string | null
  }
  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comname: '' }

  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const comnameOptions = ref<SelectOption[]>([])

  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comname', label: '部门', type: 'select', props: { placeholder: '请选择部门', options: comnameOptions.value, clearable: true } }
  ])

  const buildDeptOptions = (data: JieanlRyData[]) => {
    if (comnameOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => { if (item.comname) set.add(item.comname) })
    comnameOptions.value = Array.from(set).sort().map((v) => ({ label: v, value: v }))
    ElNotification({ title: '提示', message: `已加载：${comnameOptions.value.length} 个部门`, type: 'success' })
  }

  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<JieanlRyData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comname: tableApiParams.value.comname ?? ''
        }
        const response = await dataReport.axiosRequestJieanlRyPage(queryParams)
        const page = (response ?? {}) as UseTableResult<JieanlRyData>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) { buildDeptOptions(records); isInitialized = true }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) {
            searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10)
          }
        } else { currentMaxTjTime.value = '' }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        { prop: 'comname', label: '部门', minWidth: 180, align: 'center', fixed: 'left', sortable: true },
        { prop: 'username', label: '人员', minWidth: 100, align: 'center', fixed: 'left' },
        { prop: 'hj', label: '汇总', width: 100, align: 'center', sortable: true, fixed: 'right' },
        ...Array.from({ length: 31 }, (_, i) => {
          const n = i + 1
          const day = n < 10 ? `0${n}` : `${n}`
          return { prop: `day${day}`, label: `${n}号`, width: 70, align: 'center' as const, sortable: true }
        })
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  const localHandleCurrentChange = (newCurrent: number) => fetchData({ current: newCurrent })
  const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestJieanlRy({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildDeptOptions(res)
        currentMaxTjTime.value = res[0].maxTjTime || ''
      }
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

  const dayVal = (it: JieanlRyData, n: number) => (it as any)[`day${n < 10 ? '0' + n : n}`]

  const exportColumns = (item: JieanlRyData, index: number) => {
    const row: any = { 序号: index + 1, 部门: item.comname, 人员: item.username, 汇总: item.hj }
    for (let n = 1; n <= 31; n++) row[`${n}号`] = dayVal(item, n)
    return row
  }

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '每日结案量-人员实时'

  const handleExportCurrent = () => {
    const data = tableData.value as JieanlRyData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestJieanlRy(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as JieanlRyData[]
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
