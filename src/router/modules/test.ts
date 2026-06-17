import { AppRouteRecord } from '@/types/router'

export const testRoutes: AppRouteRecord = {
    path: '/test',
    name: 'test',
    component: '/index/pages/index',
    meta: {
        title: 'menus.test.title',
        icon: 'ri:test-tube-line',
        // roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
        {
            path: 'test1',
            name: 'test1',
            component: '/test/pages/test_index',
            meta: {
                title: 'menus.test.user',
                isHide: false,
                keepAlive: true,
                isHideTab: false
            }
        }
    ]
}
