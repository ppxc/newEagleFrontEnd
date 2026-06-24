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

import { useTable } from '@/hooks/core/useTable'

// 返回类型由 useTable 推导，避免重复导出
export function useEfficiencyTable<TApiFn extends (params: any) => Promise<any>>(
  config: Parameters<typeof useTable<TApiFn>>[0]
) {
  return useTable<TApiFn>(config)
}
