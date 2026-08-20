import { AppRouteRecord } from '@/types/router'
import { homeRoutes } from './home'
import { dashboardRoutes } from './dashboard'
import { managementRoutes } from './management'
import { efficiencyRoutes } from './efficiency'
import { complaintRoutes } from './complaint'
import { resourceRoutes } from './resource'
import { profileRoutes } from './profile'
// import { testRoutes } from './test'
/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [
  homeRoutes,
  dashboardRoutes,
  managementRoutes,
  ...efficiencyRoutes,
  // costRoutes,
  complaintRoutes,
  resourceRoutes,
  profileRoutes
  // listRoutes,
  // testRoutes
]
