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
          <h4 class="m-0">定损提交量-月度每日【统计时间：{{ currentMaxTjTime }}】</h4>
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
        @pagination:size-change="localHandleSizeChange"
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

  defineOptions({ name: 'DingsunTjlMonthTable' })

  interface DingsunTjlMonthData {
    tjdate: string | null
    comnameSgs: string | null
    comcodeSgs: string | null
    comcode: string | null
    comname: string | null
    username: string | null
    gwname: string | null
    usercode: string | null
    tjMonth: string | null
    hj: number | null
    day1: number | null; day2: number | null; day3: number | null; day4: number | null
    day5: number | null; day6: number | null; day7: number | null; day8: number | null
    day9: number | null; day10: number | null; day11: number | null; day12: number | null
    day13: number | null; day14: number | null; day15: number | null; day16: number | null
    day17: number | null; day18: number | null; day19: number | null; day20: number | null
    day21: number | null; day22: number | null; day23: number | null; day24: number | null
    day25: number | null; day26: number | null; day27: number | null; day28: number | null
    day29: number | null; day30: number | null; day31: number | null
    maxTjTime: string | null
  }

  const tableHeight = 'calc(100vh - 330px)'

  const {
    searchBarRef, searchFormState, searchItems, rules,
    fetchData, tableData, loading, tableError, pagination,
    handleSizeChange, handleCurrentChange, columns, columnChecks,
    currentMaxTjTime, tableApiParams,
    handleRefresh, handleSearch, handleReset
  } = useLaoxiaoTable<DingsunTjlMonthData>({
    pageApi: dataReport.axiosRequestDingsunTjlMonthPage,
    listApi: dataReport.axiosRequestDingsunTjlMonth,
    hasComnameSgs: true,
    columnsFactory: () => [
      { prop: 'comnameSgs', label: '地市公司', width: 130, align: 'center', fixed: 'left', sortable: true },
      { prop: 'comname', label: '部门', width: 130, align: 'center', fixed: 'left', sortable: true },
      { prop: 'username', label: '人员', width: 100, align: 'center', fixed: 'left' },
      { prop: 'usercode', label: '工号', width: 110, align: 'center' },
      { prop: 'tjMonth', label: '统计月', width: 100, align: 'center' },
      { prop: 'hj', label: '汇总', width: 110, align: 'center', sortable: true, fixed: 'right' },
      ...Array.from({ length: 31 }, (_, i) => ({
        prop: `day${i + 1}`,
        label: `${i + 1}号`,
        width: 70,
        align: 'center' as const,
        sortable: true
      }))
    ]
  })

  const localHandleSizeChange = (newSize: number) => {
    fetchData({ size: newSize, current: 1 })
  }

  const exportColumns = (item: DingsunTjlMonthData, index: number) => ({
    序号: index + 1,
    统计日期: item.tjdate,
    地市公司: item.comnameSgs,
    部门: item.comname,
    人员: item.username,
    工号: item.usercode,
    统计月: item.tjMonth,
    汇总: item.hj,
    '1号': item.day1, '2号': item.day2, '3号': item.day3, '4号': item.day4,
    '5号': item.day5, '6号': item.day6, '7号': item.day7, '8号': item.day8,
    '9号': item.day9, '10号': item.day10, '11号': item.day11, '12号': item.day12,
    '13号': item.day13, '14号': item.day14, '15号': item.day15, '16号': item.day16,
    '17号': item.day17, '18号': item.day18, '19号': item.day19, '20号': item.day20,
    '21号': item.day21, '22号': item.day22, '23号': item.day23, '24号': item.day24,
    '25号': item.day25, '26号': item.day26, '27号': item.day27, '28号': item.day28,
    '29号': item.day29, '30号': item.day30, '31号': item.day31
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET_NAME = '定损提交量-月度每日'

  const handleExportCurrent = () => {
    const data = tableData.value as DingsunTjlMonthData[]
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
      const res = await dataReport.axiosRequestDingsunTjlMonth(tableApiParams.value)
      const data = (Array.isArray(res) ? res : []) as DingsunTjlMonthData[]
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
