<template>
  <div class="cockpit-placeholder" :style="{ minHeight: containerMinHeight }">
    <ElEmpty :description="$t('menus.management.carCockpit') + ' - 敬请期待'" />
  </div>
</template>

<script setup lang="ts">
  import { useAutoLayoutHeight } from '@/hooks/core/useLayoutHeight'

  defineOptions({ name: 'CarCockpit' })
  const { containerMinHeight } = useAutoLayoutHeight()
</script>

<style scoped>
  .cockpit-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
</style>
