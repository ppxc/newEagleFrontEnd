import { ref, computed } from 'vue'
import { useTable, CacheInvalidationStrategy } from '@/hooks/core/useTable'

/**
 * 劳效监控（laoxiao）9 个报表页面的通用 composable。
 *
 * 把 9 个 .vue 文件中重复的：搜索表单 + comnameSgs 下拉构建 + currentMaxTjTime
 * 跟踪 + useTable(apiFn 调分页端点) + handleSearch/Reset/Refresh 全部抽到此处。
 * 9 个页面只需提供：分页端点（pageApi）、全量端点（listApi）、列定义（columnsFactory）、
 * 是否启用 comnameSgs 下拉。
 *
 * 分页端点（pageApi）后端返回 PageResult<T> = { records, total, current, size }
 * 全量端点（listApi）后端返回 List<T>（仅用于构建 comnameSgs 下拉的去重 Set）
 */

export interface UseLaoxiaoTableOptions {
  /** 后端分页端点（返回 PageResult<T>） */
  pageApi: (params: any) => Promise<any>
  /** 后端全量端点（用于构造 comnameSgs 下拉的去重集合） */
  listApi: (params: any) => Promise<any>
  /** 列定义工厂（透传给 useTable） */
  columnsFactory: () => any[]
  /** 是否启用 comnameSgs 下拉过滤（默认 true；rs_gzl_year/rs_tjl_year 传 false） */
  hasComnameSgs?: boolean
  /** 默认每页大小（默认 20） */
  defaultSize?: number
}

interface UseTableParams {
  current: number
  size: number
  [key: string]: any
}

export function useLaoxiaoTable(opts: UseLaoxiaoTableOptions) {
  const hasComnameSgs = opts.hasComnameSgs ?? true
  const defaultSize = opts.defaultSize ?? 20
  const defaultForm: Record<string, any> = { tjDate: '', comnameSgs: '' }

  // ==================== 状态 ====================
  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')
  const comnameSgsOptions = ref<Array<{ label: string; value: string }>>([])

  const rules = {
    tjDate: [{ required: false, message: '请选择统计时间', trigger: 'change' }]
  }
  const searchFormState = ref({ ...defaultForm })
  const tableApiParams = ref<Record<string, any>>({
    current: 1,
    size: defaultSize,
    ...searchFormState.value
  })

  // ==================== 搜索表单配置 ====================
  const searchItems = computed(() => {
    const items: any[] = [
      {
        key: 'tjDate',
        label: '统计时间',
        type: 'date',
        props: { placeholder: '选择统计时间', valueFormat: 'YYYY-MM-DD' }
      }
    ]
    if (hasComnameSgs) {
      items.push({
        key: 'comnameSgs',
        label: '地市公司',
        type: 'select',
        props: {
          placeholder: '请选择地市公司',
          clearable: true,
          options: comnameSgsOptions.value
        }
      })
    }
    return items
  })

  // ==================== 下拉选项构建 ====================
  const buildComnameSgsOptions = async (tjDate: string) => {
    if (!hasComnameSgs) return
    try {
      const res = await opts.listApi({ current: 1, size: 9999, tjDate, comnameSgs: '' })
      if (Array.isArray(res)) {
        const set = new Set<string>()
        res.forEach((item: any) => {
          if (item.comnameSgs) set.add(item.comnameSgs)
        })
        comnameSgsOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
      }
    } catch {
      /* ignore */
    }
  }

  // ==================== useTable 钩子 ====================
  const {
    data: tableData,
    loading,
    error: tableError,
    pagination,
    refreshData,
    fetchData,
    columns,
    columnChecks,
    clearCache
  } = useTable({
    core: {
      apiFn: async (params: UseTableParams): Promise<any> => {
        const queryParams: Record<string, any> = {
          current: params.current,
          size: params.size,
          tjDate: tableApiParams.value.tjDate || ''
        }
        if (hasComnameSgs) {
          queryParams.comnameSgs = tableApiParams.value.comnameSgs ?? ''
        }
        // 后端 /page 端点直接返回 { records, total, current, size }
        const response = await opts.pageApi(queryParams)
        const page = (response ?? {}) as any
        const records = (page.records || []) as any[]
        if (records.length) {
          const firstRecord = records[0] as any
          currentMaxTjTime.value = firstRecord.maxTjTime || ''
          if (!searchFormState.value.tjDate && firstRecord.maxTjTime) {
            searchFormState.value.tjDate = firstRecord.maxTjTime.substring(0, 10)
          }
          // 用当前页数据直接构建地市公司下拉选项（避免额外的 listApi 请求）
          if (hasComnameSgs) {
            const set = new Set<string>()
            records.forEach((item: any) => {
              if (item.comnameSgs) set.add(item.comnameSgs)
            })
            comnameSgsOptions.value = Array.from(set).map((name) => ({ label: name, value: name }))
          }
        } else {
          currentMaxTjTime.value = ''
          comnameSgsOptions.value = []
        }
        return {
          records,
          total: page.total ?? 0,
          current: params.current,
          size: params.size
        }
      },
      apiParams: tableApiParams.value,
      immediate: true,
      columnsFactory: opts.columnsFactory
    },
    performance: {
      enableCache: true,
      cacheTime: 5 * 60 * 1000,
      debounceTime: 300,
      maxCacheSize: 100
    }
  })

  // ==================== 操作 ====================

  /**
   * 分页大小变化：先同步刷新 pagination，再 fetchData
   * 与 full/useTable 原生 handler 保持一致——ElPagination 立刻看到新 size
   */
  const handleSizeChange = async (newSize: number) => {
    if (newSize <= 0) return
    ;(pagination as { size: number; current: number }).size = newSize
    ;(pagination as { size: number; current: number }).current = 1
    tableApiParams.value.current = 1
    tableApiParams.value.size = newSize
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')
    await fetchData({ current: 1, size: newSize })
  }

  /** 当前页变化：先同步刷新 pagination.current，再 fetchData */
  const handleCurrentChange = async (newCurrent: number) => {
    if (newCurrent <= 0) return
    ;(pagination as { size: number; current: number }).current = newCurrent
    tableApiParams.value.current = newCurrent
    await fetchData({ current: newCurrent })
  }

  const handleRefresh = async () => {
    if (hasComnameSgs) {
      try {
        const res = await opts.listApi({
          current: 1,
          size: 9999,
          tjDate: tableApiParams.value.tjDate,
          comnameSgs: ''
        })
        if (Array.isArray(res) && res.length) {
          currentMaxTjTime.value = (res[0] as any).maxTjTime || ''
          buildComnameSgsOptions(tableApiParams.value.tjDate || (res[0] as any).maxTjTime || '')
        }
      } catch {
        /* ignore */
      }
    }
    refreshData()
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
      tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
      if (hasComnameSgs) {
        buildComnameSgsOptions(tableApiParams.value.tjDate || '')
      }
      refreshData()
    } catch {
      /* validation failed */
    }
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, defaultForm)
    tableApiParams.value = { current: 1, size: defaultSize, ...searchFormState.value }
    comnameSgsOptions.value = []
    refreshData()
  }

  return {
    // 搜索表单
    searchBarRef,
    searchFormState,
    searchItems,
    rules,
    // 表格数据
    tableApiParams,
    tableData,
    loading,
    tableError,
    pagination,
    refreshData,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks,
    // 状态
    currentMaxTjTime,
    comnameSgsOptions,
    // 操作
    handleRefresh,
    handleSearch,
    handleReset
  }
}
