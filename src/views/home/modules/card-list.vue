<!-- 顶部 4 个统计卡 -->
<template>
  <ElRow :gutter="20">
    <ElCol v-for="item in cards" :key="item.title" :sm="12" :md="6" :lg="6">
      <ArtStatsCard
        class="mb-5"
        :title="item.title"
        :count="item.count"
        :description="item.description"
        :icon="item.icon"
      />
    </ElCol>
  </ElRow>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { StatsCardVO } from '../api'

  const cards = ref<StatsCardVO[]>([])

  onMounted(async () => {
    cards.value = await Home.getCardStats()
  })
</script>
