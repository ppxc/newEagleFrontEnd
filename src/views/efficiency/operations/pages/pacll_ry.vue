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
          <h4 class="m-0">车险结案率(人员)【统计时间：{{ currentMaxTjTime }}】</h4>
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
  import { ref, computed, watch } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'PacllRyTable' })

  // ==================== 1. 类型定义 ====================
  interface PacllRyData {
    id: number | null | undefined
    tjDate: string | null
    bm: string
    username: string
    usercode: string
    groups: string
    xzajl: number
    yjajl: number
    wjajl: number
    pacll: string
    bsrswjcl: number
    lajal: number
    maxTjTime: string | null
  }

  interface SelectOption { label: string; value: string }
  interface GroupOption extends SelectOption { groupsCode: string | number }
  interface DeptGroupMap { [deptName: string]: GroupOption[] }
  interface UseTableParams { current: number; size: number; [key: string]: any }
  interface UseTableResult<T> { records: T[]; total: number; current: number; size: number }

  // ==================== 2. 工具函数 ====================
  const formatPercent = (val: any): string => {
    if (val == null || val === '') return ''
    const num = typeof val === 'string' ? parseFloat(val) : Number(val)
    if (isNaN(num)) return String(val)
    return (num * 100).toFixed(2) + '%'
  }

  // ==================== 3. 常量 ====================
  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', bm: '', groups: '', username: '' }

  // ==================== 4. 状态 ====================
  const searchBarRef = ref<any>(null)
  const deptGroupMap = ref<DeptGroupMap>({})
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const comOptions = ref<SelectOption[]>([])
  const groupOptions = ref<SelectOption[]>([])

  // ==================== 5. 搜索表单 ====================
  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    { key: 'tjDate', label: '统计时间', type: 'date', props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' } },
    { key: 'bm', label: '部门', type: 'select', props: { placeholder: '请选择部门', options: comOptions.value, clearable: true } },
    { key: 'groups', label: '小组', type: 'select', props: { placeholder: '请选择小组', options: groupOptions.value, clearable: true, disabled: !searchFormState.value.bm } },
    { key: 'username', label: '人员', type: 'input', props: { placeholder: '请输入人员名称' } }
  ])

  // ==================== 6. 构建下拉 ====================
  const sortGroupByCode = (groups: GroupOption[]) => {
    return groups.sort((a, b) => {
      const codeA = typeof a.groupsCode === 'string' ? parseInt(a.groupsCode) || 0 : a.groupsCode
      const codeB = typeof b.groupsCode === 'string' ? parseInt(b.groupsCode) || 0 : b.groupsCode
      return codeA - codeB
    })
  }

  const buildDeptGroupMap = (data: PacllRyData[]) => {
    if (Object.keys(deptGroupMap.value).length) return
    const comSet = new Set<string>()
    const tempDeptGroupMap: DeptGroupMap = {}
    const seenGroups = new Set<string>()
    let groupCount = 0

    data.forEach((item) => {
      if (!item.bm) return
      comSet.add(item.bm)
      if (item.groups) {
        if (!tempDeptGroupMap[item.bm]) tempDeptGroupMap[item.bm] = []
        const exists = tempDeptGroupMap[item.bm].some((g) => g.value === item.groups)
        if (!exists) {
          tempDeptGroupMap[item.bm].push({ label: item.groups, value: item.groups, groupsCode: item.usercode || '' })
          if (!seenGroups.has(item.groups)) { seenGroups.add(item.groups); groupCount++ }
        }
      }
    })

    comOptions.value = Array.from(comSet).map((name) => ({ label: name, value: name }))
    Object.keys(tempDeptGroupMap).forEach((dept) => { tempDeptGroupMap[dept] = sortGroupByCode(tempDeptGroupMap[dept]) })
    deptGroupMap.value = tempDeptGroupMap
    ElNotification({ title: '提示', message: `已加载：${comOptions.value.length} 个部门，共 ${groupCount} 个小组`, type: 'success' })
  }

  // ==================== 7. 级联监听 ====================
  watch(() => searchFormState.value.bm, (newDept) => {
    if (newDept) {
      const sortedGroups = deptGroupMap.value[newDept] || []
      groupOptions.value = sortedGroups.map((g) => ({ label: g.label, value: g.value }))
      searchFormState.value.groups = ''
    } else { groupOptions.value = []; searchFormState.value.groups = '' }
  }, { immediate: true })

  // ==================== 8. 表格 Hook ====================
  const { data: tableData, loading, error: tableError, pagination, refreshData, handleSizeChange, handleCurrentChange, columns, columnChecks } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<PacllRyData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          bm: tableApiParams.value.bm ?? '',
          groups: tableApiParams.value.groups ?? '',
          username: tableApiParams.value.username ?? ''
        }
        const response = await dataReport.axiosRequestPacllRy(queryParams)
        let tableResultData: PacllRyData[] = []
        if (Array.isArray(response)) {
          tableResultData = response
          if (!isInitialized && tableResultData.length) {
            buildDeptGroupMap(tableResultData)
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
        { prop: 'bm', label: '部门', minWidth: 180, align: 'center', fixed: 'left', sortable: true },
        { prop: 'username', label: '人员', width: 100, align: 'center', fixed: 'left' },
        { prop: 'usercode', label: '工号', width: 120, align: 'center', sortable: true },
        { prop: 'groups', label: '小组', width: 120, align: 'center', sortable: true },
        { prop: 'xzajl', label: '新增案件量', width: 120, align: 'center', sortable: true },
        { prop: 'yjajl', label: '已决案件量', width: 120, align: 'center', sortable: true },
        { prop: 'wjajl', label: '未决案件量', width: 120, align: 'center', sortable: true },
        { prop: 'pacll', label: '赔案处理率', width: 110, align: 'center', sortable: true },
        { prop: 'bsrswjcl', label: '不涉人伤未决量', width: 150, align: 'center', sortable: true },
        { prop: 'lajal', label: '立案结案率', width: 110, align: 'center', sortable: true, formatter: (row: any) => formatPercent(row.lajal) }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  // ==================== 9. 操作 ====================
  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestPacllRy({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildDeptGroupMap(res)
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

  // ==================== 10. 导出 ====================
  const exportColumns = (item: PacllRyData, index: number) => ({
    序号: index + 1, 部门: item.bm, 人员: item.username, 工号: item.usercode,
    小组: item.groups,
    新增案件量: item.xzajl, 已决案件量: item.yjajl, 未决案件量: item.wjajl,
    赔案处理率: item.pacll, 不涉人伤未决量: item.bsrswjcl, 立案结案率: item.lajal
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')

  const handleExportCurrent = () => {
    const data = tableData.value as PacllRyData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const exportData = data.map(exportColumns)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '车险结案率(人员)')
    XLSX.writeFile(wb, `车险结案率(人员)_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestPacllRy(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as PacllRyData[]
      if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
      const exportData = data.map(exportColumns)
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '车险结案率(人员)')
      XLSX.writeFile(wb, `车险结案率(人员)_全部_${dateSuffix()}.xlsx`)
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
