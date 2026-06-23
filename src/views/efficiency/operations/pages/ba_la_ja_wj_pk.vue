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
          <h4 class="m-0">车险案件量-承保地【统计时间：{{ currentMaxTjTime }}】</h4>
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

  defineOptions({ name: 'BaLaJaWjPkTable' })

  interface BaLaJaWjPkData {
    tjDate: string | null
    comnameSgs: string | null
    bal: number | null; balTb: number | null
    balRs: number | null; balRsTb: number | null
    rsbaZb: string | null; rsbaZbTb: number | null
    lal: number | null; lalTb: number | null
    jal: number | null; jalTb: number | null
    wjl: number | null; wjlTb: number | null
    sumestipaid: number | null; sumestipaidTb: number | null
    sumpaid: number | null; sumpaidTb: number | null
    sumpaidCs: number | null; sumpaidCsTb: number | null
    sumpaidRs: number | null; sumpaidRsTb: number | null
    rspkZb: string | null; rspkZbTb: number | null
    maxTjTime: string | null
  }
  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

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
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comnameSgs', label: '市公司', type: 'select', props: { placeholder: '请选择市公司', options: comnameSgsOptions.value, clearable: true } }
  ])

  const buildSgsOptions = (data: BaLaJaWjPkData[]) => {
    if (comnameSgsOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) set.add(item.comnameSgs) })
    comnameSgsOptions.value = Array.from(set).sort().map((v) => ({ label: v, value: v }))
    ElNotification({ title: '提示', message: `已加载：${comnameSgsOptions.value.length} 个市公司`, type: 'success' })
  }

  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<BaLaJaWjPkData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comnameSgs: tableApiParams.value.comnameSgs ?? ''
        }
        const response = await dataReport.axiosRequestBaLaJaWjPkPage(queryParams)
        const page = (response ?? {}) as UseTableResult<BaLaJaWjPkData>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) { buildSgsOptions(records); isInitialized = true }
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
        { prop: 'comnameSgs', label: '市公司', minWidth: 160, align: 'center', fixed: 'left', sortable: true },
        { prop: 'bal', label: '报案量', width: 100, align: 'center', sortable: true },
        { prop: 'balTb', label: '报案量同比', width: 110, align: 'center', sortable: true },
        { prop: 'balRs', label: '人伤报案量', width: 110, align: 'center', sortable: true },
        { prop: 'balRsTb', label: '人伤报案量同比', width: 130, align: 'center', sortable: true },
        { prop: 'rsbaZb', label: '人伤案件占比', width: 120, align: 'center' },
        { prop: 'rsbaZbTb', label: '人伤案件占比同比', width: 140, align: 'center' },
        { prop: 'lal', label: '立案量', width: 100, align: 'center', sortable: true },
        { prop: 'lalTb', label: '立案量同比', width: 110, align: 'center', sortable: true },
        { prop: 'jal', label: '结案量', width: 100, align: 'center', sortable: true },
        { prop: 'jalTb', label: '结案量同比', width: 110, align: 'center', sortable: true },
        { prop: 'wjl', label: '未决存量', width: 100, align: 'center', sortable: true },
        { prop: 'wjlTb', label: '未决存量同比', width: 120, align: 'center', sortable: true },
        { prop: 'sumestipaid', label: '未决估计赔款（亿）', width: 140, align: 'center', sortable: true },
        { prop: 'sumestipaidTb', label: '估计赔款同比', width: 130, align: 'center' },
        { prop: 'sumpaid', label: '整体结案金额（亿）', width: 140, align: 'center', sortable: true },
        { prop: 'sumpaidTb', label: '整体结案金额同比', width: 150, align: 'center' },
        { prop: 'sumpaidCs', label: '车损结案金额（亿）', width: 140, align: 'center', sortable: true },
        { prop: 'sumpaidCsTb', label: '车损结案金额同比', width: 150, align: 'center' },
        { prop: 'sumpaidRs', label: '人伤结案金额（亿）', width: 140, align: 'center', sortable: true },
        { prop: 'sumpaidRsTb', label: '人伤结案金额同比', width: 150, align: 'center' },
        { prop: 'rspkZb', label: '人伤赔款占比', width: 120, align: 'center' },
        { prop: 'rspkZbTb', label: '人伤赔款占比同比', width: 140, align: 'center' }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  const localHandleCurrentChange = (newCurrent: number) => fetchData({ current: newCurrent })
  const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestBaLaJaWjPk({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildSgsOptions(res)
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

  const exportColumns = (item: BaLaJaWjPkData, index: number) => ({
    序号: index + 1, 市公司: item.comnameSgs,
    报案量: item.bal, 报案量同比: item.balTb,
    人伤报案量: item.balRs, 人伤报案量同比: item.balRsTb,
    人伤案件占比: item.rsbaZb, 人伤案件占比同比: item.rsbaZbTb,
    立案量: item.lal, 立案量同比: item.lalTb,
    结案量: item.jal, 结案量同比: item.jalTb,
    未决存量: item.wjl, 未决存量同比: item.wjlTb,
    未决估计赔款: item.sumestipaid, 估计赔款同比: item.sumestipaidTb,
    整体结案金额: item.sumpaid, 整体结案金额同比: item.sumpaidTb,
    车损结案金额: item.sumpaidCs, 车损结案金额同比: item.sumpaidCsTb,
    人伤结案金额: item.sumpaidRs, 人伤结案金额同比: item.sumpaidRsTb,
    人伤赔款占比: item.rspkZb, 人伤赔款占比同比: item.rspkZbTb
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '车险案件量-承保地'

  const handleExportCurrent = () => {
    const data = tableData.value as BaLaJaWjPkData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestBaLaJaWjPk(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as BaLaJaWjPkData[]
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
