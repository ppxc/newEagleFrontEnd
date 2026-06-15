<template>
  <div ref="chartRef" class="workload-line-chart" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface MonthData {
  period: string
  zl: number
  ja: number
  ckJsl: number
  dsTjl: number
  isAbnormal?: boolean
}

interface SeriesData {
  name: string
  data: MonthData[]
  isAbnormal?: boolean
}

interface Props {
  chartData: SeriesData[]
  loading?: boolean
  height?: number
  yAxisKey?: 'zl' | 'ja' | 'ckJsl' | 'dsTjl'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 500,
  yAxisKey: 'zl'
})

const emit = defineEmits<{
  seriesClick: [seriesName: string]
}>()

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

const yAxisLabel = {
  zl: '总量',
  ja: '结案量',
  ckJsl: '查勘接收量',
  dsTjl: '定损提交量'
}

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const period = params[0].axisValue
        let html = `<strong>${period}</strong><br/>`
        params.forEach((p: any) => {
          const abnormalMark = p.data.isAbnormal ? ' 🔴' : ''
          html += `${p.marker} ${p.seriesName}: ${p.data.value}${abnormalMark}<br/>`
        })
        return html
      }
    },
    legend: {
      data: props.chartData.map(d => d.name),
      top: 10,
      type: 'scroll'
    },
    grid: {
      left: 60,
      right: 30,
      top: 50,
      bottom: 60
    },
    xAxis: {
      type: 'category',
      data: getXAxisData(),
      axisLabel: { rotate: 45, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel[props.yAxisKey],
      nameTextStyle: { fontSize: 12 }
    },
    series: buildSeries(),
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 }
    ]
  }

  chartInstance.setOption(option)

  // 绑定点击事件
  chartInstance.on('click', (params: any) => {
    if (params.seriesName) {
      emit('seriesClick', params.seriesName)
    }
  })
}

const getXAxisData = () => {
  if (!props.chartData || !props.chartData.length) return []
  const allPeriods = new Set<string>()
  props.chartData.forEach(dept => {
    dept.data.forEach(d => allPeriods.add(d.period))
  })
  return Array.from(allPeriods).sort()
}

const buildSeries = () => {
  if (!props.chartData) return []

  return props.chartData.map(dept => {
    const xData = getXAxisData()
    const data = xData.map(period => {
      const monthData = dept.data.find(d => d.period === period)
      if (monthData) {
        return {
          value: monthData[props.yAxisKey] || 0,
          isAbnormal: monthData.isAbnormal || false
        }
      }
      return { value: 0, isAbnormal: false }
    })

    return {
      name: dept.name,
      type: 'line',
      data,
      smooth: true,
      lineStyle: {
        width: dept.isAbnormal ? 3 : 2,
        color: dept.isAbnormal ? '#ff4d4f' : undefined
      },
      itemStyle: {
        color: dept.isAbnormal ? '#ff4d4f' : undefined
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 3,
          borderColor: '#fff'
        }
      }
    }
  })
}

const updateChart = () => {
  if (!chartInstance) return

  const xData = getXAxisData()
  chartInstance.setOption({
    xAxis: { data: xData },
    series: buildSeries(),
    legend: { data: props.chartData.map(d => d.name) }
  }, false, true)
}

watch(() => props.chartData, () => {
  nextTick(updateChart)
}, { deep: true })

watch(() => props.yAxisKey, () => {
  nextTick(updateChart)
})

onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

const handleResize = () => {
  chartInstance?.resize()
}
</script>

<style scoped>
.workload-line-chart {
  width: 100%;
}
</style>