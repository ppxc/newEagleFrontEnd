import { ref, computed } from 'vue'
import { useTable, CacheInvalidationStrategy } from '@/hooks/core/useTable'

/**
 * useEfficiencyTable — efficiency 模块通用表格 composable
 *
 * 适用所有 efficiency/laoxiao/costcontrol/operations 数据报表页。
 * 调方只需声明：
 *   - pageApi: 后端 /page 端点（返回 { records, total, current, size }）
 *   - listApi 可通过 searchFields[i].dropdown.listApi 逐字段声明
 *   - columnsFactory: 列定义工厂
 *   - searchFields: 搜索表单项（含 date / select / input）
 *
 * Hook 内部自动处理：
 *   - apiFn 组装（params.current/size + 全部 searchField key）
 *   - 搜索 / 重置 / 刷新（带参数回填）
 *   - 分页大小 / 当前页切换（绕开 useTable 内重置页码的 getData）
 *   - 搜索项下拉的去重构建（per-source 一次全量 + 后续 records 累加）
 *   - currentMaxTjTime 跟踪 + 反填 tjDate 输入
 *
 * 模板中直接解构返回值使用：
 *   const { tableData, columns, pagination, handleSizeChange, handleCurrentChange,
 *           handleSearch, handleReset, handleRefresh, searchFormState, searchItems,
 *           rules, currentMaxTjTime, loading, tableError, columnChecks,
 *           searchBarRef, tableApiParams, fetchData, refreshData, clearCache } =
 *     useEfficiencyTable<T>({ pageApi, searchFields, columnsFactory })
 */

export interface SearchFieldSelect {
  /** 下拉去重字段，如 'comnameSgs' / 'comname' / 'username' */
  source: string
  /** 全量端点（与 pageApi 同形参），仅用于构建去重下拉 */
  listApi: (params: any) => Promise<any>
  /** 可选：首次成功加载后弹的 ElNotification 文案（含数量占位） */
  notifyMessage?: string
}

export interface SearchField {
  key: string
  label: string
  type: 'date' | 'select' | 'input'
  props?: Record<string, any>
  /** span 透传给 ArtSearchBar（ElCol xs/sm/md/lg/xl） */
  span?: number
  /** type='select' 时填；提供后 hook 自动构建 options */
  dropdown?: SearchFieldSelect
  required?: boolean
}

export interface UseEfficiencyTableOptions {
  pageApi: (params: any) => Promise<any>
  columnsFactory: () => any[]
  searchFields: SearchField[]
  defaultSize?: number
  performance?: {
    enableCache?: boolean
    cacheTime?: number
    debounceTime?: number
    maxCacheSize?: number
  }
}

interface UseTableParams {
  current: number
  size: number
  [key: string]: any
}

export function useEfficiencyTable(opts: UseEfficiencyTableOptions) {
  const defaultSize = opts.defaultSize ?? 20
  const perf = {
    enableCache: opts.performance?.enableCache ?? true,
    cacheTime: opts.performance?.cacheTime ?? 5 * 60 * 1000,
    debounceTime: opts.performance?.debounceTime ?? 300,
    maxCacheSize: opts.performance?.maxCacheSize ?? 100
  }

  // ==================== 状态 ====================
  const searchBarRef = ref<any>(null)
  const currentMaxTjTime = ref<string>('')

  // 每个 select 字段独立的 options 与加载状态
  const dropdownOptions = ref<Record<string, Array<{ label: string; value: string }>>>({})
  const dropdownLoaded = ref<Record<string, boolean>>({})

  const defaultForm = computed<Record<string, any>>(() => {
    const f: Record<string, any> = {}
    opts.searchFields.forEach((sf) => {
      f[sf.key] = ''
    })
    return f
  })

  const rules = computed(() => {
    const r: Record<string, any[]> = {}
    opts.searchFields.forEach((sf) => {
      if (sf.required) {
        r[sf.key] = [{ required: true, message: `请选择${sf.label}`, trigger: 'change' }]
      } else if (sf.type === 'date') {
        r[sf.key] = [{ required: false, message: `请选择${sf.label}`, trigger: 'change' }]
      }
    })
    return r
  })

  const searchFormState = ref<Record<string, any>>({ ...defaultForm.value })
  const tableApiParams = ref<Record<string, any>>({
    current: 1,
    size: defaultSize,
    ...searchFormState.value
  })

  // ==================== 搜索项配置 ====================
  const searchItems = computed<any[]>(() =>
    opts.searchFields.map((sf) => {
      const item: any = {
        key: sf.key,
        label: sf.label,
        type: sf.type,
        props: { ...(sf.props || {}) }
      }
      if (sf.span != null) item.span = sf.span
      if (sf.type === 'select' && sf.dropdown) {
        item.props.options = dropdownOptions.value[sf.dropdown.source] || []
        item.props.clearable = item.props.clearable ?? true
      }
      return item
    })
  )

  // ==================== 下拉构建 ====================
  const loadDropdown = async (sf: SearchField) => {
    if (sf.type !== 'select' || !sf.dropdown) return
    if (dropdownLoaded.value[sf.dropdown.source]) return
    try {
      const res = await sf.dropdown.listApi({
        current: 1,
        size: 9999,
        tjDate: tableApiParams.value.tjDate || '',
        ...searchFormState.value
      })
      if (Array.isArray(res)) {
        const set = new Set<string>()
        res.forEach((item: any) => {
          const v = item?.[sf.dropdown!.source]
          if (v) set.add(String(v))
        })
        dropdownOptions.value[sf.dropdown.source] = Array.from(set).map((name) => ({
          label: name,
          value: name
        }))
        dropdownLoaded.value[sf.dropdown.source] = true
        if (sf.dropdown.notifyMessage) {
          // 静态引入避免循环依赖（element-plus 全局已挂载）
          const { ElNotification } = await import('element-plus')
          ElNotification({
            title: '提示',
            message: `已加载：${dropdownOptions.value[sf.dropdown.source].length} ${sf.dropdown.notifyMessage}`,
            type: 'success'
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  const ensureDropdowns = async () => {
    for (const sf of opts.searchFields) {
      await loadDropdown(sf)
    }
  }

  // ==================== useTable 钩子 ====================
  const {
    data: tableData,
    loading,
    error: tableError,
    pagination,
    fetchData,
    refreshData,
    columns,
    columnChecks,
    clearCache
  } = useTable<any>({
    core: {
      apiFn: async (params: UseTableParams): Promise<any> => {
        const queryParams: Record<string, any> = {
          current: params.current,
          size: params.size
        }
        opts.searchFields.forEach((sf) => {
          queryParams[sf.key] = tableApiParams.value[sf.key] ?? ''
        })
        const response = await opts.pageApi(queryParams)
        const page = (response ?? {}) as any
        const records = (page.records || []) as any[]

        if (records.length) {
          const firstRecord = records[0] as any
          currentMaxTjTime.value = firstRecord.maxTjTime || ''
          // 反填 tjDate 搜索项（如有）
          const tjDateField = opts.searchFields.find((sf) => sf.key === 'tjDate')
          if (tjDateField && !searchFormState.value.tjDate && firstRecord.maxTjTime) {
            searchFormState.value.tjDate = firstRecord.maxTjTime.substring(0, 10)
          }
          // 用当前页数据累加下拉去重
          opts.searchFields.forEach((sf) => {
            if (sf.type !== 'select' || !sf.dropdown) return
            const source = sf.dropdown.source
            const existing = new Set(
              (dropdownOptions.value[source] || []).map((o) => o.value)
            )
            records.forEach((item: any) => {
              const v = item?.[source]
              if (v) existing.add(String(v))
            })
            dropdownOptions.value[source] = Array.from(existing).map((name) => ({
              label: name,
              value: name
            }))
          })
        } else {
          currentMaxTjTime.value = ''
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
    performance: perf
  })

  // ==================== 操作 ====================
  const handleSizeChange = async (newSize: number) => {
    tableApiParams.value.current = 1
    tableApiParams.value.size = newSize
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')
    await fetchData({ current: 1, size: newSize } as any)
  }

  const handleCurrentChange = async (newCurrent: number) => {
    tableApiParams.value.current = newCurrent
    await fetchData({ current: newCurrent } as any)
  }

  const handleRefresh = async () => {
    // 仅补齐未加载过的下拉，已加载的复用 options（避免重复弹 Notification）
    for (const sf of opts.searchFields) {
      if (sf.type !== 'select' || !sf.dropdown) continue
      if (dropdownLoaded.value[sf.dropdown.source]) continue
      try {
        const res = await sf.dropdown.listApi({
          current: 1,
          size: 9999,
          tjDate: tableApiParams.value.tjDate || '',
          ...searchFormState.value
        })
        if (Array.isArray(res) && res.length) {
          const set = new Set<string>()
          res.forEach((item: any) => {
            const v = item?.[sf.dropdown!.source]
            if (v) set.add(String(v))
          })
          dropdownOptions.value[sf.dropdown.source] = Array.from(set).map((name) => ({
            label: name,
            value: name
          }))
          dropdownLoaded.value[sf.dropdown.source] = true
          if (sf.dropdown.notifyMessage) {
            const { ElNotification } = await import('element-plus')
            ElNotification({
              title: '提示',
              message: `已加载：${dropdownOptions.value[sf.dropdown.source].length} ${sf.dropdown.notifyMessage}`,
              type: 'success'
            })
          }
        }
      } catch {
        /* ignore */
      }
    }
    await refreshData()
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
      tableApiParams.value = { ...tableApiParams.value, ...searchFormState.value }
      // 重置时允许重新构建下拉（用户可能换了 tjDate 过滤条件）
      opts.searchFields.forEach((sf) => {
        if (sf.type === 'select' && sf.dropdown) {
          dropdownLoaded.value[sf.dropdown.source] = false
        }
      })
      await ensureDropdowns()
      await refreshData()
    } catch {
      /* validation failed */
    }
  }

  const handleReset = () => {
    Object.assign(searchFormState.value, defaultForm.value)
    tableApiParams.value = { current: 1, size: defaultSize, ...defaultForm.value }
    // 重置后允许重建下拉
    opts.searchFields.forEach((sf) => {
      if (sf.type === 'select' && sf.dropdown) {
        dropdownOptions.value[sf.dropdown.source] = []
        dropdownLoaded.value[sf.dropdown.source] = false
      }
    })
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
    fetchData,
    refreshData,
    clearCache,
    handleSizeChange,
    handleCurrentChange,
    columns,
    columnChecks,
    // 状态
    currentMaxTjTime,
    // 操作
    handleRefresh,
    handleSearch,
    handleReset
  }
}
