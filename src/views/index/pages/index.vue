<!-- 布局容器 -->
<template>
  <div class="app-layout">
    <aside id="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div id="app-header">
        <ArtHeaderBar />
      </div>
      <div id="app-content">
        <ArtPageContent />
      </div>
    </main>

    <div id="app-global">
      <ArtGlobalComponent />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'AppLayout' })
</script>

<style lang="scss" scoped>
  @use '../style';
</style>

<!--
  非 scoped 样式：用于覆盖侧边栏组件自身的滚动行为。
  不能修改 components/ 下的 art-sidebar-menu，所以在最外层布局页做兜底覆盖。

  背景：ElScrollbar 内部又包了一个 .el-menu，自身带 overflow-y: auto + height: calc(100vh - 60px)，
  形成两层滚动容器，滚轮事件被吞掉导致菜单过长时无法滚动。
  这里把内层 .el-menu 的滚动上下文去掉，让 ElScrollbar 统一管理滚动。
-->
<style lang="scss">
  .app-layout .menu-left .el-menu {
    box-sizing: border-box;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  // 移动端断点下原样式也设置了 .layout-sidebar .el-menu { height: calc(100vh - 60px) }，
  // 特异性 (0,3,0) > (0,2,0)，此处选择器胜出，无需 !important。
  @media only screen and (width <= 800px) {
    .app-layout .menu-left .el-menu {
      height: auto;
    }
  }
</style>
