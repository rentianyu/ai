# Windows 脚本

Windows 端 PowerShell 脚本，单文件、无第三方依赖（不装模块、不引 CDN）。

一个项目一个目录：

| 项目 | 功能 | 版本 | 目录 |
|---|---|---|---|
| **rpm-centos7** | CentOS 7 离线 RPM 包及全部依赖下载器：解析镜像 `repodata`，把目标包与全部传递依赖一次性下载到本地，并生成 `install.sh` | 2.0.2 | [rpm-centos7/](rpm-centos7/) |

## 分发机制

- push 后同步到 `https://f.xbta.cc/ai/win/`，路径与仓库一致
- 目录重构前的旧地址 `ai/win/rpm-centos7.ps1` 保留为兼容别名

## License

MIT，见 [LICENSE](LICENSE)。
