<!-- 部门工作量趋势：柱状图 + 4 个数字 -->
<template>
  <div class="art-card h-105 p-4 box-border mb-5 max-sm:mb-4">
    <ArtBarChart
      class="box-border p-2"
      bar-width="50%"
      height="13.7rem"
      :show-axis-line="false"
      :data="chartSeries"
      :x-axis-data="xAxisLabels"
    />
    <div class="ml-1">
      <h3 class="mt-5 text-lg font-medium">部门工作量</h3>
      <p class="mt-1 text-sm"> 比上月 <span class="text-success font-medium">+15%</span> </p>
      <p class="mt-1 text-sm">各部门当月案件总量与结案量分布</p>
    </div>
    <div class="flex-b mt-2">
      <div class="flex-1" v-for="(item, index) in summary" :key="index">
        <p class="text-2xl text-g-900">{{ item.num }}</p>
        <p class="text-xs text-g-500">{{ item.name }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { WorkloadDeptVO, WorkloadPeriodVO } from '../api'

  const raw = ref<WorkloadDeptVO[]>([])

  onMounted(async () => {
    raw.value = await Home.getWorkloadTrend('month')
  })

  // X 轴：取第一个部门的 period 列表
  const xAxisLabels = computed<string[]>(() => {
    if (!raw.value.length) return []
    return raw.value[0].data.map((d) => formatPeriod(d.period))
  })

  // 多部门数据：每部门一个 series
  const chartSeries = computed(() => {
    return raw.value.map((dept) => ({
      name: dept.comName,
      data: dept.data.map((d: WorkloadPeriodVO) => d.zl)
    }))
  })

  // 底部 4 个数字：所有部门 zl 总和、ja 总和、ckJsl 总和、dsTjl 总和
  const summary = computed(() => {
    let zl = 0
    let ja = 0
    let ck = 0
    let ds = 0
    raw.value.forEach((dept) => {
      dept.data.forEach((d) => {
        zl += d.zl || 0
        ja += d.ja || 0
        ck += d.ckJsl || 0
        ds += d.dsTjl || 0
      })
    })
    return [
      { name: '总案件量', num: zl.toLocaleString() },
      { name: '结案量', num: ja.toLocaleString() },
      { name: '查勘接收', num: ck.toLocaleString() },
      { name: '定损提交', num: ds.toLocaleString() }
    ]
  })

  function formatPeriod(p: string): string {
    // 2025-09 -> 9月
    if (!p) return ''
    const m = p.match(/-(\d{2})$/)
    return m ? `${parseInt(m[1], 10)}月` : p
  }
</script>
