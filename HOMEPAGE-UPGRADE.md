# 全球片库改造

基线：LibreTV 2.21.1 / 29cbeb3。修改分支：homepage-upgrade。

## 行为
- 首页新增全球片库，保留原有推荐入口和设置。
- 电影、剧集、综艺分类；年份、出品地区、当前热度/评分/发行日期筛选。
- 2026 快捷入口保留当前类别，并重置为全部地区、当前热度。
- 每次向 TMDB 请求下一页（通常 20 条），去重，切换筛选从第一页开始。
- 评分排序至少 100 票；年份是电影发行年或剧集整部首次开播年，不是某季年份。
- 综艺近似采用 TMDB Reality / Talk 分类，并不保证完整。
- 热度是当前 TMDB popularity，不是全年累计播放量；总数是资讯匹配数。
- 缺少凭证、限流、无结果和请求失败均有提示，可切回原榜单。

## 凭证
在 Render 的服务端环境变量设置 `TMDB_READ_ACCESS_TOKEN`，值为账号中的 API Read Access Token。
不要写入源码、NEXT_PUBLIC 环境变量或 GitHub。原 PASSWORD 及其他配置保持不变。
新接口复用原登录守卫，凭证只作为服务器到固定 TMDB 主机的 Authorization 头发送，禁止重定向。

## 验证与发布顺序
1. 按 package-lock.json 执行 npm ci、npm run typecheck、npm test、npm run build。
2. 配置凭证后，验证 CN/KR/JP/US、电影/剧集/综艺、2026、第二页、空结果、错误重试及手机页面。
3. 保存 Render 当前镜像 digest、服务设置和环境变量（私密保存，不提交仓库）。latest 地址不是固定备份。
4. 将 homepage-upgrade 推送到自己的仓库。优先使用独立预览服务；通过验证后再切换现有服务的来源。
5. 若采用 Render Git 源构建，选择个人仓库 homepage-upgrade 分支及 Dockerfile；不要误选交易仓库。
6. 线上核对登录、原有推荐及资源搜索。失败时恢复之前记录的固定镜像与设置。

本地源码备份位于相邻 LibreTV-download/before-homepage-29cbeb3.zip。
备份仅包含源码，不包含 Render 的运行镜像、密码或设置。
