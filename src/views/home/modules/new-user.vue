<!-- 查勘员排行：RadioGroup + 表格 + 进度条 -->
<template>
  <div class="art-card p-5 h-128 overflow-hidden mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>查勘员排行</h4>
      </div>
      <ElRadioGroup v-model="period">
        <ElRadioButton value="本月" label="本月" />
        <ElRadioButton value="上月" label="上月" />
        <ElRadioButton value="今年" label="今年" />
      </ElRadioGroup>
    </div>
    <ArtTable
      class="w-full"
      :data="rows"
      :border="false"
      :stripe="false"
      :header-cell-style="{ background: 'transparent' }"
    >
      <ElTableColumn label="排名" width="60" type="index" :index="indexMethod" />
      <ElTableColumn label="查勘员" prop="username" />
      <ElTableColumn label="所属机构" prop="org" />
      <ElTableColumn label="完成度" width="220">
        <template #default="scope">
          <ElProgress :percentage="scope.row.pro" :color="scope.row.color" :stroke-width="6" />
        </template>
      </ElTableColumn>
    </ArtTable>
  </div>
</template>

<script setup lang="ts">
  import { Home } from '../api'
  import type { UserRowVO } from '../api'

  const period = ref<'本月' | '上月' | '今年'>('本月')
  const rows = ref<UserRowVO[]>([])

  onMounted(async () => {
    rows.value = await Home.getUserRanking()
  })

  const indexMethod = (index: number) => index + 1
</script>

<style lang="scss" scoped>
  .art-card {
    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
      color: var(--el-color-primary) !important;
      background: transparent !important;
    }
  }
</style>
