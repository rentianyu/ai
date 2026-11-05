# rpm-centos7 — CentOS 7 离线 RPM 依赖下载器

在 Windows 上把一个 RPM 包和它的**全部传递依赖**下载齐，拷到离线 CentOS 7 机器上装。
不需要 rpm / yum / WSL：依赖直接从镜像的 `repodata/primary.xml.gz` 解析，与 yum 同源。

| 项 | 值 |
|---|---|
| 脚本 | [rpm-centos7.ps1](rpm-centos7.ps1) |
| 版本 | 2.0.2 |
| 运行环境 | Windows + Windows PowerShell 5.1 |
| 下载 | `https://f.xbta.cc/ai/win/rpm-centos7/rpm-centos7.ps1` |
| 变更记录 | [CHANGELOG.md](CHANGELOG.md) |

## 用法

```powershell
Unblock-File .\rpm-centos7.ps1                        # 首次运行先解锁
Set-ExecutionPolicy -Scope Process Bypass              # 执行策略受限时

.\rpm-centos7.ps1 -s nginx                            # 只列依赖清单，不下载
.\rpm-centos7.ps1 -d nginx                            # 下载到 .\nginx\ 并生成 install.sh
.\rpm-centos7.ps1 -Help                               # 完整参数
```

## 说明

- **两种模式**：`-s` 只出清单；`-d` 实际下载并生成 `install.sh`
- **换源**：`-Mirror <URL>`；第三方源用 `-Repo <完整 URL>` 显式加入
- **只覆盖已启用的仓库**（默认 `base,updates,epel`）
- **选包按版本最高优先**（与 yum 一致），会把 updates 里的最新版一起拉下来；给老版本系统（7.4 / 7.5）打包时注意与目标机 glibc 等基础包的兼容性
- 完整参数与实现细节见脚本头部注释（`Get-Help .\rpm-centos7.ps1`）

## 风险提示

- **不校验 GPG 签名**：脚本只按镜像元数据下载并校验字节数（`<size package>`）。生产环境请再用 `rpm --checksig` 或 `yum` 的 `gpgcheck=1` 复核一次
- **默认镜像是阿里云**，CentOS 7 已 EOL，仓库内容可能调整或被移入 vault 目录；用 `-Mirror` 换源

## License

MIT，见 [../LICENSE](../LICENSE)。
