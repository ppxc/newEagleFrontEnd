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
          <h4 class="m-0">人伤跟踪量-年度每月【统计时间：{{ currentMaxTjTime }}】</h4>
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
  import { Download } from '@element-plus/icons-vue'
  import { ElNotification } from 'element-plus'
  import * as XLSX from 'xlsx'
  import { dataReport } from '../../api'
  import { useLaoxiaoTable } from '../../api/useLaoxiaoTable'
  import { useMergeFirstColumn } from '../../api/useMergeFirstColumn'
  defineOptions({ name: 'RsGzlYearTable' })

  interface RsGzlYearData {
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

  const tableHeight = 'calc(100vh - 330px)'

  // 人伤跟踪量/调解量：仅 tjDate 筛选，无 comnameSgs 下拉
  const {
    searchBarRef,
    searchFormState,
    searchItems,
    rules,
    tableData,
    loading,
    tableError,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks,
    currentMaxTjTime,
    tableApiParams,
    handleRefresh,
    handleSearch,
    handleReset
  } = useLaoxiaoTable<RsGzlYearData>({
    pageApi: dataReport.axiosRequestRsGzlYearPage,
    listApi: dataReport.axiosRequestRsGzlYear,
    hasComnameSgs: false,
    columnsFactory: () => [
      {
        prop: 'comname',
        label: '地市',
        width: 130,
        align: 'center',
        fixed: 'left',
        sortable: true
      },
      { prop: 'username', label: '人员', width: 100, align: 'center', fixed: 'left' },
      { prop: 'fenzu', label: '分组合计', width: 120, align: 'center', fixed: 'left' },
      { prop: 'hj', label: '汇总', width: 110, align: 'center', sortable: true, fixed: 'right' },
      ...Array.from({ length: 12 }, (_, i) => ({
        prop: `mon${i + 1}`,
        label: `${i + 1}月`,
        width: 80,
        align: 'center' as const,
        sortable: true
      }))
    ]
  })

  const { mergedData, spanMethod } = useMergeFirstColumn(tableData, columns)

  const exportColumns = (item: RsGzlYearData, index: number) => ({
    序号: index + 1,
    地市: item.comname,
    人员: item.username,
    分组合计: item.fenzu,
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
  const SHEET_NAME = '人伤跟踪量-年度每月'

  const handleExportCurrent = () => {
    const data = tableData.value as RsGzlYearData[]
    if (!data.length) {
      ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
      return
    }
    const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
    XLSX.writeFile(wb, `${SHEET_NAME}_${dateSuffix()}.xlsx`)
    ElNotification({ title: '成功', message: '导出成功', type: 'success' })
  }

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestRsGzlYear(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as RsGzlYearData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
      XLSX.writeFile(wb, `${SHEET_NAME}_全部_${dateSuffix()}.xlsx`)
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
