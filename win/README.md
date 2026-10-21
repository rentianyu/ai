# Windows 脚本

Windows 端 PowerShell 脚本合集，单文件、无第三方依赖（不装模块、不引 CDN）。

| 脚本 | 功能 | 版本 | 下载 |
|---|---|---|---|
| [rpm-centos7.ps1](rpm-centos7.ps1) | CentOS 7 离线 RPM 包及全部依赖下载器：解析镜像的 repodata，把目标包与全部传递依赖一次性下载到本地，并生成 `install.sh` | 2.0.2 | [下载](https://f.xbta.cc/ai/win/rpm-centos7.ps1) |

## 说明

- **运行环境**：Windows + Windows PowerShell 5.1，不需要 rpm / yum / WSL；依赖从镜像的 `repodata/primary.xml.gz` 解析，与 yum 同源
- **首次运行**：`Unblock-File .\rpm-centos7.ps1`，若执行策略受限再 `Set-ExecutionPolicy -Scope Process Bypass`
- **两种模式**：`.\rpm-centos7.ps1 -s <包名>` 只列依赖清单不下载；`.\rpm-centos7.ps1 -d <包名>` 下载到 `.\<包名>\` 并生成 `install.sh`
- **完整参数**：`.\rpm-centos7.ps1 -Help`，或看脚本头部注释（`Get-Help .\rpm-centos7.ps1`）
- **变更记录**：[CHANGELOG.md](CHANGELOG.md)（含 2.0 相对 1.0 的选包/下载修复说明与验证数据）

## 风险提示

- **不校验 GPG 签名**：脚本只按镜像元数据下载并校验字节数（`<size package>`）。生产环境请再用 `rpm --checksig` 或 `yum` 的 `gpgcheck=1` 复核一次
- **默认镜像是阿里云**，CentOS 7 已 EOL，仓库内容可能调整或被移入 vault 目录；可用 `-Mirror` 换源
- **只覆盖已启用的仓库**（默认 `base,updates,epel`），第三方源需用 `-Repo <完整 URL>` 显式加入，否则相关依赖会出现在「找不到」清单里
- **选包按版本最高优先**（与 yum 一致），会把 updates 里的最新版一起拉下来；给老版本系统（7.4/7.5）打包时注意与目标机 glibc 等基础包的兼容性

## License

MIT，见 [LICENSE](LICENSE)。
