<!-- 待办事项列表（带 checkbox） -->
<template>
  <div class="art-card h-128 p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>待办事项</h4>
        <p>待处理<span class="text-danger">{{ pendingCount }}</span></p>
      </div>
    </div>

    <div class="h-[calc(100%-40px)] overflow-auto">
      <ElScrollbar>
        <div
          class="flex-cb h-17.5 border-b border-g-300 text-sm last:border-b-0"
          v-for="item in items"
          :key="item.id"
        >
          <div>
            <p class="text-sm" :class="{ 'line-through text-g-500': item.done }">
              {{ item.title }}
            </p>
            <p class="text-g-500 mt-1 text-xs">{{ item.time }}</p>
          </div>
          <ElCheckbox v-model="item.done" />
        </div>
      </ElScrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { TodoVO } from '../api'

  const items = ref<TodoVO[]>([])

  onMounted(async () => {
    items.value = await Home.getTodoList()
  })

  const pendingCount = computed(() => items.value.filter((i) => !i.done).length)
</script>
