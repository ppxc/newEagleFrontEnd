<template>
  <div class="baodannian-pfl-placeholder-page">
    <ElEmpty :description="$t('menus.costControl.policyYear.placeholder.title') + ' - 敬请期待'" />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.baodannian-pfl-placeholder-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
