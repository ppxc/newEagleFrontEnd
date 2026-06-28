/**
 * 路由全局前置守卫模块
 */
import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { nextTick } from 'vue'
import NProgress from 'nprogress'
import { useSettingStore } from '@/store/modules/setting'
import { useMenuStore } from '@/store/modules/menu'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'
import { staticRoutes } from '../routes/staticRoutes'
import { loadingService } from '@/utils/ui'
import { useCommon } from '@/hooks/core/useCommon'
import { useWorktabStore } from '@/store/modules/worktab'
import { RouteRegistry, MenuProcessor, IframeRouteManager } from '../core'

let routeRegistry: RouteRegistry | null = null
const menuProcessor = new MenuProcessor()
let pendingLoading = false
let routeInitFailed = false
let routeInitInProgress = false

export function getPendingLoading(): boolean {
  return pendingLoading
}

export function resetPendingLoading(): void {
  pendingLoading = false
}

export function getRouteInitFailed(): boolean {
  return routeInitFailed
}

export function resetRouteInitState(): void {
  routeInitFailed = false
  routeInitInProgress = false
}

export function setupBeforeEachGuard(router: Router): void {
  routeRegistry = new RouteRegistry(router)

  router.beforeEach(
    async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
      try {
        await handleRouteGuard(to, from, next, router)
      } catch (error: any) {
        console.error('[RouteGuard] 路由守卫处理失败:', error)
        closeLoading()
        next({ name: 'Exception500' })
      }
    }
  )
}

function closeLoading(): void {
  if (pendingLoading) {
    nextTick(() => {
      loadingService.hideLoading()
      pendingLoading = false
    })
  }
}

async function handleRouteGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  const settingStore = useSettingStore()

  if (settingStore.showNprogress) {
    NProgress.start()
  }

  if (routeInitFailed) {
    if (to.matched.length > 0) {
      next()
    } else {
      next({ name: 'Exception500', replace: true })
    }
    return
  }

  if (!routeRegistry?.isRegistered()) {
    if (routeInitInProgress) {
      next(false)
      return
    }
    await handleDynamicRoutes(to, next, router)
    return
  }

  if (handleRootPathRedirect(to, next)) {
    return
  }

  if (to.matched.length > 0) {
    setWorktab(to)
    setPageTitle(to)
    next()
    return
  }

  next({ name: 'Exception404' })
}

function isStaticRoute(path: string): boolean {
  const checkRoute = (routes: any[], targetPath: string): boolean => {
    return routes.some((route) => {
      const routePath = route.path
      const pattern = routePath.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(targetPath)) {
        return true
      }
      if (route.children && route.children.length > 0) {
        return checkRoute(route.children, targetPath)
      }
      return false
    })
  }
  return checkRoute(staticRoutes, path)
}

async function handleDynamicRoutes(
  to: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  routeInitInProgress = true
  pendingLoading = true
  loadingService.showLoading()

  try {
    const menuList = await menuProcessor.getMenuList()

    if (!menuProcessor.validateMenuList(menuList)) {
      throw new Error('获取菜单列表失败')
    }

    routeRegistry?.register(menuList)

    const menuStore = useMenuStore()
    menuStore.setMenuList(menuList)
    menuStore.addRemoveRouteFns(routeRegistry?.getRemoveRouteFns() || [])

    IframeRouteManager.getInstance().save()
    useWorktabStore().validateWorktabs(router)

    routeInitInProgress = false

    await new Promise(resolve => setTimeout(resolve, 50))
    
    if (router.hasRoute(to.name || '')) {
      next({
        path: to.path,
        query: to.query,
        hash: to.hash,
        replace: true
      })
    } else {
      const { homePath } = useCommon()
      next({
        path: homePath.value || '/dashboard',
        replace: true
      })
    }
  } catch (error: any) {
    console.error('[RouteGuard] 动态路由注册失败:', error)
    closeLoading()

    const isNetworkError = error.message?.includes('Network Error') || 
                           error.message?.includes('ECONNREFUSED') ||
                           error.message?.includes('ERR_CONNECTION_REFUSED') ||
                           error.message?.includes('Failed to fetch')
    
    if (isNetworkError) {
      routeInitInProgress = false
      routeInitFailed = false
    } else {
      routeInitFailed = true
      routeInitInProgress = false
    }

    next({ name: 'Exception500', replace: true })
  }
}

export function resetRouterState(delay: number): void {
  setTimeout(() => {
    routeRegistry?.unregister()
    IframeRouteManager.getInstance().clear()

    const menuStore = useMenuStore()
    menuStore.removeAllDynamicRoutes()
    menuStore.setMenuList([])

    resetRouteInitState()
  }, delay)
}

function handleRootPathRedirect(to: RouteLocationNormalized, next: NavigationGuardNext): boolean {
  if (to.path !== '/') {
    return false
  }

  const { homePath } = useCommon()
  
  if (!routeRegistry?.isRegistered()) {
    return false
  }
  
  if (homePath.value && homePath.value !== '/') {
    next({ path: homePath.value, replace: true })
    return true
  }

  next({ path: '/dashboard', replace: true })
  return true
}
