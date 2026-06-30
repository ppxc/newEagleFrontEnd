<!-- 关于系统：项目介绍 + 链接 -->
<template>
  <div class="art-card p-5 flex-b mb-5 max-sm:mb-4">
    <div>
      <h2 class="text-2xl font-medium">关于系统</h2>
      <p class="text-g-700 mt-1">
        {{ systemName }} 是一款基于 Vue3 + TypeScript + Element Plus 的鹰眼作业后台
      </p>
      <p class="text-g-700 mt-1">集成了热力图、查勘管理、案件监控、汛期驾驶舱等核心模块</p>

      <div class="flex flex-wrap gap-3.5 max-w-150 mt-9">
        <div
          class="w-60 flex-cb h-12.5 px-3.5 border border-g-300 c-p rounded-lg text-sm bg-g-100 duration-300 hover:-translate-y-1 max-sm:w-full"
          v-for="link in linkList"
          :key="link.label"
          @click="goPage(link.url)"
        >
          <span class="text-g-700">{{ link.label }}</span>
          <ArtSvgIcon icon="ri:arrow-right-s-line" class="text-lg text-g-600" />
        </div>
      </div>
    </div>
    <img class="w-75 max-md:!hidden" :src="drawUrl" alt="draw" />
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { WEB_LINKS } from '@/utils/constants/links'
  import iconImg from '@/assets/images/draw/draw1.png'

  const systemName = AppConfig.systemInfo.name || '鹰眼作业平台'
  const drawUrl = iconImg

  const linkList = [
    { label: '使用文档', url: WEB_LINKS.DOCS },
    { label: '项目介绍', url: WEB_LINKS.INTRODUCE },
    { label: '项目仓库', url: WEB_LINKS.GITHUB_HOME },
    { label: '技术社区', url: WEB_LINKS.BILIBILI }
  ]

  function goPage(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
</script>
