import { AppRouteRecord } from '@/types/router'

/**
 * 原"数据通报"一级菜单已拆分为 3 个独立一级菜单：
 *   - /operations   运营效率
 *   - /cost_control 成本管控
 *   - /laoxiao      劳效监控
 *
 * 路由模块以数组形式导出，由 index.ts 直接展开。
 */
export const efficiencyRoutes: AppRouteRecord[] = [
  // ==================== 运营效率 ====================
  {
    name: 'Operations',
    path: '/operations',
    component: '/index/pages/index',
    meta: {
      title: 'menus.operations.title',
      icon: 'ri:line-chart-line',
      roles: ['R_SUPER', 'R_ADMIN', 'R_USER']
    },
    children: [
      // ==================== 按量赔款 ====================
      {
        path: 'anliang_peikuan',
        name: 'AnliangPeikuan',
        meta: {
          title: 'menus.operations.byQuantity.title',
          keepAlive: false
        },
        children: [
          {
            path: 'placeholder',
            name: 'AnliangPeikuanPlaceholder',
            component: '/efficiency/operations/pages/anliang_peikuan_placeholder',
            meta: {
              title: 'menus.operations.byQuantity.placeholder.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      },
      // ==================== 理赔周期 ====================
      {
        path: 'claim_cycle',
        name: 'ClaimCycle',
        meta: {
          title: 'menus.operations.claimCycle.title',
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
          title: 'menus.operations.closeRate.title',
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
          title: 'menus.operations.daily.title',
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
        ]
      }
    ]
  },
  // ==================== 成本管控 ====================
  {
    name: 'CostControl',
    path: '/cost_control',
    component: '/index/pages/index',
    meta: {
      title: 'menus.costControl.title',
      icon: 'ri:money-cny-box-line',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
      // ==================== 综合赔付率 ====================
      {
        path: 'zhpfl',
        name: 'Zhpfl',
        meta: {
          title: 'menus.costControl.zhpfl.title',
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
          title: 'menus.costControl.pflsgn.title',
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
          title: 'menus.costControl.anjun.title',
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
      },
      // ==================== 保单年赔付率 ====================
      {
        path: 'baodannian_pfl',
        name: 'BaodannianPfl',
        meta: {
          title: 'menus.costControl.policyYear.title',
          keepAlive: false
        },
        children: [
          {
            path: 'placeholder',
            name: 'BaodannianPflPlaceholder',
            component: '/efficiency/costcontrol/pages/baodannian_pfl_placeholder',
            meta: {
              title: 'menus.costControl.policyYear.placeholder.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      },
      // ==================== 车均定损 ====================
      {
        path: 'chejun_dingsun',
        name: 'ChejunDingsun',
        meta: {
          title: 'menus.costControl.carAvgLoss.title',
          keepAlive: false
        },
        children: [
          {
            path: 'placeholder',
            name: 'ChejunDingsunPlaceholder',
            component: '/efficiency/costcontrol/pages/chejun_dingsun_placeholder',
            meta: {
              title: 'menus.costControl.carAvgLoss.placeholder.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      },
      // ==================== 维修单位 ====================
      {
        path: 'weixiu_danwei',
        name: 'WeixiuDanwei',
        meta: {
          title: 'menus.costControl.repairShop.title',
          keepAlive: false
        },
        children: [
          {
            path: 'placeholder',
            name: 'WeixiuDanweiPlaceholder',
            component: '/efficiency/costcontrol/pages/weixiu_danwei_placeholder',
            meta: {
              title: 'menus.costControl.repairShop.placeholder.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      }
    ]
  },
  // ==================== 劳效监控 ====================
  {
    name: 'Laoxiao',
    path: '/laoxiao',
    component: '/index/pages/index',
    meta: {
      title: 'menus.laoxiao.title',
      icon: 'ri:bar-chart-2-line',
      roles: ['R_SUPER', 'R_ADMIN', 'R_USER']
    },
    children: [
      // ==================== 年度-每月 ====================
      {
        path: 'year_month',
        name: 'YearMonth',
        meta: {
          title: 'menus.laoxiao.yearMonth.title',
          keepAlive: false
        },
        children: [
          {
            path: 'chakan_year',
            name: 'ChakanYear',
            component: '/efficiency/laoxiao/pages/chakan_year',
            meta: {
              title: 'menus.laoxiao.chakanYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'dingsun_tjl_year',
            name: 'DingsunTjlYear',
            component: '/efficiency/laoxiao/pages/dingsun_tjl_year',
            meta: {
              title: 'menus.laoxiao.dingsunTjlYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'dingsun_wcl_year',
            name: 'DingsunWclYear',
            component: '/efficiency/laoxiao/pages/dingsun_wcl_year',
            meta: {
              title: 'menus.laoxiao.dingsunWclYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'ck_dswc_year',
            name: 'CkDswcYear',
            component: '/efficiency/laoxiao/pages/ck_dswc_year',
            meta: {
              title: 'menus.laoxiao.ckDswcYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'dingsun_zfl_year',
            name: 'DingsunZflYear',
            component: '/efficiency/laoxiao/pages/dingsun_zfl_year',
            meta: {
              title: 'menus.laoxiao.dingsunZflYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'lisuan_year',
            name: 'LisuanYear',
            component: '/efficiency/laoxiao/pages/lisuan_year',
            meta: {
              title: 'menus.laoxiao.lisuanYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'rs_gzl_year',
            name: 'RsGzlYear',
            component: '/efficiency/laoxiao/pages/rs_gzl_year',
            meta: {
              title: 'menus.laoxiao.rsGzlYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          },
          {
            path: 'rs_tjl_year',
            name: 'RsTjlYear',
            component: '/efficiency/laoxiao/pages/rs_tjl_year',
            meta: {
              title: 'menus.laoxiao.rsTjlYear.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      },
      // ==================== 月度-每天 ====================
      {
        path: 'month_day',
        name: 'MonthDay',
        meta: {
          title: 'menus.laoxiao.monthDay.title',
          keepAlive: false
        },
        children: [
          {
            path: 'chakan_month',
            name: 'ChakanMonth',
            component: '/efficiency/laoxiao/pages/chakan_month',
            meta: {
              title: 'menus.laoxiao.chakanMonth.title',
              keepAlive: false,
              roles: ['R_ADMIN', 'R_SUPER']
            }
          }
        ]
      }
    ]
  }
]
