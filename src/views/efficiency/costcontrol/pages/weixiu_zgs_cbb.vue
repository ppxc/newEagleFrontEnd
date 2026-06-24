<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar ref="searchBarRef" v-model="searchFormState" :items="searchItems" :rules="rules" :show-expand="false" :show-reset-button="true" :show-search-button="true" :disabled-search-button="false" @search="handleSearch" @reset="handleReset" />
    <ElCard class="flex-1 art-table-card" style="margin-top: 0;padding: 5px;">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">各支公司产保比【统计时间：{{ currentMaxTjTime }}】</h4>
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
      <ArtTable :loading="loading" :pagination="pagination" :data="tableData" :columns="columns" :height="tableHeight" :scrollbar-always-on="true" empty-height="660px" merge-first-column @pagination:size-change="handleSizeChange" @pagination:current-change="localHandleCurrentChange">
        <template #index="{ $index }"><span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span></template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useEfficiencyTable } from '../../api/useEfficiencyTable'
  import * as XLSX from 'xlsx'
  import { repairShop } from '../../api'
  defineOptions({ name: 'WeixiuZgsCbbTable' })

  interface Data {
    id: number | null | undefined; tjDate: string | null
    comnameSgs: string; comcodeSgs: string; comname: string; gscomcode: string
    repairfactorytype: string
    sumverilossfee: number | null; sumpremium: number | null
    cbb: string
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
    { key: 'tjDate', label: '统计时间', type: 'date', span: 5, props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comnameSgs', label: '市公司', type: 'select', span: 5, props: { placeholder: '请选择市公司', options: comOptions.value, clearable: true } }
  ])
  const buildDeptOptions = (data: Data[]) => {
    if (comOptions.value.length) return
    const comSet = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) comSet.add(item.comnameSgs) })
    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
    ElNotification({ title: '提示', message: `已加载：${comOptions.value.length} 个市公司`, type: 'success' })
  }
  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, handleSizeChange, columns, columnChecks } = useEfficiencyTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<Data>> => {
        const queryParams = { current: params.current, size: params.size, tjDate: tableApiParams.value.tjDate || '', comnameSgs: tableApiParams.value.comnameSgs ?? '' }
        const response = await repairShop.axiosRequestZgsCbbPage(queryParams)
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
        { prop: 'comnameSgs', label: '市公司', minWidth: 160, align: 'center', fixed: 'left', sortable: true },
        { prop: 'comname', label: '支公司', minWidth: 160, align: 'center', fixed: 'left', sortable: true },
        { prop: 'gscomcode', label: '机构代码', width: 120, align: 'center', sortable: true },
        { prop: 'repairfactorytype', label: '类型', width: 80, align: 'center', sortable: true },
        { prop: 'sumverilossfee', label: '定损金额（元）', width: 150, align: 'center', sortable: true },
        { prop: 'sumpremium', label: '签单保费（元）', width: 150, align: 'center', sortable: true },
        { prop: 'cbb', label: '产保比', width: 100, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })
  const localHandleCurrentChange = (n: number) => { fetchData({ current: n }) }
  const handleRefresh = async () => { try { const res = await repairShop.axiosRequestZgsCbb({ current: 1, size: 9999 }); if (Array.isArray(res) && res.length) { buildDeptOptions(res); currentMaxTjTime.value = res[0].maxTjTime || '' } await fetchData() } catch { await fetchData() } }
  const handleSearch = async () => { try { await searchBarRef.value?.validate(); tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }; refreshData() } catch {} }
  const handleReset = () => { Object.assign(searchFormState.value, DEFAULT_FORM); tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }; refreshData() }
  const exportColumns = (item: Data, i: number) => ({
    序号: i + 1, 市公司: item.comnameSgs, 支公司: item.comname,
    机构代码: item.gscomcode, 类型: item.repairfactorytype,
    '定损金额（元）': item.sumverilossfee, '签单保费（元）': item.sumpremium,
    产保比: item.cbb
  })
  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const handleExportCurrent = () => {
    const data = tableData.value as Data[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '各支公司产保比'); XLSX.writeFile(wb, `各支公司产保比_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }
  const handleExportAll = async () => {
    try {
      const res = await repairShop.axiosRequestZgsCbb(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as Data[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '各支公司产保比'); XLSX.writeFile(wb, `各支公司产保比_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>
<style scoped>:deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }</style>
