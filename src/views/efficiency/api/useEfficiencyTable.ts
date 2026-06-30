/**
 * useEfficiencyTable — efficiency 模块专用的 useTable 包装
 *
 * ## 背景
 *
 * `useTable` 内置的 `handleSizeChange` / `handleCurrentChange`
 * (hooks/core/useTable.ts:486 / :503) 已正确地在 fetchData 前同步设置
 * `pagination.size / .current`。但 efficiency 下 49 个 operations /
 * costcontrol 页面在模板中通过 `@pagination:size-change` 绑定的都是
 * 这里的 `handleSizeChange`，而模板里又给 `@pagination:current-change`
 * 绑的是页面级 `localHandleCurrentChange = (n) => fetchData({ current: n })`，
 * 完全绕过 hook。
 *
 * ## 解法
 *
 * 本包装覆盖 useTable 的 `handleSizeChange` / `handleCurrentChange`，
 * 在 fetchData 前同步刷新 `pagination.size / .current`，让
 * ElPagination 的 `:page-size` / `:current-page` 立刻反映新值，
 * 同时重写 `maxPage` 计算依据。行为与 Intranet_eagle/FrontEnd/full
 * 的 system 页面保持一致。
 *
 * ## 用法
 *
 * ```ts
 * const { data, pagination, handleSizeChange, handleCurrentChange, ... } =
 *   useEfficiencyTable({ core: {...}, performance: {...} })
 *
 * // 模板中：
 * <ArtTable
 *   :pagination="pagination"
 *   @pagination:size-change="handleSizeChange"
 *   @pagination:current-change="handleCurrentChange"
 * />
 * ```
 */

import { useTable, CacheInvalidationStrategy } from '@/hooks/core/useTable'

export function useEfficiencyTable<TApiFn extends (params: any) => Promise<any>>(
  config: Parameters<typeof useTable<TApiFn>>[0]
) {
  const result = useTable<TApiFn>(config)

  /** 分页大小变化：先同步刷新 pagination，再 fetchData。
   *  与 full/useTable 原生 handler 保持一致——ElPagination 立刻看到新 size。 */
  const handleSizeChange = async (newSize: number): Promise<void> => {
    if (newSize <= 0) return
    result.clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')
    ;(result.pagination as { size: number; current: number }).size = newSize
    ;(result.pagination as { size: number; current: number }).current = 1
    await result.fetchData({ current: 1, size: newSize } as any)
  }

  /** 当前页变化：先同步刷新 pagination.current，再 fetchData */
  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    if (newCurrent <= 0) return
    ;(result.pagination as { size: number; current: number }).current = newCurrent
    await result.fetchData({ current: newCurrent } as any)
  }

  return {
    ...result,
    handleSizeChange,
    handleCurrentChange
  }
}
