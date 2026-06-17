<template>
  <div class="flex flex-col gap-2 pb-3">
    <ArtSearchBar
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
          <h4 class="m-0">案均赔款-新能源（车险）【统计时间：{{ currentMaxTjTime }}】</h4>
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
        merge-first-column
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #index="{ $index }">
          <span>{{ $index + 1 + (pagination.current - 1) * pagination.size }}</span>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import * as XLSX from 'xlsx'
  import { claimAverage } from '../../api'

  defineOptions({ name: 'AnjunCxXnyTable' })

  // ==================== 1. 类型定义 ====================
  interface AnjunCxXnyData {
    id: number | null | undefined
    tjDate: string | null
    comcodeSgs: string
    comnameSgs: string
    xnyflag: string
    // 整体车险
    sumpaidZt: number
    ajlZt: number
    ajZt: number
    ajZtTb: string
    // 车损
    sumpaidCs: number
    ajlCs: number
    ajCs: number
    ajCsTb: string
    // 人伤
    sumpaidRs: number
    ajlRs: number
    ajRs: number
    ajRsTb: string
    // 交强险
    sumpaidDza: number
    ajlDza: number
    ajDza: number
    ajDzaTb: string
    // 商业险
    sumpaidDaa: number
    ajlDaa: number
    ajDaa: number
    ajDaaTb: string
    // 去年指标
    sumpaidZtQn: number
    ajlZtQn: number
    ajZtQn: number
    sumpaidCsQn: number
    ajlCsQn: number
    ajCsQn: number
    sumpaidRsQn: number
    ajlRsQn: number
    ajRsQn: number
    sumpaidDzaQn: number
    ajlDzaQn: number
    ajDzaQn: number
    sumpaidDaaQn: number
    ajlDaaQn: number
    ajDaaQn: number
    maxTjTime: string | null
  }

  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  // ==================== 2. 常量 ====================
  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comnameSgs: '' }

  // ==================== 3. 状态 ====================
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const comOptions = ref<SelectOption[]>([])

  // ==================== 4. 搜索表单 ====================
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comnameSgs', label: '市公司', type: 'select', props: { placeholder: '请选择市公司', options: comOptions.value, clearable: true } }
  ])

  // ==================== 5. 构建下拉 ====================
  const buildDeptOptions = (data: AnjunCxXnyData[]) => {
    if (comOptions.value.length) return
    const comSet = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) comSet.add(item.comnameSgs) })
    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
  }

  // ==================== 6. 表格 Hook ====================
  const { data: tableData, loading, error: tableError, pagination, refreshData, handleSizeChange, handleCurrentChange, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<AnjunCxXnyData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate,
          comnameSgs: tableApiParams.value.comnameSgs
        }
        const response = await claimAverage.axiosRequestAnjunCxXny(queryParams)
        let tableResultData: AnjunCxXnyData[] = []
        if (Array.isArray(response)) {
          tableResultData = response
          if (!isInitialized && tableResultData.length) {
            buildDeptOptions(tableResultData)
            isInitialized = true
          }
          if (tableResultData.length) {
            currentMaxTjTime.value = tableResultData[0].maxTjTime || ''
            if (!searchFormState.value.tjDate && tableResultData[0].maxTjTime) {
              searchFormState.value.tjDate = tableResultData[0].maxTjTime.substring(0, 10)
            }
          } else { currentMaxTjTime.value = '' }
        }
        const start = (params.current - 1) * params.size
        return { records: tableResultData.slice(start, start + params.size), total: tableResultData.length, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        { prop: 'comnameSgs', label: '市公司', minWidth: 200, align: 'center', fixed: 'left', sortable: true },
        { prop: 'xnyflag', label: '新能源', minWidth: 120, align: 'center', fixed: 'left', sortable: true },
        { prop: 'sumpaidZt', label: '整体车险金额(元)', width: 160, align: 'center', sortable: true },
        { prop: 'ajlZt', label: '整体车险结案件', width: 140, align: 'center', sortable: true },
        { prop: 'ajZt', label: '整体车险案均(元)', width: 160, align: 'center', sortable: true },
        { prop: 'ajZtTb', label: '整体同比', width: 100, align: 'center', sortable: true },
        { prop: 'sumpaidCs', label: '车损金额(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajlCs', label: '车损结案件', width: 120, align: 'center', sortable: true },
        { prop: 'ajCs', label: '车损案均', width: 120, align: 'center', sortable: true },
        { prop: 'ajCsTb', label: '车损同比', width: 100, align: 'center', sortable: true },
        { prop: 'sumpaidRs', label: '人伤金额(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajlRs', label: '人伤结案件', width: 120, align: 'center', sortable: true },
        { prop: 'ajRs', label: '人伤案均(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajRsTb', label: '人伤同比', width: 100, align: 'center', sortable: true },
        { prop: 'sumpaidDza', label: '交强险金额(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajlDza', label: '交强险结案件', width: 130, align: 'center', sortable: true },
        { prop: 'ajDza', label: '交强险案均(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajDzaTb', label: '交强同比', width: 100, align: 'center', sortable: true },
        { prop: 'sumpaidDaa', label: '商业险金额(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajlDaa', label: '商业险结案件', width: 130, align: 'center', sortable: true },
        { prop: 'ajDaa', label: '商业险案均(元)', width: 140, align: 'center', sortable: true },
        { prop: 'ajDaaTb', label: '商业同比', width: 100, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  // ==================== 7. 操作 ====================
  const handleRefresh = () => {
    refreshData()
  }

  const handleSearch = () => {
    tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
    refreshData()
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }

  // ==================== 8. 导出 ====================
  const exportColumns = (item: AnjunCxXnyData, index: number) => ({
    序号: index + 1, 市公司: item.comnameSgs, 新能源: item.xnyflag,
    '整体车险金额(元)': item.sumpaidZt, '整体车险结案件': item.ajlZt, '整体车险案均(元)': item.ajZt, '整体同比': item.ajZtTb,
    '车损金额(元)': item.sumpaidCs, '车损结案件': item.ajlCs, '车损案均': item.ajCs, '车损同比': item.ajCsTb,
    '人伤金额(元)': item.sumpaidRs, '人伤结案件': item.ajlRs, '人伤案均(元)': item.ajRs, '人伤同比': item.ajRsTb,
    '交强险金额(元)': item.sumpaidDza, '交强险结案件': item.ajlDza, '交强险案均(元)': item.ajDza, '交强同比': item.ajDzaTb,
    '商业险金额(元)': item.sumpaidDaa, '商业险结案件': item.ajlDaa, '商业险案均(元)': item.ajDaa, '商业同比': item.ajDaaTb,
    '去年整体金额': item.sumpaidZtQn, '去年整体案均': item.ajZtQn, '去年车损金额': item.sumpaidCsQn, '去年车损案均': item.ajCsQn,
    '去年人伤金额': item.sumpaidRsQn, '去年人伤案均': item.ajRsQn, '去年交强金额': item.sumpaidDzaQn, '去年交强案均': item.ajDzaQn,
    '去年商业金额': item.sumpaidDaaQn, '去年商业案均': item.ajDaaQn
  })

  const dateSuffix = () => new Date().toISOString().slice(0, 10)

  const handleExportCurrent = () => {
    const data = tableData.value as AnjunCxXnyData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const exportData = data.map(exportColumns)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '案均赔款-新能源（车险）')
    XLSX.writeFile(wb, `案均赔款-新能源（车险）_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await claimAverage.axiosRequestAnjunCxXny(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as AnjunCxXnyData[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const exportData = data.map(exportColumns)
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '案均赔款-新能源（车险）')
      XLSX.writeFile(wb, `案均赔款-新能源（车险）_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>

<style scoped>
  /* 搜索栏表单项：文字标签与选择框在所属列中垂直居中 */
  :deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }
</style>
