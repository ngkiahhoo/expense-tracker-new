# UI Design Rules

这个文件记录 expense tracker 的 UI 设计规则。以后新增或修改 UI 时，优先遵守这里的规则，让整个项目保持同一种视觉语言。

## 1. 点击后显示细节窗口

当金额、分类、趋势行、资产行、summary card 等元素可以点击查看细节时，统一使用和现有 spending / asset detail 一样的深色 drilldown 弹窗风格。

- 背景使用半透明黑色遮罩，让弹窗成为当前焦点。
- 弹窗使用深色面板、细 zinc 边框、圆角；手机上必须限制高度并允许内部滚动。
- 内容很多时，header 保持 sticky，滚动时标题和关闭按钮不能消失。
- Header 统一包含：
  - 小号 uppercase eyebrow，例如 `EXPENSE ANALYSIS`、`TYPE DETAILS`、`CATEGORY DETAILS`
  - 清楚的标题，例如 `Expense breakdown`、`Commitment`、分类名或资产名
  - 标题下方显示当前层级的 total amount
  - 需要返回上一层时使用 back icon button；关闭使用 close icon button
- 细节层级统一做成 drilldown：
  - total amount 打开 type level
  - type 打开 category level
  - category 打开 individual records
- 细节列表使用全宽深色 card/button，保留细边框和 hover/focus 状态。
- 手机上每一行必须自然换行，不能让金额、select、edit/delete 按钮挤出面板。
- 金额必须保持自己的 currency formatting，不能因为容器太窄变成逐字竖排。
- 优先复用已有 shared components：`Card`、`Button`、`ActionIconButton`、`Select`、`Input`、`Textarea`、`overlayStyles`。
- 不要在 app UI 里放大段说明文字；界面应该直接呈现数据和可操作控件。

## 2. 卡片内容排列

所有 list record、summary item、detail row、asset row、income row、expense row 都要使用统一的信息层级：主要内容在左边，金额和操作按钮在右边。

- 卡片左侧放 identity 信息：
  - 第一行放主要名称，例如 asset name、expense note、income note、category name。
  - 第二行放辅助信息，例如 category、date、note、status。
  - 左侧内容必须允许 `min-w-0`，长文字用 `truncate` 或自然换行，不能把右侧按钮挤出卡片。
- 卡片右侧放 action 信息：
  - 金额靠右显示。
  - Edit/Delete/Select 等操作按钮放在金额旁边或金额下方。
  - 桌面宽度优先横排：`左侧内容 | 金额 | Edit | Delete`。
  - 手机宽度优先分区堆叠：第一行名称，第二行金额/状态，第三行操作按钮。
- 卡片里只要出现按钮，就必须有明确的右侧 action area。
- 同一张卡片内不要让按钮散落在不同位置。
- Edit 和 Delete 如果同时出现，永远相邻显示，顺序固定为 `Edit` 在左，`Delete` 在右。
- 有金额的卡片，金额必须比辅助文字更醒目，但不能大到挤压按钮。
- 金额和按钮不能逐字换行；如果空间不足，优先让名称/说明文字换行或截断。
- 手机上按钮可以占满一行并排显示；不要让 Delete 单独掉到下一行的最右边。
- 重复 record 卡片优先使用 8px 到 16px 圆角，深色背景，细边框，不要做成过大的 decorative card。

## 3. Edit / Delete 按钮风格

Edit 和 Delete 按钮统一使用 `ActionIconButton` 的 icon-only 风格：两个按钮并排、同尺寸、同圆角，清楚区分普通操作和危险操作。

- 两个按钮都必须是稳定的方形 icon button：`size-12`、`rounded-2xl`、居中对齐。
- Edit button：
  - 使用 white background。
  - 使用 pencil icon。
  - 不显示 `Edit` 文案，只保留 `title` / `aria-label`。
- Delete button：
  - 使用 red background。
  - 使用 trash icon。
  - 不显示 `Delete` 文案，只保留 `title` / `aria-label`。
- 两个按钮同时出现时：
  - 高度、宽度、圆角必须一致。
  - 顺序固定为 Edit 在左，Delete 在右。
  - gap 保持一致，默认使用 `gap-2`。
  - 手机上也保持相邻显示，不要让 Delete 单独掉到下一行。
- 不要在同一个项目里混用 text edit/delete、icon+text edit/delete 和 icon-only edit/delete。
- 不要把 Edit/Delete 做成普通文字链接。

## 4. Back / Exit / Close 按钮风格

弹窗、sheet、detail window 的返回和关闭按钮统一使用 `ActionIconButton` 的深色 icon-only 风格，并且和 Edit/Delete 保持同样大小和形状。

- Close / Exit button：
  - 只使用 `X` icon。
  - 不显示 `Close` 文案，只保留 `title` / `aria-label`。
- Back button：
  - 只使用 left arrow icon。
  - 不显示 `Back` 文案，只保留 `title` / `aria-label`。
- Back 和 Close 都必须是稳定的方形 icon button：`size-12`、`rounded-2xl`、居中对齐。
- 使用深色背景、细 zinc 边框、浅色 icon。
- 放在 header 右上角；Back 如果存在，放在 Close 左边。
- 这四个 action icon button：Edit、Delete、Back、Close，尺寸和圆角必须一致。
- Close button 不能被内容滚动挤走；长内容弹窗 header 应该 sticky。

## 5. 可折叠卡片

Dashboard 上的信息区块如果内容较长，例如 `Spending Breakdown`、`Category distribution`、`Income, Expense & Balance`，统一做成可折叠卡片。

- 卡片默认只显示 header，不直接展开细节。
- Header 左侧显示 eyebrow/title，右侧放一个小型箭头按钮。
- 点击箭头后才展开细节内容；再次点击收起。
- 箭头按钮使用深色背景、细 zinc 边框和圆角 icon button 外观，和 close/back icon button 的视觉语言一致。
- 展开内容和 header 之间使用稳定间距，例如 `mt-5`。
- 如果原本一个卡片里包含两个不同 section，要拆成两张独立卡片，不要用一条 border 分隔在同一张卡片里。
- 每张卡片只负责一个主题：一个标题、一个折叠状态、一组细节内容。
