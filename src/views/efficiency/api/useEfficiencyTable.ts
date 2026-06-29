import { ref, computed, watch } from 'vue'
import { useTable, CacheInvalidationStrategy } from '@/hooks/core/useTable'

/**
 * useEfficiencyTable — efficiency 模块通用表格 composable
 *
 * 适用所有 efficiency/laoxiao/costcontrol/operations 数据报表页。
 *
 * 调方声明：
 *   - pageApi: 后端 /page 端点（返回 { records, total, current, size }）
 *   - columnsFactory: 列定义工厂
 *   - searchFields: 搜索表单项（date / select / input）
 *     - select 字段的 options 由 dropdown.listApi 全量拉取构建（不依赖分页 records）
 *     - 任意 searchField 的 props 可以传 `() => any` 函数以支持 reactive / 级联
 *
 * 模板直接解构返回值（典型）：
 *   const { tableData, columns, pagination, handleSizeChange, handleCurrentChange,
 *           handleSearch, handleReset, handleRefresh, searchFormState, searchItems,
 *           rules, currentMaxTjTime, loading, tableError, columnChecks,
 *           searchBarRef, tableApiParams, fetchData, refreshData, clearCache } =
 *     useEfficiencyTable({ pageApi, searchFields, columnsFactory })
 */

export interface SearchFieldSelect {
  /** 下拉去重字段，如 'comnameSgs' / 'comname' / 'username' */
  source: string
  /** 全量端点（与 pageApi 同形参），仅用于构建去重下拉 */
  listApi: (params: any) => Promise<any>
  /** 可选：成功加载后弹的 ElNotification 文案（含数量占位） */
  notifyMessage?: string
  /**
   * 可选：级联依赖字段。当任一依赖字段的当前值变化时，强制重新构建本下拉。
   * 例如 groups 依赖 comName: ['comName']
   */
  cascadeOn?: string[]
}

export type SearchFieldProps = Record<string, any> | (() => Record<string, any>)

export interface SearchField {
  key: string
  label: string
  type: 'date' | 'select' | 'input'
  props?: SearchFieldProps
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

/**
 * 解析 SearchField.props —— 支持函数形式以响应外部状态（级联）
 */
const resolveProps = (props: SearchFieldProps | undefined): Record<string, any> => {
  if (typeof props === 'function') return props() || {}
  return { ...(props || {}) }
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

  // 每个下拉字段独立的 options 与加载状态
  const dropdownOptions = ref<Record<string, Array<{ label: string; value: string }>>>({})
  const dropdownLoaded = ref<Record<string, boolean>>({})
  // 级联快照：依赖字段值变化时记录，让 loadDropdown 判断是否需要重拉
  const cascadeSnapshots = ref<Record<string, string>>({})

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

  // searchFormState 是 v-model 双向绑定的对象；searchParams 是 useTable 内部的 reactive 参数
  // 关键：把 searchFormState 传给 useTable 当 apiParams，让 useTable 直接读这个 reactive ref
  // ——任何外部对 searchFormState.xxx 的修改都会被 useTable 内部 fetchData 看到
  const searchFormState = ref<Record<string, any>>({ ...defaultForm.value })

  // ==================== 搜索项配置（支持 props 函数） ====================
  const searchItems = computed<any[]>(() =>
    opts.searchFields.map((sf) => {
      const baseProps = resolveProps(sf.props)
      const item: any = {
        key: sf.key,
        label: sf.label,
        type: sf.type,
        props: baseProps
      }
      if (sf.span != null) item.span = sf.span
      if (sf.type === 'select' && sf.dropdown) {
        item.props.options = dropdownOptions.value[sf.dropdown.source] || []
        item.props.clearable = item.props.clearable ?? true
      }
      return item
    })
  )

  // ==================== 下拉全量构建 ====================
  const notifyLoaded = async (sf: SearchField) => {
    if (!sf.dropdown?.notifyMessage) return
    const { ElNotification } = await import('element-plus')
    ElNotification({
      title: '提示',
      message: `已加载：${dropdownOptions.value[sf.dropdown.source]?.length ?? 0} ${sf.dropdown.notifyMessage}`,
      type: 'success'
    })
  }

  /**
   * 加载某个 searchField 的下拉（全量）
   * 如果该字段配置了 cascadeOn，则只有当依赖字段的快照变化时才真正重新拉取
   */
  const loadDropdown = async (sf: SearchField, force = false) => {
    if (sf.type !== 'select' || !sf.dropdown) return
    const source = sf.dropdown.source
    const deps = sf.dropdown.cascadeOn || []

    // 级联：若依赖字段快照未变，跳过
    if (!force) {
      const sig = deps.map((d) => `${d}=${searchFormState.value[d] ?? ''}`).join('|')
      if (dropdownLoaded.value[source] && cascadeSnapshots.value[source] === sig) return
    }

    try {
      const res = await sf.dropdown.listApi({
        current: 1,
        size: 9999,
        ...searchFormState.value
      })
      if (Array.isArray(res)) {
        const set = new Set<string>()
        res.forEach((item: any) => {
          const v = item?.[source]
          if (v) set.add(String(v))
        })
        dropdownOptions.value[source] = Array.from(set).map((name) => ({
          label: name,
          value: name
        }))
        dropdownLoaded.value[source] = true
        cascadeSnapshots.value[source] = deps
          .map((d) => `${d}=${searchFormState.value[d] ?? ''}`)
          .join('|')
        await notifyLoaded(sf)
      }
    } catch {
      /* ignore */
    }
  }

  const ensureDropdowns = async () => {
    for (const sf of opts.searchFields) {
      if (sf.type === 'select' && sf.dropdown) {
        await loadDropdown(sf)
      }
    }
  }

  // ==================== useTable 钩子 ====================
  // 关键修复：把 searchFormState.value（一个普通对象）作为 apiParams 传入
  // useTable 内部用 reactive() 包装，但 .value 替换是响应式的：
  // 当 searchFormState.value 被整个替换时（handleSearch/handleReset），
  // 我们手动同步 searchParams 的字段；如果只是改子属性，子属性自动响应。
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
          queryParams[sf.key] = searchFormState.value[sf.key] ?? ''
        })
        const response = await opts.pageApi(queryParams)
        const page = (response ?? {}) as any
        const records = (page.records || []) as any[]

        if (records.length) {
          const firstRecord = records[0] as any
          currentMaxTjTime.value = firstRecord.maxTjTime || ''
          const tjDateField = opts.searchFields.find((sf) => sf.key === 'tjDate')
          if (tjDateField && !searchFormState.value.tjDate && firstRecord.maxTjTime) {
            searchFormState.value.tjDate = firstRecord.maxTjTime.substring(0, 10)
          }
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
      apiParams: searchFormState.value,
      immediate: true,
      columnsFactory: opts.columnsFactory
    },
    performance: perf
  })

  // 暴露给调方的 tableApiParams —— 完全镜像 searchFormState（加 current/size）
  // 兼容老调用方：handleExportAll 仍读 tableApiParams.value
  const tableApiParams = computed<Record<string, any>>(() => ({
    current: pagination.current,
    size: pagination.size,
    ...searchFormState.value
  }))

  // ==================== 操作 ====================
  /**
   * 切每页条数：直接同步更新 useTable 内部的 pagination 和 searchParams。
   * 这是 useTable.ts:486 内部实现的等价物，但通过我们自己的逻辑确保翻页后切 size 也生效。
   */
  const handleSizeChange = async (newSize: number): Promise<void> => {
    if (newSize <= 0) return
    const pg = pagination as any
    pg.size = newSize
    pg.current = 1
    ;(searchFormState.value as any).size = newSize
    ;(searchFormState.value as any).current = 1
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')
    await fetchData()
  }

  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    if (newCurrent <= 0) return
    const pg = pagination as any
    if (pg.current === newCurrent) return
    pg.current = newCurrent
    ;(searchFormState.value as any).current = newCurrent
    await fetchData()
  }

  const handleRefresh = async () => {
    await ensureDropdowns()
    await refreshData()
  }

  const handleSearch = async () => {
    try {
      await searchBarRef.value?.validate()
      const pg = pagination as any
      pg.current = 1
      ;(searchFormState.value as any).current = 1
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
    searchFormState.value = { ...defaultForm.value }
    const pg = pagination as any
    pg.current = 1
    pg.size = defaultSize
    ;(searchFormState.value as any).size = defaultSize
    ;(searchFormState.value as any).current = 1
    opts.searchFields.forEach((sf) => {
      if (sf.type === 'select' && sf.dropdown) {
        dropdownOptions.value[sf.dropdown.source] = []
        dropdownLoaded.value[sf.dropdown.source] = false
      }
    })
    refreshData()
  }

  // ==================== 级联联动：依赖字段值变化时强制重拉下拉 ====================
  // 对每个有 cascadeOn 的下拉字段，watch 它的依赖字段值
  opts.searchFields.forEach((sf) => {
    if (sf.type !== 'select' || !sf.dropdown?.cascadeOn?.length) return
    watch(
      () => sf.dropdown!.cascadeOn!.map((d) => searchFormState.value[d]),
      async () => {
        // 强制重拉（即使之前加载过，因为依赖值变了）
        await loadDropdown(sf, true)
      }
    )
  })

  // 暴露 pageApiParams 给 handleExportAll 之类需要 size 的场景
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
