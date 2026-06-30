/**
 * 首页 / 工作台 mock 占位数据
 * 后端未启或接口报错时回落使用，方便后续联调时切换为真实数据
 */
import type {
  StatsCardVO,
  WorkloadDeptVO,
  ActivityVO,
  TodoVO,
  UserRowVO
} from './types'

export const mockStatsCards: StatsCardVO[] = [
  {
    title: '今日任务',
    count: 186,
    description: '较昨日 +12%',
    icon: 'ri:task-line',
    change: '+12%'
  },
  {
    title: '今日查勘量',
    count: 320,
    description: '较昨日 +8%',
    icon: 'ri:search-line',
    change: '+8%'
  },
  {
    title: '本月案件数',
    count: 4280,
    description: '较上月 -3%',
    icon: 'ri:file-list-3-line',
    change: '-3%'
  },
  {
    title: '当前预警',
    count: 7,
    description: '需关注',
    icon: 'ri:alert-line',
    change: '+2'
  }
]

export const mockWorkload: WorkloadDeptVO[] = [
  {
    comCode: '001',
    comName: '成都中支',
    data: [
      { period: '2025-09', zl: 320, ja: 280 },
      { period: '2025-10', zl: 410, ja: 360 },
      { period: '2025-11', zl: 380, ja: 340 },
      { period: '2025-12', zl: 460, ja: 410 },
      { period: '2026-01', zl: 520, ja: 470 },
      { period: '2026-02', zl: 480, ja: 430 },
      { period: '2026-03', zl: 560, ja: 510 },
      { period: '2026-04', zl: 540, ja: 490 },
      { period: '2026-05', zl: 600, ja: 550 }
    ]
  },
  {
    comCode: '002',
    comName: '绵阳中支',
    data: [
      { period: '2025-09', zl: 180, ja: 160 },
      { period: '2025-10', zl: 220, ja: 200 },
      { period: '2025-11', zl: 210, ja: 190 },
      { period: '2025-12', zl: 250, ja: 230 },
      { period: '2026-01', zl: 280, ja: 260 },
      { period: '2026-02', zl: 260, ja: 240 },
      { period: '2026-03', zl: 300, ja: 280 },
      { period: '2026-04', zl: 290, ja: 270 },
      { period: '2026-05', zl: 320, ja: 300 }
    ]
  }
]

export const mockActivities: ActivityVO[] = [
  { username: '张伟', type: '提交了查勘', target: '川A-12345 案件', time: '10 分钟前' },
  { username: '李娜', type: '审核通过了', target: '定损单 DS202605300001', time: '32 分钟前' },
  { username: '王强', type: '创建了任务', target: '人伤跟踪-王某', time: '1 小时前' },
  { username: '陈静', type: '更新了状态', target: '案件 CP202605280033', time: '2 小时前' },
  { username: '赵磊', type: '上传了照片', target: '查勘任务共 12 张', time: '3 小时前' },
  { username: '孙颖', type: '完成了回访', target: '客户 张先生', time: '昨天 17:30' },
  { username: '周明', type: '驳回了', target: '定损单 DS202605290015', time: '昨天 14:12' },
  { username: '吴芳', type: '分配了任务', target: '川B-99876 案件', time: '昨天 09:45' }
]

export const mockTodos: TodoVO[] = [
  { id: '1', title: '查看今天工作内容', time: '上午 09:30', done: true },
  { id: '2', title: '回复邮件', time: '上午 10:30', done: true },
  { id: '3', title: '工作汇报整理', time: '上午 11:00', done: true },
  { id: '4', title: '产品需求会议', time: '下午 02:00', done: false },
  { id: '5', title: '整理会议内容', time: '下午 03:30', done: false },
  { id: '6', title: '明天工作计划', time: '下午 06:30', done: false }
]

export const mockUserRows: UserRowVO[] = [
  {
    username: '张伟',
    org: '成都中支',
    pro: 92,
    color: 'var(--art-primary)',
    avatar: ''
  },
  {
    username: '李娜',
    org: '成都中支',
    pro: 85,
    color: 'var(--art-secondary)',
    avatar: ''
  },
  {
    username: '王强',
    org: '绵阳中支',
    pro: 78,
    color: 'var(--art-warning)',
    avatar: ''
  },
  {
    username: '陈静',
    org: '南充中支',
    pro: 73,
    color: 'var(--art-info)',
    avatar: ''
  },
  {
    username: '赵磊',
    org: '德阳中支',
    pro: 68,
    color: 'var(--art-error)',
    avatar: ''
  },
  {
    username: '孙颖',
    org: '宜宾中支',
    pro: 60,
    color: 'var(--art-success)',
    avatar: ''
  }
]
