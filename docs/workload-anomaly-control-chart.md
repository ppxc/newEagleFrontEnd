# 工作量钻取图表异常检测：时间序列控制图方案

> 日期：2026-06-15
> 目标：将工作量钻取图的异常标记从简单阈值升级为时间序列控制图模型

---

## Context

当前工作量钻取图（`WorkloadLineChart`）的异常标记逻辑位于后端 `WorkloadServiceImpl.aggregateRyData`：

```java
// 当前逻辑：员工月均 < 组均值 - 1.5σ → 异常
md.setIsAbnormal(empStd > 0 ? (empAvg < empAvg - 1.5 * empStd) : false);
```

问题：
- 仅用 `1.5σ` 阈值粗糙，不够稳健
- 未利用时序信息（同一员工历史数据的演变趋势）
- 无法区分"突发尖峰"和"趋势漂移"两种不同类型异常

---

## 数据特征

员工月度工作量数据：
```
员工A: [1月:5, 2月:7, 3月:8, 4月:4, 5月:6, 6月:3, ...]  时序长度 ~6个月
员工B: [1月:20, 2月:22, 3月:21, 4月:100, 5月:23, 6月:19]  异常尖峰
员工C: [1月:5, 2月:6, 3月:5, 4月:4, 5月:3, 6月:2, ...]  趋势漂移（持续下滑）
```

每个员工有 1~6 条月度数据点（时间粒度 = month），整体构成短时序。

---

## 方案选择

| 方法 | 原理 | 适用性 |
|---|---|---|
| **Shewhart μ±3σ** | 逐点判断是否超出控制限 | ⚠️ 对短时序有效，但无法检测缓慢漂移 |
| **EWMA 控制图** | 加权平均近期数据，超限则异常 | ✅ 最适合短时序，对趋势漂移敏感 |
| **CUSUM** | 累积偏离均值，检测微小持续漂移 | ⚠️ 需要预设漂移参数，参数敏感 |
| **移动极差图 (I-MR)** | 极差监控，检测离群点 | ⚠️ 适合单值小样本，但不够精确 |

**推荐：EWMA 控制图**，原因：
1. 对短时序（6个月）效果最好
2. 参数少（只需设定 λ 平滑系数）
3. 对趋势漂移和突发尖峰均敏感
4. 与现有 `isAbnormal` 字段兼容，改动最小

---

## EWMA 控制图原理

### 公式

```
EWMA_t = λ · y_t + (1 - λ) · EWMA_{t-1}     [0 < λ ≤ 1]

控制限：
  UCL = μ + k · σ · √(λ / (2 - λ))
  LCL = μ - k · σ · √(λ / (2 - λ))

当 |EWMA_t - μ| > 控制限 → 异常
```

### 参数建议

| 参数 | 值 | 说明 |
|---|---|---|
| λ（平滑系数）| 0.2~0.3 | 越小对历史越敏感，推荐 0.2 |
| k（控制限乘数）| 2.5~3.0 | 对应约 95%~99% 置信区间，推荐 3.0 |
| 初始值 EWMA₀ | 历史均值 μ | 保证启动稳定 |

### 异常分类

- **EWMA 超限**：当前点 EWMA 值超出控制限 → 点状尖峰异常
- **趋势异常**：连续 3 个 EWMA 持续上升/下降 → 趋势漂移
- **双保险（推荐）**：同时用 Shewhart μ±3σ 捕获突发尖峰

---

## 实现方案

### 1. 后端修改

**文件**：`newEagleBackEnd/src/main/java/com/example/demo/service/impl/WorkloadServiceImpl.java`

修改 `aggregateRyData` 方法：

```java
/**
 * 基于 EWMA 控制图的员工月度工作量异常检测
 *
 * 适用条件：同一员工有多个月度数据点（时序长度 >= 3）
 * 参数：λ=0.2（平滑系数），k=3.0（控制限乘数）
 *
 * @param data 单个员工的月度数据列表（已按时间排序）
 * @return 月度数据列表，isAbnormal 标记更新
 */
private List<WorkloadEmpData.MonthData> aggregateRyDataWithEwma(
        List<CurGzlTableRy> data, String granularity) {

    // 1. 计算历史均值 μ 和标准差 σ
    double[] values = data.stream()
            .mapToInt(CurGzlTableRy::getZl).toArray();
    double mu = Arrays.stream(values).average().orElse(0);
    double sigma = calculateStd(values, mu);

    // 2. 初始化 EWMA
    double ewma = mu;
    double lambda = 0.2;  // 平滑系数
    double k = 3.0;       // 控制限乘数
    double controlLimit = k * sigma * Math.sqrt(lambda / (2 - lambda));

    List<WorkloadEmpData.MonthData> result = new ArrayList<>();
    for (int i = 0; i < data.size(); i++) {
        CurGzlTableRy item = data.get(i);

        // 3. 计算当前 EWMA
        ewma = lambda * item.getZl() + (1 - lambda) * ewma;

        // 4. 判断异常：EWMA 超出控制限 OR 突发尖峰（Shewhart）
        boolean ewmaAbnormal = Math.abs(ewma - mu) > controlLimit;
        boolean shewhartAbnormal = sigma > 0
                && Math.abs(item.getZl() - mu) > 3 * sigma;
        // 两者之一异常即标记
        boolean isAbnormal = ewmaAbnormal || shewhartAbnormal;

        WorkloadEmpData.MonthData md = new WorkloadEmpData.MonthData();
        md.setPeriod(getPeriodKey(item.getTjDate(), granularity));
        md.setZl(item.getZl());
        md.setIsAbnormal(isAbnormal);
        result.add(md);
    }
    return result;
}

/**
 * 员工总体异常判定（钻取卡片用）
 * 沿用现有逻辑：员工平均工作量 < 组均值 - 1.5σ
 */
private boolean isEmployeeAbnormal(List<CurGzlTableRy> empData) {
    double empAvg = empData.stream().mapToInt(CurGzlTableRy::getZl).average().orElse(0);
    double groupAvg = ...; // 组均值
    double groupStd = calculateStd(groupValues, groupAvg);
    return groupStd > 0 && empAvg < groupAvg - 1.5 * groupStd;
}
```

### 2. 前端展示增强（可选）

在 `WorkloadLineChart` 中支持两种异常样式区分：
- **尖峰异常**（Shewhart 触发）：红色圆点
- **趋势异常**（EWMA 触发）：橙色三角

需要后端在 `MonthData` 中增加 `abnormalType` 字段（`spike` / `trend`）。

---

## 验证数据示例

```
员工"张三":
  月份   实际值  EWMA      控制限    |EWMA-μ|>限?  Shewhart    最终
  1月    5      5.00      4.20      否          否          正常
  2月    7      5.40      4.20      是          否          异常⚠️
  3月    8      5.92      4.20      是          是          异常⚠️
  4月    4      5.54      4.20      是          否          异常⚠️
  5月    6      5.63      4.20      是          否          异常⚠️
  6月    3      5.10      4.20      是          否          异常⚠️

说明：λ=0.2, μ=5.5, σ=1.7, controlLimit=3*1.7*√(0.2/1.8)≈4.2
```

---

## 关键文件

- `WorkloadServiceImpl.java` — 修改 `aggregateRyData`，新增 EWMA 计算
- `WorkloadLineChart.vue`（可选）— 区分尖峰/趋势异常样式
- `WorkloadDrillChart.vue` — 无需改动

---

## 风险与限制

1. **时序长度不足**：若某员工只有 1~2 个月数据，EWMA 不适用，自动降级为 Shewhart
2. **季节性**：工作量有淡旺季，淡季均值被拉低可能导致旺季数据被误判为异常 → 建议按季度计算 μ/σ 分组基准
3. **参数敏感性**：λ 和 k 的选择影响检测灵敏度，建议先用默认值，上线后根据实际误报率调整
