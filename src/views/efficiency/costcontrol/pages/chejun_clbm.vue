<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar ref="searchBarRef" v-model="searchFormState" :items="searchItems" :rules="rules" :show-expand="false" :show-reset-button="true" :show-search-button="true" :disabled-search-button="false" @search="handleSearch" @reset="handleReset" />
    <ElCard class="flex-1 art-table-card" style="margin-top: 0;padding: 5px;">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">车均定损-处理部门【统计时间：{{ currentMaxTjTime }}】</h4>
          <div class="flex gap-1">
            <ElTag v-if="tableError" type="danger">{{ tableError.message }}</ElTag>
            <ElTag v-else-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ tableData.length }} 条数据</ElTag>
          </div>
        </div>
      </template>
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="handleRefresh" layout="refresh,size,fullscreen,columns,settings" fullClass="art-table-card">
        <template #left>
          <ElSpace wrap>
            <ElDropdown split-button type="primary" @click="handleExportCurrent" v-ripple>
              <ElIcon><Download /></ElIcon>导出当前页
              <template #dropdown><ElDropdownMenu><ElDropdownItem @click="handleExportAll">导出全部</ElDropdownItem></ElDropdownMenu></template>
            </ElDropdown>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable :loading="loading" :pagination="pagination" :data="tableData" :columns="columns" :height="tableHeight" :scrollbar-always-on="true" empty-height="660px" merge-first-column @pagination:size-change="localHandleSizeChange" @pagination:current-change="localHandleCurrentChange">
        <template #index="{ $index }"><span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span></template>
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
  import { carAvgLoss } from '../../api'
  defineOptions({ name: 'ChejunClbmTable' })

  interface Data {
    id: number | null | undefined; tjdate: string | null
    comcodeSgs: string; comnameSgs: string; comcode: string; comname: string
    ajsBn: number | null; ajsTb: number | null
    dsjeBn: number | null; dsjeTb: number | null
    cjBn: number | null; cjTb: number | null
    lwnCjBn: number | null; lwnCjTb: number | null
    lwysCjBn: number | null; lwysCjTb: number | null
    hjcjBn: number | null; hjcjTb: number | null
    gscjBn: number | null; gscjTb: number | null
    hxb: number | null; hxbTb: number | null
    ajsQn: number | null; dsjeQn: number | null; cjQn: number | null
    lwnCjQn: number | null; lwysCjQn: number | null
    hjcjQn: number | null; gscjQn: number | null; hxbQn: number | null
    maxTjTime: string | null
  }
  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [k: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comnameSgs: '' }

  const searchBarRef = ref<any>(null); const currentMaxTjTime = ref<string>('')
  let isInitialized = false; const comOptions = ref<SelectOption[]>([])
  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM }); const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })
  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', span: 6, props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comnameSgs', label: '市公司', type: 'select', span: 6, props: { placeholder: '请选择市公司', options: comOptions.value, clearable: true } }
  ])
  const buildDeptOptions = (data: Data[]) => {
    if (comOptions.value.length) return
    const comSet = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) comSet.add(item.comnameSgs) })
    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
    ElNotification({ title: '提示', message: `已加载：${comOptions.value.length} 个市公司`, type: 'success' })
  }
  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<Data>> => {
        const queryParams = { current: params.current, size: params.size, tjDate: tableApiParams.value.tjDate || '', comnameSgs: tableApiParams.value.comnameSgs ?? '' }
        const response = await carAvgLoss.axiosRequestChejunClbmPage(queryParams)
        const page = (response ?? {}) as UseTableResult<Data>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) { buildDeptOptions(records); isInitialized = true }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) { searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10) }
        } else { currentMaxTjTime.value = '' }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value, immediate: true,
      columnsFactory: () => [
        { prop: 'comnameSgs', label: '市公司（定损地）', minWidth: 130, align: 'center', fixed: 'left', sortable: true },
        { prop: 'comname', label: '处理部门', minWidth: 150, align: 'center', fixed: 'left', sortable: true },
        { prop: 'ajsBn', label: '定损台数', width: 100, align: 'center', sortable: true },
        { prop: 'ajsTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'dsjeBn', label: '定损金额（万元）', width: 130, align: 'center', sortable: true },
        { prop: 'dsjeTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'cjBn', label: '车均定损（整体）', width: 130, align: 'center', sortable: true },
        { prop: 'cjTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'lwnCjBn', label: '车均定损（2万内）', width: 130, align: 'center', sortable: true },
        { prop: 'lwnCjTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'lwysCjBn', label: '车均定损（2万以上）', width: 140, align: 'center', sortable: true },
        { prop: 'lwysCjTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'hjcjBn', label: '车均换件（元）', width: 130, align: 'center', sortable: true },
        { prop: 'hjcjTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'gscjBn', label: '车均工时（元）', width: 130, align: 'center', sortable: true },
        { prop: 'gscjTb', label: '同比（%）', width: 100, align: 'center', sortable: true },
        { prop: 'hxb', label: '换修比', width: 90, align: 'center', sortable: true },
        { prop: 'hxbTb', label: '同比（%）', width: 100, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })
  const localHandleCurrentChange = (n: number) => { fetchData({ current: n }) }
  const localHandleSizeChange = (n: number) => { fetchData({ size: n, current: 1 }) }
  const handleRefresh = async () => { try { const res = await carAvgLoss.axiosRequestChejunClbm({ current: 1, size: 9999 }); if (Array.isArray(res) && res.length) { buildDeptOptions(res); currentMaxTjTime.value = res[0].maxTjTime || '' } await fetchData() } catch { await fetchData() } }
  const handleSearch = async () => { try { await searchBarRef.value?.validate(); tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }; refreshData() } catch {} }
  const handleReset = () => { Object.assign(searchFormState.value, DEFAULT_FORM); tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }; refreshData() }
  const exportColumns = (item: Data, i: number) => ({
    序号: i + 1, '市公司（定损地）': item.comnameSgs, 处理部门: item.comname,
    定损台数: item.ajsBn, 同比: item.ajsTb,
    '定损金额（万元）': item.dsjeBn, 同比: item.dsjeTb,
    '车均定损（整体）': item.cjBn, 同比: item.cjTb,
    '车均定损（2万内）': item.lwnCjBn, 同比: item.lwnCjTb,
    '车均定损（2万以上）': item.lwysCjBn, 同比: item.lwysCjTb,
    '车均换件（元）': item.hjcjBn, 同比: item.hjcjTb,
    '车均工时（元）': item.gscjBn, 同比: item.gscjTb,
    换修比: item.hxb, 同比: item.hxbTb
  })
  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const handleExportCurrent = () => {
    const data = tableData.value as Data[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '车均定损-处理部门'); XLSX.writeFile(wb, `车均定损-处理部门_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }
  const handleExportAll = async () => {
    try {
      const res = await carAvgLoss.axiosRequestChejunClbm({ tjDate: tableApiParams.value.tjDate || '', comnameSgs: tableApiParams.value.comnameSgs ?? '' })
      const data = (Array.isArray(res) ? res : []) as Data[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '车均定损-处理部门'); XLSX.writeFile(wb, `车均定损-处理部门_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>
<style scoped>:deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }</style>
