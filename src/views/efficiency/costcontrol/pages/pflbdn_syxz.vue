<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar ref="searchBarRef" v-model="searchFormState" :items="searchItems" :rules="rules" :show-expand="false" :show-reset-button="true" :show-search-button="true" :disabled-search-button="false" @search="handleSearch" @reset="handleReset" />
    <ElCard class="flex-1 art-table-card" style="margin-top: 0;padding: 5px;">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">保单年赔付率-使用性质【统计时间：{{ currentMaxTjTime }}】</h4>
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
  import { policyYearLossRate } from '../../api'
  defineOptions({ name: 'PflbdnSyxzTable' })

  interface Data {
    id: number | null | undefined; tjDate: string | null
    comnameSgs: string; usenaturename: string
    sumpaidYh: number | null; sumpaidWh: number | null; sumpaidHj: number | null; yzbf19: number | null
    sgndPfl: string; pflTb: string
    yjAjl: number | null; wjAjl: number | null; ajl: number | null; yzbd: number | null
    clv: string; clvTb: string
    yhaj: number | null; whaj: number | null; bgaj: number | null; bgajTb: string
    djyz: number | null; djyzTb: string
    yjCs: number | null; yjRs: number | null; yjWs: number | null
    csAjl: number | null; rsAjl: number | null; wsAjl: number | null
    csYjaj: number | null; rsYjaj: number | null; wsYjaj: number | null
    maxTjTime: string | null
  }
  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [k: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comnameSgs: '', usenaturename: '' }

  const searchBarRef = ref<any>(null); const currentMaxTjTime = ref<string>('')
  let isInitialized = false; const comOptions = ref<SelectOption[]>([]); const useOptions = ref<SelectOption[]>([])
  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM }); const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })
  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comnameSgs', label: '市公司', type: 'select', props: { placeholder: '请选择市公司', options: comOptions.value, clearable: true } },
    { key: 'usenaturename', label: '使用性质', type: 'select', props: { placeholder: '请选择使用性质', options: useOptions.value, clearable: true } }
  ])
  const buildOptions = (data: Data[]) => {
    if (comOptions.value.length && useOptions.value.length) return
    const comSet = new Set<string>(); const useSet = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) comSet.add(item.comnameSgs); if (item.usenaturename) useSet.add(item.usenaturename) })
    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
    useOptions.value = Array.from(useSet).map((name) => ({ label: name, value: name }))
    ElNotification({ title: '提示', message: `已加载：${comOptions.value.length} 个市公司 / ${useOptions.value.length} 个使用性质`, type: 'success' })
  }
  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<Data>> => {
        const queryParams = { current: params.current, size: params.size, tjDate: tableApiParams.value.tjDate || '', comnameSgs: tableApiParams.value.comnameSgs ?? '', usenaturename: tableApiParams.value.usenaturename ?? '' }
        const response = await policyYearLossRate.axiosRequestPflbdnSyxzPage(queryParams)
        const page = (response ?? {}) as UseTableResult<Data>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) { buildOptions(records); isInitialized = true }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) { searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10) }
        } else { currentMaxTjTime.value = '' }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value, immediate: true,
      columnsFactory: () => [
        { prop: 'comnameSgs', label: '市公司', minWidth: 200, align: 'center', fixed: 'left', sortable: true },
        { prop: 'usenaturename', label: '使用性质', width: 120, align: 'center', fixed: 'left', sortable: true },
        { prop: 'sumpaidYh', label: '已核赔款(元)', width: 140, align: 'center', sortable: true },
        { prop: 'sumpaidWh', label: '未核赔款(元)', width: 140, align: 'center', sortable: true },
        { prop: 'sumpaidHj', label: '赔款合计(元)', width: 140, align: 'center', sortable: true },
        { prop: 'yzbf19', label: '已赚保费(元)', width: 140, align: 'center', sortable: true },
        { prop: 'sgndPfl', label: '赔付率', width: 100, align: 'center', sortable: true },
        { prop: 'pflTb', label: '赔付率同比', width: 110, align: 'center', sortable: true },
        { prop: 'yjAjl', label: '已决案件量', width: 110, align: 'center', sortable: true },
        { prop: 'wjAjl', label: '未决案件', width: 100, align: 'center', sortable: true },
        { prop: 'ajl', label: '已报案件量', width: 110, align: 'center', sortable: true },
        { prop: 'yzbd', label: '已赚保单', width: 100, align: 'center', sortable: true },
        { prop: 'clv', label: '出险率', width: 90, align: 'center', sortable: true },
        { prop: 'clvTb', label: '出险率同比', width: 110, align: 'center', sortable: true },
        { prop: 'yhaj', label: '已核案均(元)', width: 130, align: 'center', sortable: true },
        { prop: 'whaj', label: '未决案均(元)', width: 130, align: 'center', sortable: true },
        { prop: 'bgaj', label: '已报告案均', width: 120, align: 'center', sortable: true },
        { prop: 'bgajTb', label: '报告案均同比', width: 120, align: 'center', sortable: true },
        { prop: 'djyz', label: '单均已赚', width: 100, align: 'center', sortable: true },
        { prop: 'djyzTb', label: '单均已赚同比', width: 120, align: 'center', sortable: true },
        { prop: 'yjCs', label: '车损已决(元)', width: 140, align: 'center', sortable: true },
        { prop: 'yjRs', label: '人伤已决(元)', width: 140, align: 'center', sortable: true },
        { prop: 'yjWs', label: '物损已决(元)', width: 140, align: 'center', sortable: true },
        { prop: 'csAjl', label: '车损已决案件量', width: 140, align: 'center', sortable: true },
        { prop: 'rsAjl', label: '人伤已决案件量', width: 140, align: 'center', sortable: true },
        { prop: 'wsAjl', label: '物损已决案件量', width: 140, align: 'center', sortable: true },
        { prop: 'csYjaj', label: '车损已决案均(元)', width: 150, align: 'center', sortable: true },
        { prop: 'rsYjaj', label: '人伤已决案均(元)', width: 150, align: 'center', sortable: true },
        { prop: 'wsYjaj', label: '物损已决案均(元)', width: 150, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })
  const localHandleCurrentChange = (n: number) => { fetchData({ current: n }) }
  const localHandleSizeChange = (n: number) => { fetchData({ size: n, current: 1 }) }
  const handleRefresh = async () => { try { const res = await policyYearLossRate.axiosRequestPflbdnSyxz({ current: 1, size: 9999 }); if (Array.isArray(res) && res.length) { buildOptions(res); currentMaxTjTime.value = res[0].maxTjTime || '' } await fetchData() } catch { await fetchData() } }
  const handleSearch = async () => { try { await searchBarRef.value?.validate(); tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }; refreshData() } catch {} }
  const handleReset = () => { Object.assign(searchFormState.value, DEFAULT_FORM); tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }; refreshData() }
  const exportColumns = (item: Data, i: number) => ({
    序号: i + 1, 市公司: item.comnameSgs, 使用性质: item.usenaturename,
    '已核赔款(元)': item.sumpaidYh, '未核赔款(元)': item.sumpaidWh, '赔款合计(元)': item.sumpaidHj, '已赚保费(元)': item.yzbf19,
    赔付率: item.sgndPfl, '赔付率同比': item.pflTb, 已决案件量: item.yjAjl, 未决案件: item.wjAjl, 已报案件量: item.ajl,
    已赚保单: item.yzbd, 出险率: item.clv, '出险率同比': item.clvTb, '已核案均(元)': item.yhaj, '未决案均(元)': item.whaj,
    已报告案均: item.bgaj, '报告案均同比': item.bgajTb, 单均已赚: item.djyz, '单均已赚同比': item.djyzTb,
    '车损已决(元)': item.yjCs, '人伤已决(元)': item.yjRs, '物损已决(元)': item.yjWs,
    车损已决案件量: item.csAjl, 人伤已决案件量: item.rsAjl, 物损已决案件量: item.wsAjl,
    '车损已决案均(元)': item.csYjaj, '人伤已决案均(元)': item.rsYjaj, '物损已决案均(元)': item.wsYjaj
  })
  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const handleExportCurrent = () => {
    const data = tableData.value as Data[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '保单年赔付率-使用性质'); XLSX.writeFile(wb, `保单年赔付率-使用性质_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }
  const handleExportAll = async () => {
    try {
      const res = await policyYearLossRate.axiosRequestPflbdnSyxz(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as Data[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns)); const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '保单年赔付率-使用性质'); XLSX.writeFile(wb, `保单年赔付率-使用性质_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>
<style scoped>:deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }</style>
