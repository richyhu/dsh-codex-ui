# 发布流程

发布渠道两条：GitHub 仓库（源码 / issue / 别人 clone 安装）和 npm（别人一行命令安装）。
两条都指向 `github.com/richyhu/dsh-codex-ui` 与 npm 包名 `dsh-codex-ui`。

## 一次性准备

```bash
gh auth login
npm login
```

要让 GitHub Actions 自动发包，还需要在仓库里加一个 secret：

```
Settings → Secrets and variables → Actions → New repository secret
  Name:  NPM_TOKEN
  Value: <npmjs.com → Access Tokens → Generate New Token → Automation>
```

不加这个 secret 也不影响手动发布，只是 workflow 会失败。

## 首次发布

```bash
cd ~/Desktop/Deepseek_Harness/dsh-codex-ui

# 1. 把本地目录推上 GitHub（自动建仓库）
gh repo create dsh-codex-ui --public --source=. --push

# 2. 打 tag 并推送 —— tag 会触发 release workflow
git tag v0.1.0
git push origin v0.1.0
```

如果没配 `NPM_TOKEN`，第 2 步之后手动发：

```bash
npm publish --access public
```

## 后续版本

```bash
# 1. 改版本号（三处保持一致：package.json / git tag / CHANGELOG 若有）
npm version patch        # 或 minor / major；会自动 commit + 打 tag

# 2. 推代码和 tag
git push --follow-tags

# 3. 确认 npm 上真的更新了
npm view dsh-codex-ui version
```

**不要**只推代码不打 tag —— npm 上的版本不会动，而用户装到的还是旧的。

## 发布前检查

- [ ] `node --check lib/index.js && node --check lib/client.js`
- [ ] `npm pack --dry-run` —— 确认只有 8 个文件，没有 `.backup/`
- [ ] `git ls-files | xargs grep -nE "/Users/|@[a-z]+\.[a-z]{2,}|1[3-9][0-9]{9}"` 无命中
      （本机路径、邮箱、手机号都不该进仓库）
- [ ] 在真实的 DSH 上装一遍：`plugin_manager install_bundle target="<绝对路径>"`
- [ ] 在 README 顶部确认"已测试版本"与当前 DSH 版本一致

## 兼容性

每次 DSH 升版本都要复验一遍，然后把结论写进 README 的 Status 一栏：

| DSH 版本 | 状态 |
| --- | --- |
| 0.2.0-rc.2 | 已验证 |

如果一个版本出现侧边栏错乱，先查这些锚点是否还在（都在 `lib/client.js` 的 `ANCHORS` 表里）：

- `[class*="_brandMark"]` / `[class*="_railMark"]`
- `[class*="_toggle"]`
- `[class*="_logoRow"]` / `[class*="_brandName"]`
- `[class*="_settingsArea"]`（底部账号区）
- `[class*="_sectionHeader"]` / `[class*="_headerActions"]` / `[class*="_searchSlot"]`
- `[class*="_titleRow"]` / `[class*="_tabs"]`
- `[class*="_fade"]`
