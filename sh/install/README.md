# install — ai 脚本通用安装器

本仓库 `sh/` 下所有脚本共用一个安装器：不带参数列菜单让你选，带参数直接装指定脚本。

| 项 | 值 |
|---|---|
| 脚本 | [install.sh](install.sh) |
| 版本 | 1.1.0 |
| 分发 | `https://f.xbta.cc/ai/sh/install/install.sh` |
| 依赖 | 只要 `sh` + `curl`（POSIX sh，兼容 dash / busybox） |

---

本目录所有脚本共用一个安装器：不带参数时列出菜单让你选，带参数时直接装指定脚本。

```bash
# 交互选择：列出可用脚本，输入序号或名称
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh

# 直接装指定脚本（推荐，适合脚本化）
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s opsq

# 指定安装路径
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s opsq /usr/local/bin/opsq

# 只看清单，不安装（注意 -- 分隔，否则 --list 会被 sh 自己吃掉）
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | sh -s -- --list

# 同上，管道场景的备选写法
curl -fsSL https://f.xbta.cc/ai/sh/install/install.sh | SH_LIST=1 sh
```

本地有文件时也可以直接跑：

```bash
sh install.sh --list
sh install.sh opsq                       # 装到默认路径
sh install.sh opsq /usr/local/bin/opsq   # 指定路径
```

选项：`-l/--list` 列清单、`-h/--help` 帮助、`-V/--version` 版本、`--base <URL>` 换分发源。
环境变量 `SH_BASE_URL` 可覆盖分发根地址，`SH_LIST=1` 等价于 `--list`。

> 管道调用时注意：`curl ... | sh -s --list` 里的 `--list` 会被 `sh` 当成自己的选项而报 `Illegal option`，
> 正确写法是 `sh -s -- --list`，或直接用 `SH_LIST=1`。

安装行为说明：

- 从 `https://f.xbta.cc/ai/sh/<文件>` 下载，`.sh` 文件先做 `sh -n` 语法校验
- 先写同目录隐藏临时文件再 `mv` 原子替换，不产生半截文件
- 目录不可写时直接报错，不会静默降级到别处
- 非交互环境（CI、`< /dev/null`）不带参数会明确报错，要求指定脚本名，不会误装默认项

---

## 下载源

- 默认根地址 `https://f.xbta.cc/ai/sh`，脚本清单里的文件名是**相对路径**（如 `opsq/opsq.sh`）
- 换源：`--base <URL>` 或环境变量 `SH_BASE_URL`
- 目录重构前的旧地址 `https://f.xbta.cc/ai/sh/install.sh` 仍可用（同步流程保留为兼容别名）

## 新增脚本

1. 在 `sh/<项目>/` 放脚本与 README
2. 在 install.sh 的 `SCRIPTS` 里加一行：`名称|说明|相对路径|默认安装路径`
3. 同步更新 `sh/README.md` 的项目表

## License

MIT，见 [../LICENSE](../LICENSE)。
