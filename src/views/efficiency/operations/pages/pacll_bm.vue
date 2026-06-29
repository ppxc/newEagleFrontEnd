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
          <h4 class="m-0">车险结案率(部门)【统计时间：{{ currentMaxTjTime }}】</h4>
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

  defineOptions({ name: 'PacllBmTable' })

  // ==================== 1. 类型定义 ====================
  interface PacllBmData {
    tjDate: string | null
    comcode: number
    comname: string
    xzl: number
    yjl: number
    wjl: number
    pacll: string
    rswj: number
    lajal: number
    rsZb: number
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
  const DEFAULT_FORM = { tjDate: '', comname: '' }

  // ==================== 4. 状态 ====================
  const searchBarRef = ref<any>(null)

  // ==================== 5. 表格 Hook ====================
  const {
    searchFormState,
    searchItems,
    rules,
    tableData,
    loading,
    tableError,
    pagination,
    refreshData,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks,
    currentMaxTjTime,
    tableApiParams,
    handleRefresh,
    handleSearch,
    handleReset
  } = useEfficiencyTable({
    pageApi: dataReport.axiosRequestPacllBmPage,
    searchFields: [
      {
        key: 'tjDate',
        label: '统计时间',
        type: 'date',
        props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' }
      },
      {
        key: 'comname',
        label: '部门',
        type: 'select',
        props: { placeholder: '请选择部门', clearable: true },
        dropdown: {
          source: 'comname',
          listApi: dataReport.axiosRequestPacllBm,
          notifyMessage: '个部门'
        }
      }
    ],
    columnsFactory: () => [
        { prop: 'comcode', label: '部门代码', width: 110, align: 'center', sortable: true },
        {
          prop: 'comname',
          label: '部门名称',
          minWidth: 200,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        { prop: 'xzl', label: '新增量', width: 90, align: 'center', sortable: true },
        { prop: 'yjl', label: '已决量', width: 90, align: 'center', sortable: true },
        { prop: 'wjl', label: '未决量', width: 90, align: 'center', sortable: true },
        { prop: 'pacll', label: '赔案处理率', width: 110, align: 'center', sortable: true },
        { prop: 'rswj', label: '涉人伤未决案件量', width: 150, align: 'center', sortable: true },
        {
          prop: 'lajal',
          label: '立案结案率',
          width: 110,
          align: 'center',
          sortable: true,
          formatter: (row: any) => formatPercent(row.lajal)
        },
        {
          prop: 'rsZb',
          label: '人伤未决占比',
          width: 120,
          align: 'center',
          sortable: true,
          formatter: (row: any) => formatPercent(row.rsZb)
        }
      ]
  })

  const { mergedData, spanMethod } = useMergeFirstColumn(tableData, columns)

  // ==================== 8. 导出 ====================
  const exportColumns = (item: PacllBmData, index: number) => ({
    序号: index + 1,
    部门代码: item.comcode,
    部门名称: item.comname,
    新增量: item.xzl,
    已决量: item.yjl,
    未决量: item.wjl,
    赔案处理率: item.pacll,
    涉人伤未决案件量: item.rswj,
    立案结案率: item.lajal,
    人伤未决占比: item.rsZb
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')

  const handleExportCurrent = () => {
    const data = tableData.value as PacllBmData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const exportData = data.map(exportColumns)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '车险结案率(部门)')
    XLSX.writeFile(wb, `车险结案率(部门)_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestPacllBm(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as PacllBmData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const exportData = data.map(exportColumns)
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '车险结案率(部门)')
      XLSX.writeFile(wb, `车险结案率(部门)_全部_${dateSuffix()}.xlsx`)
      ElNotification({ title: '成功', message: `${data.length} 条数据导出成功`, type: 'success' })
    } catch {
      ElNotification({ title: '错误', message: '导出失败', type: 'error' })
    }
  }
</script>

<style scoped>
  /* 搜索栏表单项：文字标签与选择框在所属列中垂直居中 */
  :deep(.art-search-bar .el-form-item) {
    align-items: center;
    margin-bottom: 0;
  }
  .custom-header:hover {
    color: var(--el-color-primary-light-3);
    padding: 12px 12px 12px;
  }
  .demo-group .config-toggles .el-switch {
    --el-switch-on-color: var(--el-color-primary);
  }
  .demo-group .performance-info .el-alert {
    --el-alert-padding: 12px;
  }
</style>
