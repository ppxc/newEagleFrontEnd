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

    <ElCard class="flex-1 art-table-card" style="margin-top: 0; padding: 5px">
      <template #header>
        <div class="flex-cb">
          <h4 class="m-0">零结案-人员【统计时间：{{ currentMaxTjTime }}】</h4>
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
        :data="mergedData"
        :span-method="spanMethod"
        :columns="columns"
        :height="tableHeight"
        :scrollbar-always-on="true"
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
  import { useEfficiencyTable } from '../../api/useEfficiencyTable'
  import { useMergeFirstColumn } from '../../api/useMergeFirstColumn'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'LingjieRyTable' })

  interface LingjieRyData {
    tjDate: string | null
    comname: string | null
    groups: string | null
    username: string | null
    usercode: string | null
    ljl1_3: number | null
    lj1_3Pp: string | null
    ljl4: number | null
    lj4Pp: string | null
    ljlWeek: number | null
    ljWeekPp: string | null
    maxTjTime: string | null
  }
  interface SelectOption {
    label: string
    value: string
  }
  interface UseTableParams {
    current: number
    size: number
    [key: string]: any
  }
  interface UseTableResult<T> {
    records: T[]
    total: number
    current: number
    size: number
  }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '', groups: '', username: '' }

  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  let isInitialized = false
  const groupsOptions = ref<SelectOption[]>([])
  const usernameOptions = ref<SelectOption[]>([])

  const rules = { tjDate: [{ required: false, message: '请选择统计日期', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    {
      key: 'tjDate',
      label: '统计日期',
      type: 'date',
      props: { placeholder: '选择统计日期', valueFormat: 'YYYY-MM-DD' }
    },
    {
      key: 'groups',
      label: '片区',
      type: 'select',
      props: { placeholder: '请选择片区', options: groupsOptions.value, clearable: true }
    },
    {
      key: 'username',
      label: '人员',
      type: 'select',
      props: { placeholder: '请选择人员', options: usernameOptions.value, clearable: true }
    }
  ])

  // ==================== 5. 构建下拉 (全量版) ====================
  // 用独立的全量端点（/list, size: 9999）构建市公司下拉，避免首屏分页只有 20 行时遗漏
  // 后续页中才出现的市公司。返回的集合是全量的，与分页结果无关。
  const fetchAllForDropdown = async () => {
    if (groupsOptions.value.length) return
    try {
      const res = await dataReport.axiosRequestLingjieRy({
        current: 1,
        size: 9999,
        tjDate: tableApiParams.value.tjDate || '',
        groups: tableApiParams.value.groups ?? '',
        username: tableApiParams.value.username ?? ''
      })
      if (Array.isArray(res) && res.length) {
        const set = new Set<string>()
        res.forEach((item) => {
          if (item.groups) set.add(item.groups)
        })
        groupsOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
        ElNotification({
          title: '提示',
          message: `已加载：${groupsOptions.value.length} 个市公司`,
          type: 'success'
        })
      }
    } catch {
      /* ignore */
    }
  }
  const buildOptions = (data: LingjieRyData[]) => {
    if (groupsOptions.value.length) return
    const gset = new Set<string>()
    const uset = new Set<string>()
    data.forEach((item) => {
      if (item.groups) gset.add(item.groups)
      if (item.username) uset.add(item.username)
    })
    groupsOptions.value = Array.from(gset)
      .sort()
      .map((v) => ({ label: v, value: v }))
    usernameOptions.value = Array.from(uset)
      .sort()
      .map((v) => ({ label: v, value: v }))
    ElNotification({
      title: '提示',
      message: `已加载：${groupsOptions.value.length} 个片区 / ${usernameOptions.value.length} 名人员`,
      type: 'success'
    })
  }

  const {
    data: tableData,
    loading,
    error: tableError,
    pagination,
    fetchData,
    refreshData,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks
  } = useEfficiencyTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<LingjieRyData>> => {
        const queryParams = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || '',
          groups: tableApiParams.value.groups ?? '',
          username: tableApiParams.value.username ?? ''
        }
        const response = await dataReport.axiosRequestLingjieRyPage(queryParams)
        const page = (response ?? {}) as UseTableResult<LingjieRyData>
        const records = page.records || []
        if (records.length) {
          if (!isInitialized) {
            fetchAllForDropdown()
            isInitialized = true
          }
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) {
            searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10)
          }
        } else {
          currentMaxTjTime.value = ''
        }
        return { records, total: page.total ?? 0, current: params.current, size: params.size }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        {
          prop: 'comname',
          label: '部门',
          minWidth: 200,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        {
          prop: 'groups',
          label: '小组',
          minWidth: 160,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        { prop: 'username', label: '人员', minWidth: 100, align: 'center', fixed: 'left' },
        { prop: 'usercode', label: '工号', width: 100, align: 'center' },
        { prop: 'ljl1_3', label: '1-3月零结量', width: 120, align: 'center', sortable: true },
        { prop: 'lj1_3Pp', label: '1-3月零结量占比', width: 140, align: 'center' },
        { prop: 'ljl4', label: '当月零结量', width: 110, align: 'center', sortable: true },
        { prop: 'lj4Pp', label: '当月零结量占比', width: 130, align: 'center' },
        { prop: 'ljlWeek', label: '本周零结量', width: 110, align: 'center', sortable: true },
        { prop: 'ljWeekPp', label: '本周零结案占比', width: 130, align: 'center' }
      ]
    },
    performance: {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
      debounceTime: 300,
      maxCacheSize: 100
    }
  })

  const { mergedData, spanMethod } = useMergeFirstColumn(tableData, columns)

  // const localHandleSizeChange = (newSize: number) => fetchData({ size: newSize, current: 1 })

  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestLingjieRy({ current: 1, size: 9999 })
      if (Array.isArray(res) && res.length) {
        buildOptions(res)
        currentMaxTjTime.value = res[0].maxTjTime || ''
      }
      await fetchData()
    } catch {
      await fetchData()
    }
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
    } catch {
      return
    }
    tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
    refreshData()
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, DEFAULT_FORM)
    tableApiParams.value = { ...DEFAULT_PAGINATION, ...searchFormState.value }
    refreshData()
  }

  const exportColumns = (item: LingjieRyData, index: number) => ({
    序号: index + 1,
    部门: item.comname,
    小组: item.groups,
    人员: item.username,
    工号: item.usercode,
    '1-3月零结量': item.ljl1_3,
    '1-3月零结量占比': item.lj1_3Pp,
    当月零结量: item.ljl4,
    当月零结量占比: item.lj4Pp,
    本周零结量: item.ljlWeek,
    本周零结案占比: item.ljWeekPp
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '零结案-人员'

  const handleExportCurrent = () => {
    const data = tableData.value as LingjieRyData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET)
    XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestLingjieRy(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as LingjieRyData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, SHEET)
      XLSX.writeFile(wb, `${SHEET}_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch {
      ElNotification({ title: '错误', message: '导出失败', type: 'error' })
    }
  }
</script>

<style scoped>
  :deep(.art-search-bar .el-form-item) {
    align-items: center;
    margin-bottom: 0;
  }
</style>
