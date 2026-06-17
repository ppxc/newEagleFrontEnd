import { AppRouteRecord } from '@/types/router'

export const efficiencyRoutes: AppRouteRecord = {
  name: 'Efficiency',
  path: '/efficiency',
  component: '/index/pages/index',
  meta: {
    title: 'menus.efficiency.title',
    icon: 'ri:time-line',
    roles: ['R_SUPER', 'R_ADMIN', 'R_USER']
  },
  children: [
    // ==================== 运营效率 ====================
    {
      path: 'operations',
      name: 'Operations',
      meta: {
        title: 'menus.efficiency.operations.title',
        keepAlive: false
      },
      children: [
        // ==================== 理赔周期 ====================
        {
          path: 'claim_cycle',
          name: 'ClaimCycle',
          meta: {
            title: 'menus.efficiency.operations.claimCycle.title',
            keepAlive: false
          },
          children: [
            {
              path: 'zhouqi_qs',
              name: 'ZhouqiQs',
              component: '/efficiency/operations/pages/zhouqi_qs',
              meta: {
                title: '周期-市公司',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'zhouqi_bm',
              name: 'ZhouqiBm',
              component: '/efficiency/operations/pages/zhouqi_bm',
              meta: {
                title: '周期-部门',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            }
          ]
        },
        // ==================== 结案率 ====================
        {
          path: 'close_rate',
          name: 'CloseRate',
          meta: {
            title: 'menus.efficiency.operations.closeRate.title',
            keepAlive: false
          },
          children: [
            {
              path: 'pacll_bm',
              name: 'PacllBm',
              component: '/efficiency/operations/pages/pacll_bm',
              meta: {
                title: '车险结案率(部门)',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'pacll_xz',
              name: 'PacllXz',
              component: '/efficiency/operations/pages/pacll_xz',
              meta: {
                title: '车险结案率(小组)',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'pacll_ry',
              name: 'PacllRy',
              component: '/efficiency/operations/pages/pacll_ry',
              meta: {
                title: '车险结案率(人员)',
                keepAlive: false,
                roles: ['R_USER', 'R_ADMIN', 'R_SUPER']
              }
            }
          ]
        },
        // ==================== 日常通报 ====================
        {
          path: 'daily',
          name: 'DailyReport',
          meta: {
            title: 'menus.efficiency.operations.daily.title',
            keepAlive: false
          },
          children: [
            {
              path: 'gzl_bm',
              name: 'CurGzlBm',
              component: '/efficiency/operations/pages/gzl_bm',
              meta: {
                title: '部门当日工作量',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'gzl_group',
              name: 'CurGzlGroup',
              component: '/efficiency/operations/pages/gzl_group',
              meta: {
                title: '小组当日工作量',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'gzl_ry',
              name: 'CurGzlRy',
              component: '/efficiency/operations/pages/gzl_ry',
              meta: {
                title: '人员当日工作量',
                keepAlive: false,
                roles: ['R_USER', 'R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'gzl_rs',
              name: 'CurGzlRs',
              component: '/efficiency/operations/pages/gzl_rs',
              meta: {
                title: '人伤当日工作量',
                keepAlive: false,
                roles: ['R_USER', 'R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'workload_drill',
              name: 'WorkloadDrill',
              component: '/efficiency/operations/pages/workload/WorkloadDrillChart',
              meta: {
                title: '工作量钻取图',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            }
          ]
        }
      ]
    },
    // ==================== 成本管控 ====================
    {
      path: 'cost_control',
      name: 'CostControl',
      meta: {
        title: 'menus.efficiency.costControl.title',
        keepAlive: false
      },
      children: [
        // ==================== 综合赔付率 ====================
        {
          path: 'zhpfl',
          name: 'Zhpfl',
          meta: {
            title: 'menus.efficiency.costControl.zhpfl.title',
            keepAlive: false
          },
          children: [
            {
              path: 'zhpfl_khq',
              name: 'ZhpflKhq',
              component: '/efficiency/costcontrol/pages/zhpfl_khq',
              meta: {
                title: '综合赔付率-客户群',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            }
          ]
        },
        // ==================== 事故年赔付率 ====================
        {
          path: 'pflsgn',
          name: 'Pflsgn',
          meta: {
            title: 'menus.efficiency.costControl.pflsgn.title',
            keepAlive: false
          },
          children: [
            {
              path: 'pflsgn_zgs',
              name: 'PflsgnZgs',
              component: '/efficiency/costcontrol/pages/pflsgn_zgs',
              meta: {
                title: '事故年-支公司',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'pflsgn_khq',
              name: 'PflsgnKhq',
              component: '/efficiency/costcontrol/pages/pflsgn_khq',
              meta: {
                title: '事故年-客户群',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'pflsgn_xny',
              name: 'PflsgnXny',
              component: '/efficiency/costcontrol/pages/pflsgn_xny',
              meta: {
                title: '事故年-新能源',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            }
          ]
        },
        // ==================== 案均赔款 ====================
        {
          path: 'anjun',
          name: 'Anjun',
          meta: {
            title: 'menus.efficiency.costControl.anjun.title',
            keepAlive: false
          },
          children: [
            {
              path: 'anjun_cx_zgs',
              name: 'AnjunCxZgs',
              component: '/efficiency/costcontrol/pages/anjun_cx_zgs',
              meta: {
                title: '案均赔款-支公司（车险）',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'anjun_cx_khq',
              name: 'AnjunCxKhq',
              component: '/efficiency/costcontrol/pages/anjun_cx_khq',
              meta: {
                title: '案均赔款-客户群（车险）',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            },
            {
              path: 'anjun-cx-xny',
              name: 'AnjunCxXny',
              component: '/efficiency/costcontrol/pages/anjun_cx_xny',
              meta: {
                title: '案均赔款-新能源（车险）',
                keepAlive: false,
                roles: ['R_ADMIN', 'R_SUPER']
              }
            }
          ]
        }
      ]
    }
  ]
}
