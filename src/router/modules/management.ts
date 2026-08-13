import { AppRouteRecord } from '@/types/router'

export const managementRoutes: AppRouteRecord = {
  name: 'Management',
  path: '/management',
  component: '/index/pages/index',
  meta: {
    title: 'menus.management.title',
    icon: 'ri:dashboard-line',
    roles: ['R_SUPER', 'R_ADMIN']
  },
  children: [
    {
      path: 'car_cockpit',
      name: 'CarCockpit',
      component: '/management/pages/car_cockpit',
      meta: {
        title: 'menus.management.carCockpit',
        keepAlive: false,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'non_car_cockpit',
      name: 'NonCarCockpit',
      component: '/management/pages/non_car_cockpit',
      meta: {
        title: 'menus.management.nonCarCockpit',
        keepAlive: false,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'flood_season',
      name: 'FloodSeasonCockpit',
      component: '/management/pages/flood_season',
      meta: {
        title: 'menus.management.floodSeason',
        keepAlive: false,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'repair_management',
      name: 'RepairManagement',
      component: '/management/pages/repair_management',
      meta: {
        title: 'menus.management.repairManagement',
        keepAlive: false,
        roles: ['R_SUPER', 'R_ADMIN']
      }
    }
  ]
}
