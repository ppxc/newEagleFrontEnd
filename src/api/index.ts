/**
 * 统一 API 接口模块（精简版）
 *
 * 业务模块的 API 已下沉到对应模块目录：
 *   - efficiency 模块：src/views/efficiency/api/index.ts
 *   - lpmap 模块：    src/views/lpmap/api/index.ts
 *
 * 本文件仅保留跨模块共享的 API（菜单等系统管理接口）。
 */
import request from '@/utils/http'

// ==================== 系统管理 ====================

/**
 * 获取菜单列表
 * 注：后端目前没有此端点（/api/menus），保留以兼容旧逻辑。
 * 引用方：src/router/core/MenuProcessor.ts
 */
export const MenuList = () => {
  return request.get<unknown[]>({ url: '/zyxt/api/menus' })
}
