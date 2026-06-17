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
          <h4 class="m-0">周期-部门【统计时间：{{ currentMaxTjTime }}】</h4>
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
        merge-first-column
        empty-height="660px"
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
  import { ref, computed } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'ZhouqiBmTable' })

  // ==================== 1. 类型定义 ====================
  interface ZhouqiBmData {
    tjDate: string | null
    comcode: string
    comname: string
    zhouqiZt: number
    zhouqiWyn: number
    zhouqiWys: number
    chakanZt: number
    cuidingZt: number
    dingsunZt: number
    zhifuZt: number
    maxTjTime: string | null
  }

  interface SelectOption { label: string; value: string }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  // ==================== 2. 常量 ====================
  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', comname: '' }

  // ==================== 3. 状态 ====================
  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const comOptions = ref<SelectOption[]>([])

  // ==================== 4. 搜索表单 ====================
  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'comname', label: '部门', type: 'select', props: { placeholder: '请选择部门', options: comOptions.value, clearable: true } }
  ])

  // ==================== 5. 构建下拉 ====================
  const buildDeptOptions = (data: ZhouqiBmData[]) => {
    if (comOptions.value.length) return
    const comSet = new Set<string>()
    data.forEach((item) => { if (item.comname) comSet.add(item.comname) })
    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
    ElNotification({ title: '提示', message: `已加载：${comOptions.value.length} 个部门`, type: 'success' })
  }

  // ==================== 6. 表格 Hook ====================
  const { data: tableData, loading, error: tableError, pagination, refreshData, handleSizeChange, handleCurrentChange, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<ZhouqiBmData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comname: tableApiParams.value.comname ?? ''
        }
        const response = await dataReport.axiosRequestZhouqiBm(queryParams)
        let tableResultData: ZhouqiBmData[] = []
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
        { prop: 'comcode', label: '部门代码', width: 110, align: 'center', sortable: true },
        { prop: 'comname', label: '部门名称', minWidth: 220, align: 'center', fixed: 'left', sortable: true },
        { prop: 'zhouqiZt', label: '周期整体', width: 110, align: 'center', sortable: true },
        { prop: 'zhouqiWyn', label: '万元内案件周期', width: 140, align: 'center', sortable: true },
        { prop: 'zhouqiWys', label: '万元上案件周期', width: 140, align: 'center', sortable: true },
        { prop: 'chakanZt', label: '查勘周期', width: 110, align: 'center', sortable: true },
        { prop: 'cuidingZt', label: '催定周期', width: 110, align: 'center', sortable: true },
        { prop: 'dingsunZt', label: '定损周期', width: 110, align: 'center', sortable: true },
        { prop: 'zhifuZt', label: '支付周期', width: 110, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  // ==================== 7. 操作 ====================
  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestZhouqiBm({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildDeptOptions(res)
        currentMaxTjTime.value = res[0].maxTjTime || ''
      }
      refreshData()
    } catch { refreshData() }
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
      tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
      refreshData()
    } catch { /* validation failed */ }
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }

  // ==================== 8. 导出 ====================
  const exportColumns = (item: ZhouqiBmData, index: number) => ({
    序号: index + 1, 部门代码: item.comcode, 部门名称: item.comname,
    周期整体: item.zhouqiZt, 万元内案件周期: item.zhouqiWyn, 万元上案件周期: item.zhouqiWys,
    查勘周期: item.chakanZt, 催定周期: item.cuidingZt, 定损周期: item.dingsunZt, 支付周期: item.zhifuZt
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')

  const handleExportCurrent = () => {
    const data = tableData.value as ZhouqiBmData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const exportData = data.map(exportColumns)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '周期-部门')
    XLSX.writeFile(wb, `周期-部门_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestZhouqiBm(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as ZhouqiBmData[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const exportData = data.map(exportColumns)
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '周期-部门')
      XLSX.writeFile(wb, `周期-部门_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch { ElNotification({ title: '错误', message: '导出失败', type: 'error' }) }
  }
</script>

<style scoped>
  /* 搜索栏表单项：文字标签与选择框在所属列中垂直居中 */
  :deep(.art-search-bar .el-form-item) { align-items: center; margin-bottom: 0; }
  .custom-header:hover { color: var(--el-color-primary-light-3); padding: 12px 12px 12px; }
  .demo-group .config-toggles .el-switch { --el-switch-on-color: var(--el-color-primary); }
  .demo-group .performance-info .el-alert { --el-alert-padding: 12px; }
</style>
