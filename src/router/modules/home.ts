import { AppRouteRecord } from '@/types/router'

export const homeRoutes: AppRouteRecord = {
  path: '/home',
  name: 'Home',
  component: '/index/pages/index',
  meta: {
    title: 'menus.home.title',
    icon: 'ri:home-smile-2-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'console',
      name: 'HomeConsole',
      component: '/home/pages/index',
      meta: {
        title: 'menus.home.console',
        keepAlive: false,
        isFullContent: false
      }
    }
  ]
}
