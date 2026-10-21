#requires -Version 5.1
<#
.SYNOPSIS
    rpm-centos7 - CentOS 7 离线 RPM 包及全部依赖下载器（Windows PowerShell）

.DESCRIPTION
    数据源：镜像站的 yum repodata（primary.xml.gz）。该文件由 createrepo 生成，
    逐包记录 rpm:provides / rpm:requires 元数据，与 yum / dnf 解析依赖时使用的是
    同一份数据。脚本在 Windows 上无需安装 rpm 工具即可还原依赖树，最后把
    「目标包 + 全部传递依赖」下载到本地目录。

    选包策略：同一 capability 有多个候选时，按「版本最高」优先（epoch → version →
    release，遵循 rpm 版本序），版本相同再按目标架构、最后按仓库顺序。
    这与 yum 的行为一致，默认会取到 updates 仓库里的最新版本。

.EXAMPLE
    .\rpm-centos7.ps1 -s nethogs

.EXAMPLE
    .\rpm-centos7.ps1 -d nethogs

.EXAMPLE
    .\rpm-centos7.ps1 -d httpd -Repo base,updates -OutDir D:\offline -Force
#>

param(
    [string]   $s,
    [string]   $d,
    [string]   $OutDir,
    [string[]] $Repo   = @('base', 'updates', 'epel'),
    [string]   $Arch   = 'x86_64',
    [string[]] $Exclude,
    [string]   $Mirror = 'https://mirrors.aliyun.com',
    [switch]   $FileIndex,
    [switch]   $Force,
    [switch]   $NoCache,
    [switch]   $Help
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
$script:NoCache        = [bool]$NoCache

# 老系统可能不支持 TLS 1.2，设置失败不致命，后续请求会给出明确报错
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 }
catch { Write-Verbose "TLS 1.2 设置失败：$($_.Exception.Message)" }

$script:Ver         = '2.0.2'
$script:HttpHeaders = @{ 'User-Agent' = "rpm-centos7/$($script:Ver) (WindowsPowerShell)" }

$cacheRoot       = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } elseif ($env:TEMP) { $env:TEMP } else { '.' }
$script:CacheDir = Join-Path $cacheRoot 'rpm-centos7\cache'

$script:RepoTemplates = [ordered]@{
    'base'    = '/centos/7/os/x86_64'
    'updates' = '/centos/7/updates/x86_64'
    'extras'  = '/centos/7/extras/x86_64'
    'epel'    = '/epel/7/x86_64'
}

# 文件路径依赖 -> 包名。只保留「叶名与包名不一致」的条目：
# 叶名与包名相同的路径（/bin/sed、/usr/bin/curl 等）由 Get-PathHint 的通用
# 启发式自动命中，无需在此罗列。
$script:PathMap = @{
    # 解释器 / 核心系统工具
    '/bin/sh' = 'bash'
    '/sbin/ldconfig' = 'glibc'; '/usr/sbin/ldconfig' = 'glibc'
    '/usr/bin/ldd' = 'glibc'; '/etc/ld.so.conf' = 'glibc'; '/usr/bin/getent' = 'glibc'
    '/etc/pam.d/system-auth' = 'pam'
    '/etc/mime.types' = 'mailcap'
    # coreutils
    '/usr/bin/env' = 'coreutils'; '/bin/cat' = 'coreutils'; '/bin/cp' = 'coreutils'
    '/bin/mv' = 'coreutils'; '/bin/rm' = 'coreutils'; '/bin/ln' = 'coreutils'
    '/bin/ls' = 'coreutils'; '/bin/mkdir' = 'coreutils'; '/bin/chmod' = 'coreutils'
    '/bin/rmdir' = 'coreutils'; '/bin/cut' = 'coreutils'; '/bin/sort' = 'coreutils'
    '/bin/touch' = 'coreutils'; '/bin/echo' = 'coreutils'; '/bin/chown' = 'coreutils'
    '/bin/chgrp' = 'coreutils'; '/bin/dd' = 'coreutils'; '/bin/mktemp' = 'coreutils'
    '/usr/bin/mktemp' = 'coreutils'; '/usr/bin/install' = 'coreutils'
    '/usr/bin/base64' = 'coreutils'; '/usr/bin/date' = 'coreutils'
    '/usr/bin/head' = 'coreutils'; '/usr/bin/tail' = 'coreutils'
    '/usr/bin/tr' = 'coreutils'; '/usr/bin/wc' = 'coreutils'
    '/usr/bin/du' = 'coreutils'; '/usr/bin/df' = 'coreutils'
    '/usr/bin/stat' = 'coreutils'; '/usr/bin/id' = 'coreutils'
    '/usr/bin/uname' = 'coreutils'; '/usr/bin/nice' = 'coreutils'; '/usr/bin/tee' = 'coreutils'
    # 常用命令（叶名 != 包名）
    '/bin/awk' = 'gawk'; '/usr/bin/awk' = 'gawk'
    '/usr/bin/find' = 'findutils'
    '/usr/bin/egrep' = 'grep'; '/usr/bin/fgrep' = 'grep'
    '/usr/bin/diff' = 'diffutils'; '/usr/bin/diff3' = 'diffutils'
    '/usr/bin/db_stat' = 'libdb-utils'
    '/usr/bin/ps' = 'procps-ng'; '/bin/ps' = 'procps-ng'
    '/usr/bin/kill' = 'procps-ng'; '/bin/kill' = 'procps-ng'
    '/usr/bin/systemctl' = 'systemd'
    '/bin/mount' = 'util-linux'; '/bin/umount' = 'util-linux'
    '/usr/bin/flock' = 'util-linux'; '/usr/bin/getopt' = 'util-linux'
    '/usr/bin/logger' = 'util-linux'; '/usr/bin/nsenter' = 'util-linux'
    '/usr/bin/unshare' = 'util-linux'
    # 账号 / 系统管理
    '/usr/sbin/useradd' = 'shadow-utils'; '/usr/sbin/groupadd' = 'shadow-utils'
    '/usr/sbin/usermod' = 'shadow-utils'; '/usr/sbin/userdel' = 'shadow-utils'
    '/usr/sbin/groupdel' = 'shadow-utils'; '/usr/sbin/chpasswd' = 'shadow-utils'
    '/usr/sbin/update-alternatives' = 'chkconfig'; '/usr/sbin/alternatives' = 'chkconfig'
    '/sbin/install-info' = 'info'; '/usr/sbin/install-info' = 'info'
    '/usr/sbin/semanage' = 'policycoreutils-python'
    '/usr/sbin/sestatus' = 'policycoreutils'; '/usr/sbin/restorecon' = 'policycoreutils'
    # 构建 / 开发
    '/usr/bin/nm' = 'binutils'; '/usr/bin/ar' = 'binutils'; '/usr/bin/ld' = 'binutils'
    '/usr/bin/as' = 'binutils'; '/usr/bin/strip' = 'binutils'; '/usr/bin/objdump' = 'binutils'
    '/usr/bin/readelf' = 'binutils'; '/usr/bin/ranlib' = 'binutils'
    '/usr/bin/pkg-config' = 'pkgconfig'
    '/usr/bin/cc' = 'gcc'; '/usr/bin/g++' = 'gcc-c++'
    '/usr/bin/python2' = 'python'
    # 网络 / 其他
    '/usr/bin/ssh' = 'openssh-clients'; '/usr/sbin/sshd' = 'openssh-server'
    '/usr/bin/ssh-keygen' = 'openssh'; '/usr/bin/scp' = 'openssh-clients'
}

# ---------------------------------------------------------------- 输出辅助
function Write-Info { param([string]$Text) Write-Host "  $Text" }
function Write-Warn { param([string]$Text) Write-Host "  $Text" -ForegroundColor Yellow }
function Write-Err  { param([string]$Text) Write-Host "  $Text" -ForegroundColor Red }

function Format-Size {
    param([long]$Bytes)
    if ($Bytes -ge 1073741824) { return ('{0:N1} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1048576)    { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1024)       { return ('{0:N1} KB' -f ($Bytes / 1KB)) }
    return "$Bytes B"
}

function Show-Help {
    $t = @'
  rpm-centos7 <VER>  ·  CentOS 7 离线 RPM 包及依赖下载器
  ============================================================

  用法
    rpm-centos7 -s <包名>    搜索：解析该包及全部依赖，只显示不下载
    rpm-centos7 -d <包名>    下载：解析后下载到 .\<包名>\ 目录
    rpm-centos7 -Help        显示本帮助

  参数
    -s <包名>             搜索模式（与 -d 互斥）
    -d <包名>             下载模式（与 -s 互斥）
    -OutDir <路径>        下载根目录，默认当前目录
    -Repo <列表>          仓库：base | updates | extras | epel，默认 base,updates,epel
                          也接受完整 base URL，如 -Repo https://x/centos/7/os/x86_64
    -Arch <架构>          目标架构：x86_64（默认，含 noarch）| i686 | any
    -Exclude <模式>       排除包名（视为目标机已装），如 -Exclude 'kernel*','glibc'
    -FileIndex            内置映射无法匹配的路径依赖，下载 filelists 精确解析
    -Mirror <URL>         镜像根地址，默认 https://mirrors.aliyun.com
    -Force                文件已存在也重新下载
    -NoCache              忽略本地 repodata 缓存，强制重新抓取

  示例
    .\rpm-centos7.ps1 -s nethogs
    .\rpm-centos7.ps1 -d nethogs
    .\rpm-centos7.ps1 -d httpd -Repo base,updates -OutDir D:\offline
    .\rpm-centos7.ps1 -d nethogs -Exclude 'glibc','bash'

  说明
    · 依赖来自 repodata/primary.xml.gz 的 provides/requires，与 yum 同源
    · 同一 capability 多个候选时取版本最高者（与 yum 一致），不会优先旧仓库
    · requires 的版本约束（>=、= 等）参与选包，不只按名字匹配
    · 自动忽略 rpmlib(...)、config(...)、kernel*、/boot/* 等不可离线安装项
    · 索引缓存在 <CACHE>
    · nethogs 等工具在 EPEL，需 -Repo 含 epel（默认已含）
'@
    Write-Host ''
    Write-Host ($t.Replace('<VER>', $script:Ver).Replace('<CACHE>', $script:CacheDir)) -ForegroundColor Gray
    Write-Host ''
}

# ---------------------------------------------------------------- 网络
function Invoke-Download {
    param([string]$Url, [string]$Dest, [int]$Retry = 3)
    $tmp = "$Dest.part"
    $last = $null
    for ($i = 1; $i -le $Retry; $i++) {
        try {
            if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
            Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing -TimeoutSec 180 -Headers $script:HttpHeaders
            if (-not (Test-Path $tmp)) { throw '下载未产生文件' }
            Move-Item -Path $tmp -Destination $Dest -Force
            return (Get-Item $Dest).Length
        }
        catch {
            $last = $_
            if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
            if ($i -lt $Retry) { Start-Sleep -Milliseconds (400 * $i) }
        }
    }
    throw "下载失败：$Url`n        $($last.Exception.Message)"
}

function Get-RemoteText {
    param([string]$Url, [int]$TimeoutSec = 30, [int]$Retry = 3)
    $last = $null
    for ($i = 1; $i -le $Retry; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -Headers $script:HttpHeaders
            return [string]$r.Content
        }
        catch {
            $last = $_
            if ($i -lt $Retry) { Start-Sleep -Milliseconds (400 * $i) }
        }
    }
    throw "请求失败：$Url`n        $($last.Exception.Message)"
}

# ---------------------------------------------------------------- 仓库元数据
# 只返回 repomd 里 primary / filelists 的 href 与大小，不做本地 meta 缓存：
# href 文件名本身含 sha256，可直接作为本地缓存文件名（内容寻址）。
function Get-RepoMeta {
    param([string]$Name, [string]$Base)

    $doc = New-Object System.Xml.XmlDocument
    $doc.LoadXml((Get-RemoteText "$Base/repodata/repomd.xml"))

    $rev = ''
    $revNode = $doc.GetElementsByTagName('revision')
    if ($revNode.Count -gt 0) { $rev = $revNode[0].InnerText }

    $pHref = ''; $pSize = 0; $fHref = ''; $fSize = 0
    foreach ($dn in $doc.GetElementsByTagName('data')) {
        $type = $dn.GetAttribute('type')
        if ($type -ne 'primary' -and $type -ne 'filelists') { continue }
        $loc = $dn.GetElementsByTagName('location')
        if ($loc.Count -eq 0) { continue }
        $href = $loc[0].GetAttribute('href')
        $size = 0
        $sz = $dn.GetElementsByTagName('size')
        if ($sz.Count -gt 0 -and $sz[0].InnerText) { $size = [long]$sz[0].InnerText }
        if ($type -eq 'primary') { $pHref = $href; $pSize = $size }
        else                     { $fHref = $href; $fSize = $size }
    }
    if (-not $pHref) { throw "repomd.xml 中没有 primary 数据段：$Base" }

    return [pscustomobject]@{
        Name = $Name; Base = $Base; Revision = $rev
        PrimaryHref = $pHref; PrimarySize = $pSize
        FilelistsHref = $fHref; FilelistsSize = $fSize
    }
}

function Get-CachedFile {
    param([string]$Href, [string]$Base, [long]$Size, [string]$Label)
    $fn = ($Href -split '/')[-1]
    $path = Join-Path $script:CacheDir $fn
    if ($script:NoCache -or -not (Test-Path $path)) {
        Write-Info ("[{0}] 下载 {1}：{2}" -f $Label, $fn, (Format-Size ([Math]::Max($Size, 0))))
        [void](Invoke-Download "$Base/$Href" $path)
    }
    else {
        Write-Info ("[{0}] 缓存命中：{1}" -f $Label, $fn)
    }
    if ($Size -gt 0) {
        $len = (Get-Item $path).Length
        if ($len -ne $Size) {
            throw ("repodata 大小校验失败：{0}（期望 {1}，实得 {2}）" -f $fn, $Size, $len)
        }
    }
    return $path
}

# ---------------------------------------------------------------- primary.xml 解析
# Requires 中的条目：无版本约束时存字符串（省内存），带约束时存对象
# @{ Name; Flags; Epoch; Ver; Rel }。
function Read-PrimaryIndex {
    param([string]$GzPath, $Meta, [string]$ArchFilter)

    $list = New-Object System.Collections.ArrayList
    $fs   = [System.IO.File]::OpenRead($GzPath)
    try {
        $gz = New-Object System.IO.Compression.GZipStream($fs, [System.IO.Compression.CompressionMode]::Decompress)
        $sr = New-Object System.IO.StreamReader($gz, [System.Text.Encoding]::UTF8)
        $st = New-Object System.Xml.XmlReaderSettings
        $st.IgnoreWhitespace = $true
        $st.IgnoreComments   = $true
        $st.DtdProcessing    = [System.Xml.DtdProcessing]::Ignore
        $xr = [System.Xml.XmlReader]::Create($sr, $st)

        $name = ''; $arch = ''; $ver = ''; $rel = ''; $ep = '0'; $href = ''; $psize = 0
        $prov = $null; $req = $null; $sec = ''; $pend = ''; $inPkg = $false

        while ($xr.Read()) {
            $nt = $xr.NodeType

            if ($nt -eq [System.Xml.XmlNodeType]::Element) {
                $ln = $xr.LocalName
                if ($ln -eq 'package') {
                    if ($xr.Depth -eq 1) {
                        $name = ''; $arch = ''; $ver = ''; $rel = ''; $ep = '0'; $href = ''; $psize = 0
                        $prov = New-Object System.Collections.ArrayList
                        $req  = New-Object System.Collections.ArrayList
                        $sec  = ''; $pend = ''; $inPkg = $true
                    }
                }
                elseif (-not $inPkg) { continue }
                elseif ($ln -eq 'name') { $pend = 'name' }
                elseif ($ln -eq 'arch') { $pend = 'arch' }
                elseif ($ln -eq 'version') {
                    $ver = $xr.GetAttribute('ver')
                    $rel = $xr.GetAttribute('rel')
                    $e   = $xr.GetAttribute('epoch')
                    if ($e) { $ep = $e }
                }
                elseif ($ln -eq 'location') {
                    $h = $xr.GetAttribute('href')
                    if ($h) { $href = $h }
                }
                elseif ($ln -eq 'size') {
                    $ps = $xr.GetAttribute('package')
                    if ($ps) { $psize = [long]$ps }
                }
                elseif ($ln -eq 'provides') { $sec = 'p' }
                elseif ($ln -eq 'requires') { $sec = 'r' }
                elseif ($ln -eq 'entry') {
                    $n = $xr.GetAttribute('name')
                    if ($n) {
                        if ($sec -eq 'p') { [void]$prov.Add($n) }
                        elseif ($sec -eq 'r') {
                            $fl = $xr.GetAttribute('flags')
                            if ($fl) {
                                [void]$req.Add([pscustomobject]@{
                                    Name  = $n
                                    Flags = $fl
                                    Epoch = $xr.GetAttribute('epoch')
                                    Ver   = $xr.GetAttribute('ver')
                                    Rel   = $xr.GetAttribute('rel')
                                })
                            }
                            else { [void]$req.Add($n) }
                        }
                    }
                }
            }
            elseif ($nt -eq [System.Xml.XmlNodeType]::EndElement) {
                $ln = $xr.LocalName
                if ($ln -eq 'package') {
                    if ($inPkg) {
                        $keep = $true
                        if ($ArchFilter -ne 'any' -and $arch -ne $ArchFilter -and $arch -ne 'noarch') { $keep = $false }
                        if ($keep -and $name -and $href) {
                            [void]$list.Add([pscustomobject]@{
                                Name     = $name
                                Arch     = $arch
                                Ver      = $ver
                                Rel      = $rel
                                Epoch    = $ep
                                Href     = $href
                                Size     = $psize
                                Repo     = $Meta.Name
                                Base     = $Meta.Base
                                Provides = $prov.ToArray()
                                Requires = $req.ToArray()
                            })
                        }
                        $inPkg = $false
                        $prov = $null; $req = $null
                    }
                }
                elseif ($ln -eq 'provides' -or $ln -eq 'requires') { $sec = '' }
                elseif ($ln -eq 'name' -or $ln -eq 'arch') { $pend = '' }
            }
            elseif ($nt -eq [System.Xml.XmlNodeType]::Text) {
                if ($pend -eq 'name') { $name = $xr.Value; $pend = '' }
                elseif ($pend -eq 'arch') { $arch = $xr.Value; $pend = '' }
            }
        }
        $xr.Close()
    }
    finally {
        $fs.Close()
    }
    return $list
}
# ---------------------------------------------------------------- rpm 版本比较
# 按 rpm 的 epoch:version-release 语义比较。不依赖 [version] 类型，全部走字符串
# 分段比较，避免大数字溢出与 "1.10 < 1.9" 这类字符串序错误。
function Compare-RpmVer {
    param([string]$A, [string]$B)
    if ($A -ceq $B) { return 0 }
    if (-not $A) { if (-not $B) { return 0 } else { return -1 } }
    if (-not $B) { return 1 }

    $re = [regex]'(?i)\d+|[a-z]+|[^0-9a-z]+'
    $ma = $re.Matches($A)
    $mb = $re.Matches($B)
    $n  = [Math]::Max($ma.Count, $mb.Count)

    for ($i = 0; $i -lt $n; $i++) {
        if ($i -ge $ma.Count) { return -1 }
        if ($i -ge $mb.Count) { return 1 }
        $x = $ma[$i].Value
        $y = $mb[$i].Value
        $xd = [char]::IsDigit($x[0])
        $yd = [char]::IsDigit($y[0])
        if ($xd -and $yd) {
            $xs = $x.TrimStart('0')
            $ys = $y.TrimStart('0')
            if ($xs.Length -ne $ys.Length) { return [Math]::Sign($xs.Length - $ys.Length) }
            $c = [string]::CompareOrdinal($xs, $ys)
            if ($c -ne 0) { return [Math]::Sign($c) }
        }
        elseif ($xd -ne $yd) {
            if ($xd) { return 1 } else { return -1 }
        }
        else {
            $c = [string]::CompareOrdinal($x, $y)
            if ($c -ne 0) { return [Math]::Sign($c) }
        }
    }
    return 0
}

# $A / $B 需含 Epoch、Ver、Rel 三个属性（Package 对象或 requires 约束对象）
function Compare-Evr {
    param($A, $B)
    $ea = 0; if ($A.Epoch) { $ea = [int64]$A.Epoch }
    $eb = 0; if ($B.Epoch) { $eb = [int64]$B.Epoch }
    if ($ea -ne $eb) { return [Math]::Sign($ea - $eb) }
    if ($A.Ver -and $B.Ver) {
        $c = Compare-RpmVer "$($A.Ver)" "$($B.Ver)"
        if ($c -ne 0) { return $c }
    }
    if ($A.Rel -and $B.Rel) {
        $c = Compare-RpmVer "$($A.Rel)" "$($B.Rel)"
        if ($c -ne 0) { return $c }
    }
    return 0
}

# 判断 $Src（候选包或已满足项）是否满足 requires 条目 $Entry 的版本约束。
# capability 的版本可能独立于包版本（如 python(abi) = 2.7 而包是 2.7.5），
# 此时若严格比较失败，再按「包版本以约束版本为前缀」宽松判定，避免误报缺包。
function Test-VersionCond {
    param($Entry, $Src)
    if ($Entry -is [string]) { return $true }
    if (-not $Entry.Flags -or -not $Entry.Ver) { return $true }

    $c = Compare-Evr $Src $Entry
    switch ($Entry.Flags) {
        'EQ' { if ($c -eq 0) { return $true } }
        'GE' { if ($c -ge 0) { return $true } }
        'GT' { if ($c -gt 0) { return $true } }
        'LE' { if ($c -le 0) { return $true } }
        'LT' { if ($c -lt 0) { return $true } }
        default { return $true }
    }

    if ($Entry.Name -ne $Src.Name) {
        $sv = "$($Src.Ver)"
        $ev = "$($Entry.Ver)"
        if ($sv -like "$ev*")   { return $true }
        if ($ev -like "$sv.*")  { return $true }
    }
    return $false
}

# ---------------------------------------------------------------- 索引构建
# 只为「会被 requires 引用的名字」建立 capability 索引：primary.xml 三个仓库
# 合计约 145 万条 provides，全量建索引既慢又占内存，而依赖解析只会查 requires
# 出现过的名字，因此先收集 needs 再筛选。
function Get-CapBase {
    param([string]$n)
    if ($n.StartsWith('/')) { return $n }
    $i = $n.IndexOf('(')
    if ($i -gt 0) { return $n.Substring(0, $i) }
    return $n
}

function Build-Index {
    param($Packages)
    $ps = @($Packages)

    $need = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($p in $ps) {
        foreach ($rq in $p.Requires) {
            $n = if ($rq -is [string]) { $rq } else { $rq.Name }
            if (-not $n) { continue }
            [void]$need.Add($n)
            $b = Get-CapBase $n
            if ($b -and $b -ne $n) { [void]$need.Add($b) }
        }
    }

    $byName = @{}
    $byProv = @{}
    foreach ($p in $ps) {
        $l = $byName[$p.Name]
        if ($null -ne $l) { [void]$l.Add($p) }
        else { $byName[$p.Name] = [System.Collections.ArrayList]@($p) }

        if ($need.Contains($p.Name)) {
            $l2 = $byProv[$p.Name]
            if ($null -ne $l2) { [void]$l2.Add($p) }
            else { $byProv[$p.Name] = [System.Collections.ArrayList]@($p) }
        }

        foreach ($pv in $p.Provides) {
            if (-not $need.Contains($pv)) { continue }
            $l3 = $byProv[$pv]
            if ($null -ne $l3) { [void]$l3.Add($p) }
            else { $byProv[$pv] = [System.Collections.ArrayList]@($p) }
        }
    }
    return @{ ByName = $byName; ByProv = $byProv; NeedCount = $need.Count }
}

# ---------------------------------------------------------------- 选包
# 语义：版本最高优先 -> 版本相同看目标架构 -> 再相同看仓库顺序。（与 yum 一致）
# 传入 $Dep 时先按版本约束过滤候选，过滤后为空则返回 $null（视为约束无法满足）。
function Select-BestPackage {
    param($Candidates, [string]$Arch, [string[]]$RepoOrder, $Dep)

    $arr = @($Candidates)
    if ($arr.Count -eq 0) { return $null }

    if ($Dep) {
        $ok = @($arr | Where-Object { Test-VersionCond $Dep $_ })
        if ($ok.Count -eq 0) { return $null }
        $arr = $ok
    }

    $pool = @($arr | Where-Object { $Arch -eq 'any' -or $_.Arch -eq $Arch -or $_.Arch -eq 'noarch' })
    if ($pool.Count -eq 0) { $pool = $arr }

    $best = $null
    foreach ($c in $pool) {
        if (-not $best) { $best = $c; continue }

        $cmp = Compare-Evr $c $best
        if ($cmp -gt 0) { $best = $c; continue }
        if ($cmp -lt 0) { continue }

        $ra = 2; if ($c.Arch -eq $Arch) { $ra = 0 } elseif ($c.Arch -eq 'noarch') { $ra = 1 }
        $rb = 2; if ($best.Arch -eq $Arch) { $rb = 0 } elseif ($best.Arch -eq 'noarch') { $rb = 1 }
        if ($ra -lt $rb) { $best = $c; continue }
        if ($ra -gt $rb) { continue }

        $ia = [Array]::IndexOf($RepoOrder, $c.Repo); if ($ia -lt 0) { $ia = 99 }
        $ib = [Array]::IndexOf($RepoOrder, $best.Repo); if ($ib -lt 0) { $ib = 99 }
        if ($ia -lt $ib) { $best = $c }
    }
    return $best
}

function Find-Candidate {
    param($Entry, $ByName, $ByProv, [string]$Arch, [string[]]$RepoOrder)

    $n = if ($Entry -is [string]) { $Entry } else { $Entry.Name }
    if (-not $n) { return $null }

    if ($ByName.ContainsKey($n)) {
        $c = Select-BestPackage -Candidates ($ByName[$n]) -Arch $Arch -RepoOrder $RepoOrder -Dep $Entry
        if ($c) { return $c }
    }

    $base = Get-CapBase $n
    foreach ($key in @($n, $base)) {
        if (-not $key -or -not $ByProv.ContainsKey($key)) { continue }
        $c = Select-BestPackage -Candidates ($ByProv[$key]) -Arch $Arch -RepoOrder $RepoOrder -Dep $Entry
        if ($c) { return $c }
    }
    return $null
}

# ---------------------------------------------------------------- 依赖辅助
function Test-IgnorableDep {
    param([string]$n)
    if ($n.StartsWith('rpmlib(')) { return $true }
    if ($n.StartsWith('config(')) { return $true }
    if ($n.StartsWith('/boot/'))  { return $true }
    if ($n -match '^kernel($|-)') { return $true }
    return $false
}

function Get-PathHint {
    param([string]$Path, [hashtable]$ByName)

    if ($script:PathMap.ContainsKey($Path)) { return $script:PathMap[$Path] }

    $parts = $Path -split '/'
    $leaf  = $parts[$parts.Count - 1]
    if (-not $leaf) { return $null }
    if ($ByName.ContainsKey($leaf)) { return $leaf }

    $m = [regex]::Match($leaf, '^(?<b>.+?)\.so(\.\d+)*$')
    if ($m.Success) {
        $b = $m.Groups['b'].Value
        if ($b -and $ByName.ContainsKey($b)) { return $b }
    }
    return $null
}

function Find-FileOwner {
    param([string[]]$Paths, $RepoMetas)

    $want = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($p in $Paths) { [void]$want.Add($p) }
    $found = @{}

    foreach ($m in $RepoMetas) {
        if ($want.Count -eq 0) { break }
        if (-not $m.FilelistsHref) { continue }

        $gz = Get-CachedFile -Href $m.FilelistsHref -Base $m.Base -Size $m.FilelistsSize -Label $m.Name
        Write-Info ("[{0}] 扫描文件索引 ..." -f $m.Name)

        $fs = [System.IO.File]::OpenRead($gz)
        try {
            $gs = New-Object System.IO.Compression.GZipStream($fs, [System.IO.Compression.CompressionMode]::Decompress)
            $sr = New-Object System.IO.StreamReader($gs, [System.Text.Encoding]::UTF8)
            $st = New-Object System.Xml.XmlReaderSettings
            $st.IgnoreWhitespace = $true
            $st.DtdProcessing    = [System.Xml.DtdProcessing]::Ignore
            $xr = [System.Xml.XmlReader]::Create($sr, $st)

            $curName = ''; $pend = ''
            while ($xr.Read()) {
                $nt = $xr.NodeType
                if ($nt -eq [System.Xml.XmlNodeType]::Element) {
                    $ln = $xr.LocalName
                    if ($ln -eq 'package') { $curName = $xr.GetAttribute('name'); $pend = '' }
                    elseif ($ln -eq 'file') { $pend = 'file' }
                }
                elseif ($nt -eq [System.Xml.XmlNodeType]::Text -and $pend -eq 'file') {
                    $v = $xr.Value
                    if ($want.Contains($v)) {
                        if (-not $found.ContainsKey($v)) { $found[$v] = $curName }
                        [void]$want.Remove($v)
                        if ($want.Count -eq 0) { break }
                    }
                    $pend = ''
                }
                elseif ($nt -eq [System.Xml.XmlNodeType]::EndElement -and $xr.LocalName -eq 'file') { $pend = '' }
            }
            $xr.Close()
        }
        finally { $fs.Close() }
    }
    return $found
}

# ---------------------------------------------------------------- 依赖解析
# BFS 解析依赖树；队列空后处理路径依赖（一次可能带出新依赖），有新包就回到
# 外层继续 BFS，直到没有新包可加为止。
function Resolve-DependencySet {
    param(
        $TopPackage,
        [hashtable]$ByName,
        [hashtable]$ByProv,
        [string[]]$RepoOrder,
        [string]$Arch,
        [string[]]$ExcludePatterns,
        [switch]$UseFileIndex,
        $RepoMetas
    )

    $selected    = [ordered]@{}
    $provided    = @{}
    $missing     = New-Object 'System.Collections.Generic.List[string]'
    $missingSeen = New-Object 'System.Collections.Generic.HashSet[string]'
    $ignored     = New-Object 'System.Collections.Generic.List[string]'
    $ignoredSeen = New-Object 'System.Collections.Generic.HashSet[string]'
    $relaxed     = New-Object 'System.Collections.Generic.List[string]'
    $relaxedSeen = New-Object 'System.Collections.Generic.HashSet[string]'
    $queue       = New-Object 'System.Collections.Generic.Queue[object]'
    $triedPaths  = New-Object 'System.Collections.Generic.HashSet[string]'

    $queue.Enqueue([pscustomobject]@{ Pkg = $TopPackage; Parent = ''; Depth = 0; Why = '(目标包)' })

    while ($true) {
        while ($queue.Count -gt 0) {
            $node = $queue.Dequeue()
            $pkg  = $node.Pkg

            $key = "$($pkg.Name)|$($pkg.Ver)-$($pkg.Rel)|$($pkg.Arch)"
            if ($selected.Contains($key)) { continue }

            $isExcluded = $false
            if ($ExcludePatterns) {
                foreach ($pat in $ExcludePatterns) {
                    if ($pkg.Name -like $pat) { $isExcluded = $true; break }
                }
            }

            if ($isExcluded) {
                $provided[$pkg.Name] = $pkg
                foreach ($pv in $pkg.Provides) { if (-not $provided.ContainsKey($pv)) { $provided[$pv] = $pkg } }
                continue
            }

            $selected[$key] = [pscustomobject]@{
                Pkg = $pkg; Parent = $node.Parent; Depth = $node.Depth; Why = $node.Why
            }
            $provided[$pkg.Name] = $pkg
            foreach ($pv in $pkg.Provides) { if (-not $provided.ContainsKey($pv)) { $provided[$pv] = $pkg } }

            foreach ($rq in $pkg.Requires) {
                $rname = if ($rq -is [string]) { $rq } else { $rq.Name }
                if (-not $rname) { continue }

                if ($provided.ContainsKey($rname)) {
                    if (Test-VersionCond $rq ($provided[$rname])) { continue }
                }
                if (Test-IgnorableDep $rname) {
                    if ($ignoredSeen.Add($rname)) { [void]$ignored.Add($rname) }
                    continue
                }

                $cand = Find-Candidate -Entry $rq -ByName $ByName -ByProv $ByProv -Arch $Arch -RepoOrder $RepoOrder
                if (-not $cand -and ($rq -isnot [string]) -and $rq.Flags) {
                    # 约束无法满足（上游元数据版本粒度差异等）：放宽为「按名字取最高版」，
                    # 并单独记入 Relaxed，由主流程提示，不当作缺失依赖。
                    $cand = Find-Candidate -Entry $rname -ByName $ByName -ByProv $ByProv -Arch $Arch -RepoOrder $RepoOrder
                    if ($cand -and $relaxedSeen.Add($rname)) { [void]$relaxed.Add($rname) }
                }
                if ($cand) {
                    $queue.Enqueue([pscustomobject]@{
                        Pkg = $cand; Parent = $pkg.Name; Depth = $node.Depth + 1; Why = $rname
                    })
                }
                elseif ($missingSeen.Add($rname)) {
                    [void]$missing.Add($rname)
                }
            }
        }

        $pathMissing = @($missing | Where-Object { $_.StartsWith('/') -and -not $triedPaths.Contains($_) })
        if ($pathMissing.Count -eq 0) { break }
        foreach ($pm0 in $pathMissing) { [void]$triedPaths.Add($pm0) }

        $owners = @{}
        foreach ($pm in $pathMissing) {
            $hint = Get-PathHint $pm $ByName
            if ($hint) { $owners[$pm] = $hint }
        }
        if ($UseFileIndex) {
            $rest = @($pathMissing | Where-Object { -not $owners.ContainsKey($_) })
            if ($rest.Count -gt 0) {
                $fo = Find-FileOwner -Paths $rest -RepoMetas $RepoMetas
                foreach ($k in $fo.Keys) { if (-not $owners.ContainsKey($k)) { $owners[$k] = $fo[$k] } }
            }
        }

        $added = $false
        foreach ($pm in $pathMissing) {
            if (-not $owners.ContainsKey($pm)) { continue }
            $oname = $owners[$pm]
            if (-not $ByName.ContainsKey($oname)) { continue }
            $opkg = Select-BestPackage -Candidates ($ByName[$oname]) -Arch $Arch -RepoOrder $RepoOrder
            if (-not $opkg) { continue }

            $missing.Remove($pm) | Out-Null
            $provided[$pm] = $opkg

            $okey = "$($opkg.Name)|$($opkg.Ver)-$($opkg.Rel)|$($opkg.Arch)"
            if (-not $selected.Contains($okey)) {
                $queue.Enqueue([pscustomobject]@{ Pkg = $opkg; Parent = '(文件依赖)'; Depth = 1; Why = $pm })
                $added = $true
            }
        }
        if (-not $added) { break }
    }

    return [pscustomobject]@{
        Selected = $selected
        Missing  = $missing
        Ignored  = $ignored
        Relaxed  = $relaxed
    }
}
# ---------------------------------------------------------------- 展示
function Get-DepOrder {
    param($ParentName, [int]$Depth, $Children, $Selected, $Out, $Seen)
    if (-not $Children.ContainsKey($ParentName)) { return }
    foreach ($ck in $Children[$ParentName]) {
        if ($Seen.Contains($ck)) { continue }
        [void]$Seen.Add($ck)
        [void]$Out.Add([pscustomobject]@{ Key = $ck; Depth = $Depth })
        Get-DepOrder -ParentName ($Selected[$ck].Pkg.Name) -Depth ($Depth + 1) `
            -Children $Children -Selected $Selected -Out $Out -Seen $Seen
    }
}

function Show-PackageTable {
    param($Selected)

    $children = @{}
    foreach ($k in $Selected.Keys) {
        $pn = [string]$Selected[$k].Parent
        if (-not $children.ContainsKey($pn)) { $children[$pn] = New-Object System.Collections.ArrayList }
        [void]$children[$pn].Add($k)
    }

    $order = New-Object System.Collections.ArrayList
    $seen  = New-Object 'System.Collections.Generic.HashSet[string]'
    Get-DepOrder -ParentName '' -Depth 1 -Children $children -Selected $Selected -Out $order -Seen $seen

    foreach ($k in $Selected.Keys) {
        if (-not $seen.Contains($k)) { [void]$order.Add([pscustomobject]@{ Key = $k; Depth = 1 }) }
    }

    $rows = New-Object System.Collections.ArrayList
    $i = 0
    foreach ($o in $order) {
        $it = $Selected[$o.Key]; $i++
        $p  = $it.Pkg
        if ($o.Depth -le 1) { $disp = $p.Name }
        else { $disp = ('  ' * ($o.Depth - 1)) + '+- ' + $p.Name }
        [void]$rows.Add([pscustomobject]@{
            Idx  = $i
            Name = $disp
            Ver  = "$($p.Ver)-$($p.Rel)"
            Arch = $p.Arch
            Size = (Format-Size $p.Size)
            Repo = $p.Repo
            Why  = $it.Why
        })
    }

    $wIdx = [Math]::Max(([string]$rows.Count).Length, 3)
    $wName = 20; $wVer = 16
    foreach ($r in $rows) {
        if ($r.Name.Length -gt $wName) { $wName = $r.Name.Length }
        if ($r.Ver.Length  -gt $wVer)  { $wVer  = $r.Ver.Length }
    }
    if ($wName -gt 44) { $wName = 44 }
    if ($wVer  -gt 34) { $wVer  = 34 }

    $fmt  = "  {0,$wIdx}  {1,-$wName}  {2,-$wVer}  {3,-6}  {4,10}  {5,-7}  {6}"
    $head = $fmt -f '#', 'PACKAGE', 'VERSION', 'ARCH', 'SIZE', 'REPO', 'REQUIRED-BY'
    Write-Host $head -ForegroundColor DarkGray
    Write-Host ('  ' + ('-' * ($head.Length - 2))) -ForegroundColor DarkGray

    foreach ($r in $rows) {
        $line = $fmt -f $r.Idx, $r.Name, $r.Ver, $r.Arch, $r.Size, $r.Repo, $r.Why
        if ($r.Idx -eq 1) { Write-Host $line -ForegroundColor White }
        else { Write-Host $line }
    }
}

# ---------------------------------------------------------------- 下载
function Start-DownloadSet {
    param($Selected, [string]$Dir, [switch]$ForceRefetch)

    $pkgs = New-Object System.Collections.ArrayList
    foreach ($k in $Selected.Keys) { [void]$pkgs.Add($Selected[$k].Pkg) }

    if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    $Dir = (Resolve-Path $Dir).Path

    $ok = 0; $skip = 0; $fail = 0; $bytes = 0
    $failed = New-Object System.Collections.ArrayList
    $total = $pkgs.Count

    for ($i = 0; $i -lt $total; $i++) {
        $p    = $pkgs[$i]
        $fn   = ($p.Href -split '/')[-1]
        $dest = Join-Path $Dir $fn
        if ($fn.Length -gt 46) { $label = "  [{0,2}/{1}] {2}" -f ($i + 1), $total, $fn }
        else { $label = "  [{0,2}/{1}] {2,-46}" -f ($i + 1), $total, $fn }

        if ((Test-Path $dest) -and -not $ForceRefetch) {
            $len = (Get-Item $dest).Length
            if ($p.Size -le 0 -or $len -eq $p.Size) {
                Write-Host $label -NoNewline
                Write-Host " 已存在" -ForegroundColor DarkGray
                $skip++
                continue
            }
            Write-Host $label -NoNewline
            Write-Host " 已存在但大小不符，重新下载" -ForegroundColor Yellow
        }
        else {
            Write-Host $label -NoNewline
        }

        try {
            $sz = Invoke-Download "$($p.Base)/$($p.Href)" $dest
            if ($p.Size -gt 0 -and $sz -ne $p.Size) {
                throw ("大小校验失败（期望 {0}，实得 {1}）" -f (Format-Size $p.Size), (Format-Size $sz))
            }
            $bytes += $sz
            Write-Host (" 完成  {0}" -f (Format-Size $sz)) -ForegroundColor Green
            $ok++
        }
        catch {
            if (Test-Path $dest) { Remove-Item $dest -Force -ErrorAction SilentlyContinue }
            Write-Host (" 失败  {0}" -f $_.Exception.Message) -ForegroundColor Red
            [void]$failed.Add($fn)
            $fail++
        }
    }

    return [pscustomobject]@{
        Dir = $Dir; Ok = $ok; Skip = $skip; Fail = $fail
        Bytes = $bytes; Failed = $failed; Total = $total
    }
}

function New-InstallScript {
    param([string]$Dir, [string]$PkgName)
    $sh = @'
#!/bin/bash
# 由 rpm-centos7 自动生成 —— CentOS 7 离线安装脚本
set -e
cd "$(dirname "$0")"
COUNT=$(ls -1 ./*.rpm 2>/dev/null | wc -l)
echo "[rpm-centos7] 当前目录: $(pwd)，待安装 rpm: $COUNT 个"
if [ "$COUNT" -eq 0 ]; then
    echo "[rpm-centos7] 目录内没有 rpm 文件" >&2
    exit 1
fi
if command -v yum >/dev/null 2>&1; then
    # --disablerepo='*' 让 yum 只用本地 rpm 解析依赖：缺包会立刻报错，不静默联网补齐
    yum -y --disablerepo='*' localinstall ./*.rpm
else
    rpm -Uvh --replacepkgs --replacefiles ./*.rpm
fi
echo "[rpm-centos7] 安装完成，可执行: which PKGNAME_HERE"
'@
    $sh = $sh.Replace('PKGNAME_HERE', $PkgName)
    $path = Join-Path $Dir 'install.sh'
    [System.IO.File]::WriteAllText($path, ($sh -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))
    return $path
}

# ================================================================ 主流程
if ($Help -or (-not $s -and -not $d)) {
    Show-Help
    exit 0
}
if ($s -and $d) {
    Write-Err '错误：-s 与 -d 不能同时使用。'
    Show-Help
    exit 1
}

$mode  = if ($d) { 'download' } else { 'search' }
$query = if ($d) { $d } else { $s }
$query = $query.Trim()
if (-not $query) {
    Write-Err '错误：包名不能为空。'
    exit 1
}
if (-not $OutDir) { $OutDir = (Get-Location).Path }

# -Exclude 兼容 -Exclude 'a','b' 与 -Exclude "a,b"
if ($Exclude) {
    $tmpEx = New-Object System.Collections.ArrayList
    foreach ($e in $Exclude) {
        foreach ($piece in ($e -split ',')) {
            $v = $piece.Trim().Trim("'").Trim('"').Trim()
            if ($v) { [void]$tmpEx.Add($v) }
        }
    }
    $Exclude = $tmpEx.ToArray()
}

$Mirror = $Mirror.TrimEnd('/')

# 解析仓库列表：-Repo base,updates / -Repo 'base updates' / 完整 URL 均可
$repoList = New-Object System.Collections.ArrayList
foreach ($item in ($Repo -join ' ')) {
    foreach ($r in (($item -split '[,\s]+') | Where-Object { $_ })) {
        if ($r -match '^https?://') {
            $base = $r.TrimEnd('/')
            $sha  = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($base))
            $tag  = (-join ($sha[0..3] | ForEach-Object { $_.ToString('x2') }))
            [void]$repoList.Add([pscustomobject]@{ Name = "url-$tag"; Base = $base })
        }
        elseif ($script:RepoTemplates.Contains($r)) {
            [void]$repoList.Add([pscustomobject]@{ Name = $r; Base = $Mirror + $script:RepoTemplates[$r] })
        }
        else {
            Write-Err "错误：未知仓库 '$r'。可选：$($script:RepoTemplates.Keys -join ' / ')，或直接给 http(s) URL。"
            exit 1
        }
    }
}
if ($repoList.Count -eq 0) { Write-Err '错误：至少启用一个仓库。'; exit 1 }
$repoOrder = @($repoList | ForEach-Object { $_.Name })

if (-not (Test-Path $script:CacheDir)) { New-Item -ItemType Directory -Path $script:CacheDir -Force | Out-Null }

Write-Host ''
Write-Host "  rpm-centos7 $($script:Ver)  ·  CentOS 7 离线 RPM 依赖解析" -ForegroundColor Cyan
Write-Host ("  模式：{0}   目标：{1}   架构：{2}" -f $(if ($mode -eq 'download') { '下载 (-d)' } else { '搜索 (-s)' }), $query, $Arch) -ForegroundColor Gray
Write-Host ("  仓库：{0}" -f (($repoList | ForEach-Object { $_.Name }) -join ', ')) -ForegroundColor Gray
Write-Host ''

# 1. 载入索引
$allPkgs = New-Object System.Collections.ArrayList
$metas   = New-Object System.Collections.ArrayList
$idx = 0
foreach ($r in $repoList) {
    $idx++
    Write-Host ("  [{0}/{1}] {2}" -f $idx, $repoList.Count, $r.Name) -ForegroundColor White
    try {
        $meta = Get-RepoMeta -Name $r.Name -Base $r.Base
        [void]$metas.Add($meta)

        $gz = Get-CachedFile -Href $meta.PrimaryHref -Base $meta.Base -Size $meta.PrimarySize -Label $meta.Name
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $pkgs = Read-PrimaryIndex -GzPath $gz -Meta $meta -ArchFilter $Arch
        $sw.Stop()

        foreach ($p in $pkgs) { [void]$allPkgs.Add($p) }
        Write-Info ("包数 {0}，解析用时 {1:N1}s" -f $pkgs.Count, $sw.Elapsed.TotalSeconds)
    }
    catch {
        Write-Err ("仓库 {0} 载入失败：{1}" -f $r.Name, $_.Exception.Message)
    }
}

if ($allPkgs.Count -eq 0) {
    Write-Host ''
    Write-Err '没有从任何仓库载入到索引，请检查网络或 -Mirror 参数（如 https://mirrors.aliyun.com）。'
    exit 1
}

Write-Host ''
$swIdx = [Diagnostics.Stopwatch]::StartNew()
$hi = Build-Index -Packages $allPkgs
$swIdx.Stop()
Write-Info ("索引就绪：共 {0} 个软件包，{1} 个被依赖名（建索引 {2:N1}s）" -f `
    $allPkgs.Count, $hi.NeedCount, $swIdx.Elapsed.TotalSeconds)
$ByName = $hi.ByName
$ByProv = $hi.ByProv

# 2. 查找目标包
$hits = $null
if ($ByName.ContainsKey($query)) { $hits = $ByName[$query] }
elseif ($ByName.ContainsKey($query.ToLowerInvariant())) { $hits = $ByName[$query.ToLowerInvariant()] }

if (-not $hits) {
    Write-Host ''
    Write-Err "未找到包：$query"
    $sug = @($ByName.Keys | Where-Object { $_ -like "*$query*" } | Sort-Object | Select-Object -First 20)
    if ($sug.Count -gt 0) {
        Write-Host ''
        Write-Warn "名称相近的包（最多 20 个）："
        foreach ($x in $sug) { Write-Host "    $x" }
    }
    if ($query -notmatch '^(base|centos|epel|glibc)') {
        Write-Host ''
        Write-Warn '提示：许多运维工具（nethogs / iftop / htop / jq ...）只存在于 EPEL，'
        Write-Warn '      请确认 -Repo 包含 epel（默认已含），或该包在 CentOS 7 中确实不存在。'
    }
    exit 2
}

$top = Select-BestPackage -Candidates $hits -Arch $Arch -RepoOrder $repoOrder
Write-Host ''
Write-Host ("  目标包：{0}-{1}-{2}.{3}   {4}   [{5}]" -f $top.Name, $top.Ver, $top.Rel, $top.Arch, (Format-Size $top.Size), $top.Repo) -ForegroundColor White
Write-Info ("下载地址：{0}/{1}" -f $top.Base, $top.Href)

# 3. 依赖解析
Write-Host ''
Write-Host '  正在解析依赖树 ...' -ForegroundColor DarkGray
$sw = [Diagnostics.Stopwatch]::StartNew()
$res = Resolve-DependencySet -TopPackage $top -ByName $ByName -ByProv $ByProv `
        -RepoOrder $repoOrder -Arch $Arch -ExcludePatterns $Exclude `
        -UseFileIndex:$FileIndex -RepoMetas $metas
$sw.Stop()

$sel = $res.Selected
$totalSize = 0
foreach ($k in $sel.Keys) { $totalSize += $sel[$k].Pkg.Size }

Write-Host ''
Write-Host ("  依赖清单：{0} 个包，合计 {1}（解析耗时 {2:N2}s）" -f $sel.Count, (Format-Size $totalSize), $sw.Elapsed.TotalSeconds) -ForegroundColor White
Write-Host ''
Show-PackageTable -Selected $sel

if ($sel.Count -gt 30) {
    Write-Host ''
    Write-Host '  提示：清单含 glibc / bash / systemd 等系统基础包，完整 CentOS 7 目标机一般已自带；' -ForegroundColor DarkGray
    Write-Host "        只需增量包时可用 -Exclude 'glibc*','bash','systemd*' 精简。" -ForegroundColor DarkGray
}

if ($res.Ignored.Count -gt 0) {
    Write-Host ''
    Write-Warn ("已忽略 {0} 个不可离线安装的依赖：" -f $res.Ignored.Count)
    $ig = @($res.Ignored | Select-Object -First 12)
    Write-Host ("    " + ($ig -join ', ')) -ForegroundColor DarkGray
}

if ($res.Relaxed.Count -gt 0) {
    Write-Host ''
    Write-Warn ("{0} 个依赖的版本约束无法满足，已按最高可用版本处理：" -f $res.Relaxed.Count)
    Write-Host ("    " + ((@($res.Relaxed) | Select-Object -First 8) -join ', ')) -ForegroundColor DarkGray
}

if ($res.Missing.Count -gt 0) {
    Write-Host ''
    Write-Warn ("警告：{0} 个依赖在已启用仓库中找不到（或版本约束无法满足）：" -f $res.Missing.Count)
    foreach ($m in @($res.Missing | Select-Object -First 30)) { Write-Host "    $m" -ForegroundColor Yellow }
    Write-Host ''
    Write-Warn '建议：扩展仓库（-Repo base,updates,extras,epel），或加 -FileIndex 精确匹配文件路径依赖。'
}

# 4. 搜索模式到此结束
if ($mode -eq 'search') {
    Write-Host ''
    Write-Host ("  下载命令： .\rpm-centos7.ps1 -d {0}" -f $top.Name) -ForegroundColor Cyan
    Write-Host ''
    exit 0
}

# 5. 下载模式
$targetDir = Join-Path $OutDir $top.Name
Write-Host ''
Write-Host ("  开始下载 → {0}" -f $targetDir) -ForegroundColor White
Write-Host ''

try {
    $st = Start-DownloadSet -Selected $sel -Dir $targetDir -ForceRefetch:$Force
}
catch {
    Write-Err ("下载过程出错：{0}" -f $_.Exception.Message)
    exit 3
}

$install = $null
if ($st.Ok -gt 0 -or $st.Skip -gt 0) {
    # 安装脚本生成失败不影响已下载的 rpm
    try { $install = New-InstallScript -Dir $st.Dir -PkgName $top.Name }
    catch { Write-Verbose "install.sh 生成失败：$($_.Exception.Message)" }
}

$dirSum = 0
try {
    $sum = (Get-ChildItem -Path $st.Dir -Filter *.rpm -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if ($sum) { $dirSum = [long]$sum }
} catch { Write-Verbose "目录统计失败：$($_.Exception.Message)" }   # 按 0 处理，不影响结果

Write-Host ''
Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host ("  完成：成功 {0}，已存在 {1}，失败 {2}，共 {3} 个包" -f $st.Ok, $st.Skip, $st.Fail, $st.Total) -ForegroundColor White
Write-Host ("  本次下载 {0}，目录总大小 {1}" -f (Format-Size $st.Bytes), (Format-Size $dirSum)) -ForegroundColor White
Write-Host ("  保存位置：{0}" -f $st.Dir)

if ($st.Fail -gt 0) {
    Write-Host ''
    Write-Warn ("{0} 个包下载失败：" -f $st.Fail)
    foreach ($f in $st.Failed) { Write-Host "    $f" -ForegroundColor Red }
    Write-Warn '可加 -Force 重试，或换 -Mirror 镜像。'
}

if ($install) {
    Write-Host ''
    Write-Host ("  已生成安装脚本：{0}" -f $install) -ForegroundColor Green
}

$leafDir = Split-Path $st.Dir -Leaf
Write-Host ''
Write-Host '  把整个目录拷到 CentOS 7 目标机后，任选一种安装：' -ForegroundColor White
Write-Host "    cd $leafDir && chmod +x install.sh && ./install.sh"
Write-Host "    cd $leafDir && sudo yum -y --disablerepo='*' localinstall ./*.rpm"
Write-Host "    cd $leafDir && sudo rpm -Uvh --replacepkgs ./*.rpm"
Write-Host ''

if ($st.Fail -gt 0) { exit 3 }
exit 0
