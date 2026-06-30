<!-- 系统动态列表（滚动） -->
<template>
  <div class="art-card h-128 p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>系统动态</h4>
        <p>新增<span class="text-success">+6</span></p>
      </div>
    </div>

    <div class="h-9/10 mt-2 overflow-hidden">
      <ElScrollbar>
        <div
          class="h-17.5 leading-17.5 border-b border-g-300 text-sm overflow-hidden last:border-b-0"
          v-for="(item, index) in items"
          :key="index"
        >
          <span class="text-g-800 font-medium">{{ item.username }}</span>
          <span class="mx-2 text-g-600">{{ item.type }}</span>
          <span class="text-theme">{{ item.target }}</span>
          <span v-if="item.time" class="ml-2 text-g-500 text-xs">{{ item.time }}</span>
        </div>
      </ElScrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { ActivityVO } from '../api'

  const items = ref<ActivityVO[]>([])

  onMounted(async () => {
    items.value = await Home.getActivities()
  })
</script>
