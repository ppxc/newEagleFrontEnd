<template>
  <div ref="chartRef" class="workload-line-chart" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
  import * as echarts from 'echarts'
  import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
  import { useSettingStore } from '@stores/modules/setting'

  interface MonthData {
    period: string
    zl: number
    ja: number
    ckJsl: number
    dsTjl: number
    isAbnormal?: boolean
    abnormalType?: string  // 'spike' | 'trend'
  }

  interface SeriesData {
    name: string
    data: MonthData[]
    isAbnormal?: boolean
    groupsCode?: string // 小组编码（用于钻取员工时直接使用，无需再查询）
    comCode?: string // 部门编码
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

  /**
   * 伪随机颜色生成（黄金角度分布，排除红/橙色以免与异常标记混淆）
   * - 黄金角 137.508° 让相邻索引的色相差最大，视觉上区分度最高
   * - 排除色相 0~45（红系）和 15~45（橙系），避免与异常 🔴 混淆
   * - 饱和度/亮度微抖动，避免颜色过于规律
   * - 一条线只生成一次颜色，索引稳定后切换 Y 轴指标时不会变色
   */
  const colorCache = new Map<string, string>()
  const getSeriesColor = (index: number, name: string): string => {
    if (colorCache.has(name)) return colorCache.get(name)!
    // 从 50° 开始（绕过红色 0°~45° 和橙色 30°~45°）
    const hue = (50 + index * 137.508) % 360
    const saturation = 65 + (index % 3) * 5
    const lightness = 50 + (index % 4) * 3
    const color = `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`
    colorCache.set(name, color)
    return color
  }

  // 主题：跟随系统设置切换（亮色 / 暗色）
  const settingStore = useSettingStore()
  // legend 文字颜色：暗色模式用浅色文字，亮色模式用深色文字
  const legendTextColor = computed(() => (settingStore.isDark ? '#e5e7eb' : '#374151'))
  // xAxis / yAxis 文字颜色同步
  const axisLabelColor = computed(() => (settingStore.isDark ? '#cbd5e1' : '#374151'))
  // yAxis 网格线颜色
  const splitLineColor = computed(() => (settingStore.isDark ? '#374151' : '#e5e7eb'))
  // tooltip 背景色
  const tooltipBgColor = computed(() => (settingStore.isDark ? '#1f2937' : '#fff'))
  const tooltipTextColor = computed(() => (settingStore.isDark ? '#e5e7eb' : '#374151'))

  const buildFullOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: tooltipBgColor.value,
        borderColor: tooltipBgColor.value,
        textStyle: { color: tooltipTextColor.value },
        formatter: (params: any) => {
          if (!params || !params.length) return ''
          const period = params[0].axisValue
          // 与 legend 联动：hover 某条线时，tooltip 只显示该条数据
          const filtered = hoveredLegendName
            ? params.filter((p: any) => p.seriesName === hoveredLegendName)
            : params
          if (!filtered.length) return ''
          let html = `<strong>${period}</strong><br/>`
          filtered.forEach((p: any) => {
            if (p.data.isAbnormal) {
              const typeLabel = p.data.abnormalType === 'spike' ? '（尖峰）' : '（趋势）'
              html += `${p.marker} ${p.seriesName}: ${p.data.value} ⚠️异常${typeLabel}<br/>`
            } else {
              html += `${p.marker} ${p.seriesName}: ${p.data.value}<br/>`
            }
          })
          return html
        }
      },
      legend: {
        width: '80%',
        data: props.chartData.map((d) => d.name),
        top: 10,
        type: 'scroll',
        // 主题切换时同步更新图例文字颜色
        textStyle: { color: legendTextColor.value },
        // 滚动条颜色
        pageIconColor: legendTextColor.value,
        pageTextStyle: { color: legendTextColor.value }
      },
      grid: {
        left: 60,
        right: 65,
        top: 50,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: getXAxisData(),
        axisLabel: { rotate: 45, fontSize: 11, color: axisLabelColor.value }
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel[props.yAxisKey],
        nameTextStyle: { fontSize: 12, color: axisLabelColor.value },
        axisLabel: { color: axisLabelColor.value },
        splitLine: { lineStyle: { color: splitLineColor.value } }
      },
      series: buildSeries(),
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          textStyle: { color: axisLabelColor.value },
          borderColor: splitLineColor.value,
          fillerColor: settingStore.isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(64, 158, 255, 0.2)'
        },
        // Y 轴缩放滑块（右侧独立显示）
        {
          type: 'slider',
          orient: 'vertical',
          start: 0,
          end: 100,
          right: 8,
          top: 50,
          bottom: 60,
          textStyle: { color: axisLabelColor.value },
          borderColor: splitLineColor.value,
          fillerColor: settingStore.isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(64, 158, 255, 0.2)'
        }
      ]
    }
  }

  const initChart = () => {
    if (!chartRef.value) return

    chartInstance = echarts.init(chartRef.value)
    chartInstance.setOption(buildFullOption())

    // 绑定点击事件
    chartInstance.on('click', (params: any) => {
      if (params.seriesName) {
        emit('seriesClick', params.seriesName)
      }
    })

    // 鼠标 hover 系列时，legend 区域只高亮该系列名；移开时恢复
    chartInstance.on('mouseover', (params: any) => {
      if (params.seriesName) {
        highlightOnlySeries(params.seriesName)
      }
    })
    chartInstance.on('mouseout', () => {
      showAllLegend()
    })
  }

  // hover 系列时：通过 setOption 动态重写 legend.data，只保留 hover 的那一条
  // 这样 legend 区域"只显示这条折线对应的图例"，其他图例隐藏（不影响图表上的折线）
  let hoveredLegendName: string | null = null

  const highlightOnlySeries = (seriesName: string) => {
    if (!chartInstance) return
    hoveredLegendName = seriesName
    chartInstance.setOption(
      {
        legend: {
          data: [seriesName] // 只保留 hover 的图例
        }
      },
      false,
      true
    )
  }

  const showAllLegend = () => {
    if (!chartInstance) return
    hoveredLegendName = null
    // 恢复显示所有图例（保留 type: 'scroll' 等基础配置）
    chartInstance.setOption(
      {
        legend: {
          data: props.chartData.map((d) => d.name)
        }
      },
      false,
      true
    )
  }

  // 重新加载数据后，updateChart 内部已重置 hoveredLegendName，无需在此处处理

  const getXAxisData = () => {
    if (!props.chartData || !props.chartData.length) return []
    const allPeriods = new Set<string>()
    props.chartData.forEach((dept) => {
      dept.data.forEach((d) => allPeriods.add(d.period))
    })
    return Array.from(allPeriods).sort()
  }

  const buildSeries = () => {
    if (!props.chartData) return []

    return props.chartData.map((dept, idx) => {
      const xData = getXAxisData()
      const data = xData.map((period) => {
        const monthData = dept.data.find((d) => d.period === period)
        if (monthData) {
          return {
            value: monthData[props.yAxisKey] || 0,
            isAbnormal: monthData.isAbnormal || false,
            abnormalType: monthData.abnormalType || null
          }
        }
        return { value: 0, isAbnormal: false, abnormalType: null }
      })

      const baseColor = dept.isAbnormal ? '#ff4d4f' : getSeriesColor(idx, dept.name)

      return {
        name: dept.name,
        type: 'line',
        data,
        smooth: false,
        // 数据点：默认圆形，正常点 12px，异常点 14px
        symbol: (value: any, params: any) => {
          if (params.data?.isAbnormal) {
            return params.data.abnormalType === 'spike' ? 'triangle' : 'diamond'
          }
          return 'circle'
        },
        symbolSize: (value: any, params: any) => {
          return params.data?.isAbnormal ? 14 : 12
        },
        showSymbol: true,
        lineStyle: {
          width: dept.isAbnormal ? 3 : 2,
          color: baseColor
        },
        itemStyle: {
          color: (params: any) => {
            // 异常点：尖峰用红色，趋势用紫色；正常点用系列颜色
            if (params.data?.isAbnormal) {
              return params.data.abnormalType === 'spike' ? '#ff4d4f' : '#9b59b6'
            }
            return baseColor
          },
          borderColor: (params: any) => {
            if (params.data?.isAbnormal) {
              return params.data.abnormalType === 'spike' ? '#ff4d4f' : '#9b59b6'
            }
            return baseColor
          },
          borderWidth: 4
        },
        emphasis: {
          focus: 'series',
          scale: true,
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

    // 不调 clear()，避免销毁后丢失已绑定的事件（mouseover / mouseout / click）
    // 用 notMerge 模式 setOption 完整替换 option，series 数量变化时自动处理（不会残留）
    // 这是 ECharts 5+ 处理"动态 series 数量"的标准做法
    chartInstance.setOption(buildFullOption(), true)
    // 重建后重置 hover 状态（避免 hover 名引用了已删除的系列）
    hoveredLegendName = null
  }

  const scheduleUpdate = () => {
    // 推迟到下一个宏任务，脱离 Vue 同步渲染周期，避免 ECharts "should not be called during main process" 警告
    setTimeout(updateChart, 0)
  }

  watch(
    () => props.chartData,
    () => {
      scheduleUpdate()
    },
    { deep: true }
  )

  watch(
    () => props.yAxisKey,
    () => {
      scheduleUpdate()
    }
  )

  // 主题切换时重新渲染（更新 legend / axis / tooltip 颜色）
  watch(
    () => settingStore.isDark,
    () => {
      scheduleUpdate()
    }
  )

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

  // 暴露 chartInstance 给父组件，用于清空图表
  defineExpose({ chartInstance })
</script>

<style scoped>
  .workload-line-chart {
    width: 100%;
  }
</style>
