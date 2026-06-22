<template>
  <div class="chejun-dingsun-placeholder-page">
    <ElEmpty :description="$t('menus.costControl.carAvgLoss.placeholder.title') + ' - 敬请期待'" />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.chejun-dingsun-placeholder-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
