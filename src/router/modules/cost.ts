import { AppRouteRecord } from '@/types/router'

export const costRoutes: AppRouteRecord = {
  name: 'Cost',
  path: '/cost',
  component: '/index/pages/index',
  meta: {
    title: 'menus.cost.title',
    icon: 'ri:money-cny-box-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'index',
      name: 'CostIndex',
      component: '/test/pages/test_index',
      meta: {
        title: 'menus.cost.title',
        keepAlive: false
      }
    }
  ]
}