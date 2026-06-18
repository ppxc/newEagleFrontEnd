import request from '@/utils/http'

// ==================== 当日工作量统计 ====================
export const dailyWorkload = {
  /**部门当日工作量 */
  axiosRequestDailyWorkloadBm(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_bm/list', params })
  },
  /** 小组当日工作量 */
  axiosRequestDailyWorkloadGroup(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_group/list', params })
  },
  /** 人员当日工作量 */
  axiosRequestDailyWorkloadRy(params) {
    return request.get({ url: '/zyxt/api/cur_gzl/list', params })
  },
  /** 人伤当日工作量 */
  axiosRequestDailyWorkloadRs(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_rs/list', params })
  },
  // ==================== 分页端点 ====================
  /** 人员日工作量 - 分页 */
  axiosRequestDailyWorkloadRyPage(params) {
    return request.get({ url: '/zyxt/api/cur_gzl/page', params })
  },
  /** 部门日工作量 - 分页 */
  axiosRequestDailyWorkloadBmPage(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_bm/page', params })
  },
  /** 小组日工作量 - 分页 */
  axiosRequestDailyWorkloadGroupPage(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_group/page', params })
  },
  /** 人伤日工作量 - 分页 */
  axiosRequestDailyWorkloadRsPage(params) {
    return request.get({ url: '/zyxt/api/cur_gzl_rs/page', params })
  }
}

// ==================== 数据通报表格 ====================
export const dataReport = {
  /** 周期-市公司 */
  axiosRequestZhouqiQs(params) {
    return request.get({ url: '/zyxt/api/zhouqi_qs/list', params })
  },
  /** 周期-部门 */
  axiosRequestZhouqiBm(params) {
    return request.get({ url: '/zyxt/api/zhouqi_bm/list', params })
  },
  /** 综合赔付率-客户群 */
  axiosRequestZhpflKhq(params) {
    return request.get({ url: '/zyxt/api/zhpfl_khq/list', params })
  },
  /** 车险结案率-部门 */
  axiosRequestPacllBm(params) {
    return request.get({ url: '/zyxt/api/pacll_bm/list', params })
  },
  /** 车险结案率-小组 */
  axiosRequestPacllXz(params) {
    return request.get({ url: '/zyxt/api/pacll_xz/list', params })
  },
  /** 车险结案率-人员 */
  axiosRequestPacllRy(params) {
    return request.get({ url: '/zyxt/api/pacll_ry/list', params })
  },
  // ==================== 6 个新增分页端点 ====================
  /** 周期-市公司 - 分页 */
  axiosRequestZhouqiQsPage(params) {
    return request.get({ url: '/zyxt/api/zhouqi_qs/page', params })
  },
  /** 周期-部门 - 分页 */
  axiosRequestZhouqiBmPage(params) {
    return request.get({ url: '/zyxt/api/zhouqi_bm/page', params })
  },
  /** 综合赔付率-客户群 - 分页 */
  axiosRequestZhpflKhqPage(params) {
    return request.get({ url: '/zyxt/api/zhpfl_khq/page', params })
  },
  /** 车险结案率-部门 - 分页 */
  axiosRequestPacllBmPage(params) {
    return request.get({ url: '/zyxt/api/pacll_bm/page', params })
  },
  /** 车险结案率-小组 - 分页 */
  axiosRequestPacllXzPage(params) {
    return request.get({ url: '/zyxt/api/pacll_xz/page', params })
  },
  /** 车险结案率-人员 - 分页 */
  axiosRequestPacllRyPage(params) {
    return request.get({ url: '/zyxt/api/pacll_ry/page', params })
  },
  /** 查勘量-年度每月 */
  axiosRequestChakanYear(params) {
    return request.get({ url: '/zyxt/api/chakan_year/list', params })
  },
  /** 定损提交量-年度每月 */
  axiosRequestDingsunTjlYear(params) {
    return request.get({ url: '/zyxt/api/dingsun_tjl_year/list', params })
  },
  /** 定损完成量-年度每月 */
  axiosRequestDingsunWclYear(params) {
    return request.get({ url: '/zyxt/api/dingsun_wcl_year/list', params })
  },
  /** 查勘量+定损完成-年度每月 */
  axiosRequestCkDswcYear(params) {
    return request.get({ url: '/zyxt/api/ck_dswc_year/list', params })
  },
  /** 定损支付量-年度每月 */
  axiosRequestDingsunZflYear(params) {
    return request.get({ url: '/zyxt/api/dingsun_zfl_year/list', params })
  },
  /** 理算量-年度每月 */
  axiosRequestLisuanYear(params) {
    return request.get({ url: '/zyxt/api/lisuan_year/list', params })
  },
  /** 人伤跟踪量-年度每月 */
  axiosRequestRsGzlYear(params) {
    return request.get({ url: '/zyxt/api/rs_gzl_year/list', params })
  },
  /** 人伤调解量-年度每月 */
  axiosRequestRsTjlYear(params) {
    return request.get({ url: '/zyxt/api/rs_tjl_year/list', params })
  },
  /** 查勘量-月度每日 */
  axiosRequestChakanMonth(params) {
    return request.get({ url: '/zyxt/api/chakan_month/list', params })
  },
  // ==================== 分页端点（laoxiao 9 + chakan_month） ====================
  // 旧 /list 端点保留兼容；新 /page 端点由 useTable 直接消费 PageResult<T>。
  /** 查勘量-年度每月 - 分页 */
  axiosRequestChakanYearPage(params) {
    return request.get({ url: '/zyxt/api/chakan_year/page', params })
  },
  /** 定损提交量-年度每月 - 分页 */
  axiosRequestDingsunTjlYearPage(params) {
    return request.get({ url: '/zyxt/api/dingsun_tjl_year/page', params })
  },
  /** 定损完成量-年度每月 - 分页 */
  axiosRequestDingsunWclYearPage(params) {
    return request.get({ url: '/zyxt/api/dingsun_wcl_year/page', params })
  },
  /** 查勘量+定损完成-年度每月 - 分页 */
  axiosRequestCkDswcYearPage(params) {
    return request.get({ url: '/zyxt/api/ck_dswc_year/page', params })
  },
  /** 定损支付量-年度每月 - 分页 */
  axiosRequestDingsunZflYearPage(params) {
    return request.get({ url: '/zyxt/api/dingsun_zfl_year/page', params })
  },
  /** 理算量-年度每月 - 分页 */
  axiosRequestLisuanYearPage(params) {
    return request.get({ url: '/zyxt/api/lisuan_year/page', params })
  },
  /** 人伤跟踪量-年度每月 - 分页 */
  axiosRequestRsGzlYearPage(params) {
    return request.get({ url: '/zyxt/api/rs_gzl_year/page', params })
  },
  /** 人伤调解量-年度每月 - 分页 */
  axiosRequestRsTjlYearPage(params) {
    return request.get({ url: '/zyxt/api/rs_tjl_year/page', params })
  },
  /** 查勘量-月度每日 - 分页 */
  axiosRequestChakanMonthPage(params) {
    return request.get({ url: '/zyxt/api/chakan_month/page', params })
  }
}

// ==================== 案均赔款 ====================
export const claimAverage = {
  /** 案均赔款-支公司（车险） */
  axiosRequestAnjunCxZgs(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_zgs/list', params })
  },
  /** 案均赔款-客户群（车险） */
  axiosRequestAnjunCxKhq(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_khq/list', params })
  },
  /** 案均赔款-新能源（车险） */
  axiosRequestAnjunCxXny(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_xny/list', params })
  },
  // ==================== 分页端点 ====================
  /** 案均赔款-支公司（车险）- 分页 */
  axiosRequestAnjunCxZgsPage(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_zgs/page', params })
  },
  /** 案均赔款-客户群（车险）- 分页 */
  axiosRequestAnjunCxKhqPage(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_khq/page', params })
  },
  /** 案均赔款-新能源（车险）- 分页 */
  axiosRequestAnjunCxXnyPage(params) {
    return request.get({ url: '/zyxt/api/anjun_cx_xny/page', params })
  }
}

// ==================== 事故年赔付率 ====================
export const accidentYearLossRate = {
  /** 事故年赔付率-支公司 */
  axiosRequestPflsgnZgs(params) {
    return request.get({ url: '/zyxt/api/pflsgn_zgs/list', params })
  },
  /** 事故年赔付率-客户群 */
  axiosRequestPflsgnKhq(params) {
    return request.get({ url: '/zyxt/api/pflsgn_khq/list', params })
  },
  /** 事故年赔付率-新能源 */
  axiosRequestPflsgnXny(params) {
    return request.get({ url: '/zyxt/api/pflsgn_xny/list', params })
  },
  // ==================== 分页端点 ====================
  /** 事故年赔付率-支公司 - 分页 */
  axiosRequestPflsgnZgsPage(params) {
    return request.get({ url: '/zyxt/api/pflsgn_zgs/page', params })
  },
  /** 事故年赔付率-客户群 - 分页 */
  axiosRequestPflsgnKhqPage(params) {
    return request.get({ url: '/zyxt/api/pflsgn_khq/page', params })
  },
  /** 事故年赔付率-新能源 - 分页 */
  axiosRequestPflsgnXnyPage(params) {
    return request.get({ url: '/zyxt/api/pflsgn_xny/page', params })
  }
}

// ==================== 工作量趋势钻取 ====================
export const workloadTrend = {
  /** 部门级工作量趋势 */
  axiosRequestDepartmentWorkload(params) {
    return request.get({ url: '/zyxt/api/workload/department', params })
  },
  /** 小组级工作量趋势 */
  axiosRequestGroupWorkload(params) {
    return request.get({ url: '/zyxt/api/workload/group', params })
  },
  /** 员工级工作量趋势 */
  axiosRequestEmployeeWorkload(params) {
    return request.get({ url: '/zyxt/api/workload/employee', params })
  },
  /** 根据部门名称获取编码 */
  axiosRequestComCodeByName(params) {
    return request.get({ url: '/zyxt/api/workload/comcode', params })
  },
  /** 根据小组名称获取编码 */
  axiosRequestGroupsCodeByName(params) {
    return request.get({ url: '/zyxt/api/workload/groupscode', params })
  }
}