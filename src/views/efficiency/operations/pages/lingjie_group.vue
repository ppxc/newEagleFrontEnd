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
          <h4 class="m-0">零结案-小组【统计时间：{{ currentMaxTjTime }}】</h4>
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
            <ElButton type="primary" :icon="Download" @click="handleExportAll" v-ripple>
              导出全部
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :pagination="pagination"
        :data="tableData"
        :span-method="spanMethod"
        :columns="columns"
        :height="tableHeight"
        :scrollbar-always-on="true"
        empty-height="660px"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
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

  defineOptions({ name: 'LingjieGroupTable' })

  // 0~1 小数转百分号字符串（保留 2 位小数）
  // ArtTable formatter 接收整行 row 对象，从 row[prop] 取值
  const percentFormatter = (prop: string) => (row: any) => {
    const v = row?.[prop]
    if (v == null || v === '') return ''
    const n = typeof v === 'number' ? v : Number(v)
    return isNaN(n) ? String(v) : (n * 100).toFixed(2) + '%'
  }

  interface LingjieGroupData {
    tjdate: string | null
    comname: string | null
    groups: string | null
    ljl1_3: number | null
    lj1_3Pp: string | null
    ljl4: number | null
    lj4Pp: string | null
    ljlWeek: number | null
    ljWeekPp: string | null
    maxTjTime: string | null
  }

  const tableHeight = 'calc(100vh - 330px)'
  const DEFAULT_PAGINATION = { current: 1, size: 50 }
  const DEFAULT_FORM = { tjDate: '', comname: '', groups: '' }

  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')

  const rules = { tjDate: [{ required: false, message: '请选择统计日期', trigger: 'change' }] }
  const searchFormState = ref({ ...DEFAULT_FORM })
  const tableApiParams = ref({ ...DEFAULT_PAGINATION, ...searchFormState.value })

  const searchItems = computed(() => [
    {
      key: 'tjDate',
      label: '统计日期',
      type: 'date',
      props: { placeholder: '选择统计日期', valueFormat: 'YYYY-MM-DD' }
    }
    // {
    //   key: 'comname',
    //   label: '部门',
    //   type: 'input',
    //   props: { placeholder: '输入部门名（模糊）', clearable: true }
    // },
    // {
    //   key: 'groups',
    //   label: '小组',
    //   type: 'input',
    //   props: { placeholder: '输入小组名（模糊）', clearable: true }
    // }
  ])

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
      apiFn: async (params: { current: number; size: number; [k: string]: any }) => {
        const queryParams = {
          tjDate: tableApiParams.value.tjDate || '',
          comname: tableApiParams.value.comname ?? '',
          groups: tableApiParams.value.groups ?? ''
        }
        const res = await dataReport.axiosRequestLingjieGroup(queryParams)
        const records = (Array.isArray(res) ? res : []) as LingjieGroupData[]
        if (records.length) {
          currentMaxTjTime.value = records[0].maxTjTime || ''
          if (!searchFormState.value.tjDate && records[0].maxTjTime) {
            searchFormState.value.tjDate = records[0].maxTjTime.substring(0, 10)
          }
        } else {
          currentMaxTjTime.value = ''
        }
        const start = (params.current - 1) * params.size
        const sliced = records.slice(start, start + params.size)
        return {
          records: sliced,
          total: records.length,
          current: params.current,
          size: params.size
        }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: () => [
        {
          prop: 'comname',
          label: '部门',
          minWidth: 80,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        {
          prop: 'groups',
          label: '小组',
          minWidth: 80,
          align: 'center',
          fixed: 'left',
          sortable: true
        },
        { prop: 'ljl1_3', label: '1-3月零结量', width: 120, align: 'center', sortable: true },
        {
          prop: 'lj1_3Pp',
          label: '1-3月零结量占比',
          width: 140,
          align: 'center',
          formatter: percentFormatter('lj1_3Pp')
        },
        { prop: 'ljl4', label: '当月零结量', width: 110, align: 'center', sortable: true },
        {
          prop: 'lj4Pp',
          label: '当月零结量占比',
          width: 130,
          align: 'center',
          formatter: percentFormatter('lj4Pp')
        },
        { prop: 'ljlWeek', label: '本周零结量', width: 110, align: 'center', sortable: true },
        {
          prop: 'ljWeekPp',
          label: '本周零结案占比',
          width: 130,
          align: 'center',
          formatter: percentFormatter('ljWeekPp')
        }
      ]
    },
    performance: {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
      debounceTime: 300,
      maxCacheSize: 100
    }
  })

  const handleRefresh = async () => {
    await fetchData()
  }

  /**
   * comname 列跨行合并（不重排数据，保留 bm → groups → zxzt 的业务顺序）
   * 跳过 groups 行的 comname（空字符串/null），不参与合并
   * "中心整体"（zxzt）只 1 行，不参与合并
   */
  const spanMethod = ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) => {
    // 第一列是 comname（无序号列）
    if (columnIndex !== 0) return undefined
    const rows = tableData.value as LingjieGroupData[]
    if (!rows?.length) return undefined
    const cur = rows[rowIndex]
    const curVal = cur?.comname
    if (!curVal) return { rowspan: 1, colspan: 1 }
    // 向上找最近的同 comname 起始行
    let start = rowIndex
    while (start > 0 && rows[start - 1]?.comname === curVal) start--
    // 向下数连续相同 comname 的行数
    let span = 1
    let i = rowIndex + 1
    while (i < rows.length && rows[i]?.comname === curVal) {
      span++
      i++
    }
    if (start === rowIndex) {
      return { rowspan: span, colspan: 1 }
    }
    // 非起始行：被合并掉
    return { rowspan: 0, colspan: 0 }
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

  const exportColumns = (item: LingjieGroupData, index: number) => ({
    序号: index + 1,
    部门: item.comname || '',
    小组: item.groups || '',
    '1-3月零结量': item.ljl1_3 ?? '',
    '1-3月零结占比': item.lj1_3Pp || '',
    当月零结量: item.ljl4 ?? '',
    当月零结占比: item.lj4Pp || '',
    本周零结案: item.ljlWeek ?? '',
    本周零结案占比: item.ljWeekPp || ''
  })

  const dateSuffix = () => new Date().toLocaleDateString().replace(/\//g, '-')
  const SHEET = '零结案-小组'

  const handleExportAll = async () => {
    try {
      const res = await dataReport.axiosRequestLingjieGroup({
        tjDate: tableApiParams.value.tjDate || '',
        comname: tableApiParams.value.comname ?? '',
        groups: tableApiParams.value.groups ?? ''
      })
      const data = (Array.isArray(res) ? res : []) as LingjieGroupData[]
      if (!data.length) {
        ElNotification({ title: '提示', message: '暂无数据可导出', type: 'warning' })
        return
      }
      const ws = XLSX.utils.json_to_sheet(data.map(exportColumns))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, SHEET)
      XLSX.writeFile(wb, `${SHEET}_${dateSuffix()}.xlsx`)
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
