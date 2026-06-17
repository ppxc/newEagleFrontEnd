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
          <h4 class="m-0">人伤调解量-年度每月【统计时间：{{ currentMaxTjTime }}】</h4>
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
  import { ref } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'

  defineOptions({ name: 'RsTjlYearTable' })

  // ==================== 1. 类型定义 ====================
  interface RsTjlYearData {
    tjdate: string | null
    comcode: string | null
    comname: string | null
    username: string | null
    fenzu: string | null
    usercode: string | null
    tjYear: string | null
    jaflag: string | null
    hj: number | null
    mon1: number | null
    mon2: number | null
    mon3: number | null
    mon4: number | null
    mon5: number | null
    mon6: number | null
    mon7: number | null
    mon8: number | null
    mon9: number | null
    mon10: number | null
    mon11: number | null
    mon12: number | null
    maxTjTime: string | null
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

  // ==================== 2. 常量 ====================
  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 20 }
  const DEFAULT_FORM = { tjDate: '' }

  // ==================== 3. 状态 ====================
  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')

  // ==================== 4. 搜索表单（仅 tjdate 筛选） ====================
  const rules = { tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = [
    {
      key: 'tjDate',
      label: '统计时间',
      type: 'date',
      props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' }
    }
  ]

  // ==================== 5. 表格 Hook ====================
  const {
    data: tableData,
    loading,
    error: tableError,
    pagination,
    refreshData,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks
  } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<UseTableResult<RsTjlYearData>> => {
        const queryParams = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || ''
        }
        const response = await dataReport.axiosRequestRsTjlYear(queryParams)
        let tableResultData: RsTjlYearData[] = []
        if (Array.isArray(response)) {
          tableResultData = response
          if (tableResultData.length) {
            currentMaxTjTime.value = tableResultData[0].maxTjTime || ''
            if (!searchFormState.value.tjDate && tableResultData[0].maxTjTime) {
              searchFormState.value.tjDate = tableResultData[0].maxTjTime.substring(0, 10)
            }
          } else {
            currentMaxTjTime.value = ''
          }
        }
        const start = (params.current - 1) * params.size
        return {
          records: tableResultData.slice(start, start + params.size),
          total: tableResultData.length,
          current: params.current,
          size: params.size
        }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        // tjdate / comcode 在 Excel Row3 无中文标题，不显示
        { prop: 'comname', label: '名称', width: 130, align: 'center', fixed: 'left', sortable: true },
        { prop: 'username', label: '人员', width: 100, align: 'center', fixed: 'left' },
        { prop: 'fenzu', label: '分组', width: 120, align: 'center', fixed: 'left' },
        { prop: 'usercode', label: '工号', width: 110, align: 'center' },
        { prop: 'hj', label: '汇总', width: 110, align: 'center', sortable: true, fixed: 'right' },
        ...Array.from({ length: 12 }, (_, i) => ({
          prop: `mon${i + 1}`,
          label: `${i + 1}月`,
          width: 80,
          align: 'center' as const,
          sortable: true
        }))
      ]
    },
    performance: {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
      debounceTime: 300,
      maxCacheSize: 100
    }
  })

  // ==================== 6. 操作 ====================
  const handleRefresh = async () => {
    try {
      const res = await dataReport.axiosRequestRsTjlYear({ current: 1, size: 9999, tjDate: tableApiParams.value.tjDate })
      if (Array.isArray(res) && res.length) {
        currentMaxTjTime.value = res[0].maxTjTime || ''
      }
    } catch { /* ignore */ }
    refreshData()
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

  // ==================== 7. 导出 ====================
  const exportColumns = (item: RsTjlYearData, index: number) => ({
    序号: index + 1,
    名称: item.comname,
    人员: item.username,
    分组: item.fenzu,
    工号: item.usercode,
    汇总: item.hj,
    '1月': item.mon1,
    '2月': item.mon2,
    '3月': item.mon3,
    '4月': item.mon4,
    '5月': item.mon5,
    '6月': item.mon6,
    '7月': item.mon7,
    '8月': item.mon8,
    '9月': item.mon9,
    '10月': item.mon10,
    '11月': item.mon11,
    '12月': item.mon12
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')

  const handleExportCurrent = () => {
    const data = tableData.value as RsTjlYearData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const exportData = data.map(exportColumns)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人伤调解量-年度每月')
    XLSX.writeFile(wb, `人伤调解量-年度每月_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestRsTjlYear(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as RsTjlYearData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const exportData = data.map(exportColumns)
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '人伤调解量-年度每月')
      XLSX.writeFile(wb, `人伤调解量-年度每月_全部_${dateSuffix()}.xlsx`)
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
