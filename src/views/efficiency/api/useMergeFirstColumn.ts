import { computed } from 'vue'

/**
 * 首列合并 hook —— 在不修改 ArtTable 源码的情况下实现 mergeFirstColumn 功能。
 *
 * 用法：
 *   const { mergedData, spanMethod } = useMergeFirstColumn(tableData, columns)
 *
 *   <ArtTable :data="mergedData" :span-method="spanMethod" ... />
 */
export function useMergeFirstColumn(
  data: import('vue').Ref<any[]>,
  columns: import('vue').Ref<Array<{ type?: string; prop?: string }>>
) {
  // 找到第一个非类型列的 prop
  const firstDataColumnProp = computed(() => {
    const firstCol = columns.value?.find((col) => !col.type)
    return firstCol?.prop || null
  })

  // 按首列排序，确保相同值连续
  const mergedData = computed(() => {
    const prop = firstDataColumnProp.value
    if (!prop || !data.value?.length) return data.value ?? []
    return [...data.value].sort((a, b) => {
      const va = a[prop],
        vb = b[prop]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return va - vb
      return String(va).localeCompare(String(vb), 'zh')
    })
  })

  // 预计算每行的 rowspan，O(n)
  const rowSpanMap = computed(() => {
    const map = new Map<number, number>()
    const prop = firstDataColumnProp.value
    const sorted = mergedData.value
    if (!prop || !sorted.length) return map

    let i = 0
    while (i < sorted.length) {
      const currentVal = sorted[i]?.[prop]
      let span = 1
      let j = i + 1
      while (j < sorted.length) {
        const nextVal = sorted[j]?.[prop]
        if (
          currentVal === nextVal ||
          (currentVal != null && nextVal != null && String(currentVal) === String(nextVal))
        ) {
          span++
          j++
        } else {
          break
        }
      }
      if (span > 1) {
        map.set(i, span)
        for (let k = i + 1; k < j; k++) {
          map.set(k, 0)
        }
      }
      i = j
    }
    return map
  })

  // 传给 ArtTable 的 span-method 回调
  const spanMethod = computed(() => {
    const firstDataColIndex = (columns.value || []).findIndex((col) => !col.type)
    if (firstDataColIndex === -1) return undefined

    return ({
      rowIndex,
      columnIndex
    }: {
      row: any
      column: any
      rowIndex: number
      columnIndex: number
    }) => {
      if (columnIndex === firstDataColIndex) {
        const span = rowSpanMap.value.get(rowIndex)
        if (span !== undefined) {
          return { rowspan: span, colspan: span === 0 ? 0 : 1 }
        }
      }
      return undefined
    }
  })

  return { mergedData, spanMethod }
}
