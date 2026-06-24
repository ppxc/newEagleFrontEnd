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
          <h4 class="m-0">周期-人员【统计时间：{{ currentMaxTjTime }}】</h4>
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
        @pagination:size-change="handleSizeChange"
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
  import { useEfficiencyTable } from '../../api/useEfficiencyTable'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'ZhouqiRyTable' })

  interface ZhouqiRyData {
    tjDate: string | null
    comnameSgs: string | null
    comnameCk: string | null
    groups: string | null
    username: string | null
    usercode: string | null
    zhouqiZt: number | null; zhouqiWyn: number | null; zhouqiWys: number | null
    chakanZt: number | null; cuidingZt: number | null; dingsunZt: number | null; zhifuZt: number | null
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


  // ==================== 5. 构建下拉 (全量版) ====================
  // 用独立的全量端点（/list, size: 9999）构建市公司下拉，避免首屏分页只有 20 行时遗漏
  // 后续页中才出现的市公司。返回的集合是全量的，与分页结果无关。
  const fetchAllForDropdown = async (tjDate: string) => {
    if (comnameSgsOptions.value.length) return
    try {
      const res = await dataReport.axiosRequestZhouqiRy({ current: 1, size: 9999, tjDate, tjDate: tableApiParams.value.tjDate || '', comnameSgs: tableApiParams.value.comnameSgs ?? '' })
      if (Array.isArray(res) && res.length) {
        const set = new Set<string>()
        res.forEach((item) => { if (item.comnameSgs) set.add(item.comnameSgs) })
        comnameSgsOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
        ElNotification({ title: '提示', message: `已加载：${comnameSgsOptions.value.length} 个市公司`, type: 'success' })
      }
    } catch {
      /* ignore */
    }
  }
  const buildSgsOptions = (data: ZhouqiRyData[]) => {
    if (comnameSgsOptions.value.length) return
    const set = new Set<string>()
    data.forEach((item) => { if (item.comnameSgs) set.add(item.comnameSgs) })
    comnameSgsOptions.value = Array.from(set).sort().map((v) => ({ label: v, value: v }))
    ElNotification({ title: '提示', message: `已加载：${comnameSgsOptions.value.length} 个市公司`, type: 'success' })
  }

  const { data: tableData, loading, error: tableError, pagination, fetchData, refreshData, handleSizeChange, columns, columnChecks } = useEfficiencyTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<ZhouqiRyData>> => {
        const queryParams = {
          current: params.current, size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          comnameSgs: tableApiParams.value.comnameSgs ?? ''
        }
        const response = await dataReport.axiosRequestZhouqiRyPage(queryParams)
        const page = (response ?? {}) as UseTableResult<ZhouqiRyData>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) { fetchAllForDropdown(searchFormState.value.tjDate || tableApiParams.value.tjDate || ''); isInitialized = true }
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
        { prop: 'comnameCk', label: '部门', minWidth: 180, align: 'center', fixed: 'left', sortable: true },
        { prop: 'groups', label: '小组', minWidth: 160, align: 'center', fixed: 'left', sortable: true },
        { prop: 'username', label: '人员', minWidth: 100, align: 'center', fixed: 'left' },
        { prop: 'usercode', label: '工号', width: 100, align: 'center' },
        { prop: 'zhouqiZt', label: '整体结案周期（天）', width: 140, align: 'center', sortable: true },
        { prop: 'zhouqiWyn', label: '万元内案件周期', width: 140, align: 'center', sortable: true },
        { prop: 'zhouqiWys', label: '万元以上案件周期', width: 150, align: 'center', sortable: true },
        { prop: 'chakanZt', label: '查勘周期', width: 110, align: 'center', sortable: true },
        { prop: 'cuidingZt', label: '催定周期', width: 110, align: 'center', sortable: true },
        { prop: 'dingsunZt', label: '定损周期', width: 110, align: 'center', sortable: true },
        { prop: 'zhifuZt', label: '定损完成-支付', width: 130, align: 'center', sortable: true }
      ]
    },
    performance: { enableCache: true, cacheTime: 5 * 60 * 1000, debounceTime: 300, maxCacheSize: 100 }
  })

  const localHandleCurrentChange = (newCurrent: number) => fetchData({ current: newCurrent })
  const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestZhouqiRy({ current: 1, size: 9999 })
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

  const exportColumns = (item: ZhouqiRyData, index: number) => ({
    序号: index + 1,
    部门: item.comnameCk, 小组: item.groups, 人员: item.username, 工号: item.usercode,
    整体结案周期: item.zhouqiZt,
    万元内案件周期: item.zhouqiWyn,
    万元以上案件周期: item.zhouqiWys,
    查勘周期: item.chakanZt,
    催定周期: item.cuidingZt,
    定损周期: item.dingsunZt,
    定损完成支付: item.zhifuZt
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '周期-人员'

  const handleExportCurrent = () => {
    const data = tableData.value as ZhouqiRyData[]
    if (!data.length) { ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' }); return }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestZhouqiRy(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as ZhouqiRyData[]
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
