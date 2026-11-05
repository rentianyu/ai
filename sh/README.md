# Shell 脚本

服务器与本地命令行工具。`opsq`、`install` 为单文件 **POSIX sh**，除系统自带命令外无外部依赖，可直接阅读与审计、拷走即用；`adl` 主体为 python3 标准库实现（零第三方依赖），配一个 sh 安装器。

一个项目一个目录：

| 项目 | 功能 | 版本 | 目录 |
|---|---|---|---|
| **opsq** | Linux 统一运维查询入口：一个开关 + 一个值，按 端口 / PID / UID / 进程名 / 文件 / 服务 / 定时任务 查全貌，另带笔记本 / 日志检索 / 快照对比 / 自检；参数顺序不限 | 1.7.1 | [opsq/](opsq/) |
| **install** | 通用安装器：列出 / 选择 / 直装本目录下的脚本（`opsq` 由它安装与升级） | 1.1.0 | [install/](install/) |
| **adl** | 多源智能下载器：镜像改写 + 线路探测 + 无进度看门狗 + 断点续传 + 完成校验；GitHub 大文件走代理池多源并行，支持批量 / BT / HLS | 1.0.0 | [adl/](adl/) |

## 快速开始

```bash
# 交互选择
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh

# 直接装 opsq
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s opsq

# 只看清单（管道下注意 -- 分隔）
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s -- --list

# 装 adl（多源下载器，自带安装器）
curl -fsSL https://f.xbta.cc/ai/sh/adl/install.sh | sh
```

## 分发机制

- 本目录所有文件在 push 后同步到 `https://f.xbta.cc/ai/sh/`，**路径与仓库一致**（`sh/opsq/opsq.sh` → `ai/sh/opsq/opsq.sh`）
- 目录重构前的旧地址（`ai/sh/opsq.sh`、`ai/sh/install.sh`）由同步流程保留为兼容别名，指向最新内容，已安装用户的 `--update` 链路不受影响

## 约定

- 单文件、POSIX sh、兼容 dash 与 busybox（不要用 bash 数组 / `[[ ]]` / 进程替换）
- `adl` 是例外：主体为 python3 标准库程序（零第三方依赖），仅安装器与引擎准备脚本用 sh
- 新增脚本：建子目录 + 写 README + 更新本页表格（`install.sh` 的 `SCRIPTS` 清单只收 POSIX sh 脚本）

## License

MIT，见 [LICENSE](LICENSE)。
