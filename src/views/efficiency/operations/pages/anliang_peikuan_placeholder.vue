<template>
  <div class="anliang-peikuan-placeholder-page">
    <ElEmpty :description="$t('menus.operations.byQuantity.placeholder.title') + ' - 敬请期待'" />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.anliang-peikuan-placeholder-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
