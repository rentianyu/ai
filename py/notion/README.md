# notion — Notion 页面 / 块 读写 CLI

把 Notion 当 Markdown 仓库用：

- 读：整页树递归导出成 `.md`（可打包 zip），或一次请求拿整页增强 Markdown
- 写：把本地 `.md` 转成 Notion 块追加 / 覆盖，逐块改文本、删块、新建子页
- 查：搜索页面与数据库、看子块原始 JSON

纯标准库，零依赖。

## 准备（两步，缺一步就会 404）

1. **建 Integration 拿 Token**
   打开 <https://www.notion.so/my-integrations> → New integration → 复制 Internal Integration Secret（`ntn_…` / `secret_…`）。

2. **把 Integration 连接到你操作的目标页面**
   打开目标页 → 右上角 `···` → `Connections` / `连接` → 选择刚建的 Integration。
   **没做这一步，API 会对所有请求返回 404 / 无权限**——这是最常见的新手坑。

3. 提供 Token（任选一种，脚本按顺序查找）

   | 方式 | 写法 |
   |---|---|
   | 环境变量 | `export NOTION_TOKEN=secret_xxx` |
   | 指定配置文件 | `export NOTION_CONFIG=/path/to/config.json` |
   | 默认配置 | `~/.config/notion-cli/config.json` |
   | 兼容旧位置 | 脚本上一级目录的 `config.json` |

   `config.json` 内容：

   ```json
   {"token": "secret_xxx", "api_version": "2026-03-11"}
   ```

   可选环境变量 `NOTION_VERSION` 覆盖请求头 `Notion-Version`。

## 依赖

```bash
# 无
python3 --version   # 3.8+
```

## 用法

```bash
python3 notion.py                      # 打印帮助
python3 notion.py <subcommand> [args]
```

### 子命令

| 子命令 | 作用 |
|---|---|
| `search <query> [--limit N] [--filter page\|database]` | 搜索页面 / 数据库 |
| `get <id>` | 页面或块的元信息 |
| `read <id> [--json] [--depth N] [--no-recursive]` | 读正文，默认输出 Markdown |
| `children <block_id> [--json]` | 子块原始 JSON |
| `append <block_id> (--text T \| --md FILE \| --stdin)` | 追加内容（Markdown 自动转块） |
| `update-block <block_id> (--text T \| --md FILE)` | 改单个块文本 |
| `delete-block <block_id>` | 删单个块 |
| `create-page --parent <page_id> --title T [--md FILE \| --text T]` | 新建子页面 |
| `update-page <page_id> [--title T] [--md FILE \| --text T] [--in-trash]` | 改标题 / 改正文 / 归档 |
| `archive <page_id>` | 归档（等价 `update-page --in-trash`） |
| `md2blocks <file>` | 本地预览 Markdown 会生成什么块（不调 API） |
| `export-tree <page_id> [--out DIR] [--zip FILE] [--count] [--overwrite]` | 递归导出整页树为 Markdown |
| `markdown <page_id> [--transcript] [--out FILE] [--json]` | 官方增强 Markdown 端点，1 次请求读整页 |

### 示例

```bash
# 先看看要写的内容会变成什么块（纯本地）
python3 notion.py md2blocks ./draft.md

# 读一页为 Markdown
python3 notion.py read 00000000-0000-0000-0000-000000000000

# 把本地 md 追加到某页末尾
python3 notion.py append 00000000-0000-0000-0000-000000000000 --md ./draft.md

# 新建子页
python3 notion.py create-page --parent <page_id> --title "周报 2026-10-25" --md ./weekly.md

# 整棵页面树导出 + 打包
python3 notion.py export-tree 00000000-0000-0000-0000-000000000000 --out ./export --zip ./export.zip

# 改一个块的文字
python3 notion.py update-block <block_id> --text "改后的内容"
```

`export-tree` 的产物结构：

```
export/
├── 根页面.md
└── 根页面/
    ├── 子页面 A.md
    └── 子页面 B.md
```

## Markdown 支持范围

| Markdown | Notion 块 |
|---|---|
| `#` `##` `###` | heading_1 / 2 / 3 |
| `-` `*` `+` | bulleted_list_item |
| `1.` `1)` | numbered_list_item |
| `- [ ]` / `- [x]` | to_do |
| `>` | quote |
| `---` / `***` | divider |
| ```` ```lang ```` | code（语言按常见扩展名映射） |
| 行内 `**粗**` `*斜*` `` `代码` `` `[文字](url)` | 对应 inline annotations |

## 注意

- **append 单次上限 100 块**，脚本会自动分批；大批量写入注意 Notion 的 3 次/秒限流（已内置 429 重试，最多 4 次，按 `Retry-After` 退避）。
- `read` 默认递归子块；页面上块很多时用 `--depth` 限制层数，或改用 `markdown` 端点（1 次请求更快）。
- 归档（`archive` / `--in-trash`）只进回收站，Notion API 目前**无法永久删除**页面，需要在客户端手动清空。
- `search` 不索引 toggle / 折叠块内的文本，按正文关键词搜不到不代表不存在。

## 许可

MIT
