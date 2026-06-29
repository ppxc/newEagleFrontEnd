/**
 * useEfficiencyTable — efficiency 模块专用的 useTable 包装
 *
 * ## 背景
 *
 * `useTable` 暴露的 `handleSizeChange`（hooks/core/useTable.ts:486）已经
 * 正确地同步更新 `pagination.size` 和 `pagination.current` 后再 fetchData，
 * 但 efficiency 下 60+ 个页面在模板中通过 `@pagination:size-change`
 * 绑定的都是本地的 `localHandleSizeChange`，里面直接调用
 * `fetchData({ size: n, current: 1 })`，绕过了 hook 内的 size 同步。
 * 结果 ElPagination 仍显示旧的 page-size，总页数不会刷新。
 *
 * ## 解法
 *
 * 在 efficiency 模块内提供本包装，**直接转发** useTable 的返回对象。
 * 模板事件 `@pagination:size-change` 改绑到本包装返回的 `handleSizeChange`
 * 即可，**无需修改** hooks/core/useTable.ts，也**无需修改**
 * utils/table/tableUtils.ts。
 *
 * ## 用法
 *
 * ```ts
 * // before
 * const { data, ... } = useTable({ core: {...}, performance: {...} })
 * const localHandleSizeChange = (n) => fetchData({ size: n, current: 1 })
 *
 * // after
 * const { data, handleSizeChange, ... } = useEfficiencyTable({ core: {...}, performance: {...} })
 * // 模板中：@pagination:size-change="handleSizeChange"
 * ```
 */

import { useTable, CacheInvalidationStrategy } from '@/hooks/core/useTable'

/**
 * useEfficiencyTable — efficiency 模块专用的 useTable 包装
 *
 * ## 修复分页
 *
 * useTable 内部的 `handleSizeChange` / `handleCurrentChange` 调用
 * `getData()`（即 `getDataByPage`），每次都会重置 pagination.current = 1，
 * 导致翻页永远回到第 1 页、切换每页条数无效。
 *
 * 本包装 override 这两个方法，直接调用 `fetchData`（useTable 内部的 `getData`，
 * 不重置页码），并传入显式 `{ current, size }` 参数，
 * 确保 apiFn 收到正确的分页参数。与 costcontrol 页面的
 * `localHandleCurrentChange = (n) => fetchData({current: n})` 原理一致。
 */
export function useEfficiencyTable<TApiFn extends (params: any) => Promise<any>>(
  config: Parameters<typeof useTable<TApiFn>>[0]
) {
  const result = useTable<TApiFn>(config)

  /** 当前页变化：直接调用 fetchData 传入新页码，不经过 getDataByPage（不重置页码） */
  const handleSizeChange = async (newSize: number): Promise<void> => {
    result.clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')
    await result.fetchData({ current: 1, size: newSize } as any)
  }

  /** 当前页变化：直接调用 fetchData 传入新页码，不经过 getDataByPage（不重置页码） */
  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    await result.fetchData({ current: newCurrent } as any)
  }

  return {
    ...result,
    handleSizeChange,
    handleCurrentChange
  }
}
