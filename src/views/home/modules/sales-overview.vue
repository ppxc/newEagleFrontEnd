<!-- 全年工作量：折线图（带渐变区） -->
<template>
  <div class="art-card h-105 p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>工作量折线图</h4>
      </div>
    </div>
    <ArtLineChart
      height="calc(100% - 56px)"
      :data="lineData"
      :x-axis-data="xAxisData"
      :show-area-color="true"
      :show-axis-line="false"
    />
  </div>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { WorkloadDeptVO } from '../api'

  const raw = ref<WorkloadDeptVO[]>([])

  onMounted(async () => {
    raw.value = await Home.getWorkloadTrend('month')
  })

  // 12 个月标签
  const xAxisData = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月'
  ]

  // 取所有部门 zl 汇总 → 单 series 折线
  const lineData = computed<number[]>(() => {
    const arr = new Array(12).fill(0)
    raw.value.forEach((dept) => {
      dept.data.forEach((d) => {
        const m = d.period.match(/-(\d{2})$/)
        if (m) {
          const idx = parseInt(m[1], 10) - 1
          if (idx >= 0 && idx < 12) arr[idx] += d.zl || 0
        }
      })
    })
    // 当数据稀疏（如 mock 只有 9 个月）时其他月份置 0 不影响渲染
    return arr
  })
</script>
