dsh-mcp-manager

> dsh Web GUI 的 MCP 管理面板插件：输入栏下方一键查看当前运行的 MCP 服务器，设置页查看 MCP 配置文件信息与可用的配置格式。

## 功能

- **输入栏底部 MCP 按钮**（`conversation.composer.dock`）：灰点/绿点 + 数量徽标，点开列出当前正在运行的 MCP 服务器（按工具注册表里真实的 `mcp__<serverName>__<toolName>` 工具聚合：服务器名、工具数、工具名样例），支持手动刷新。
- **设置 → MCP 服务页**（`settings.section`）：
  - 当前运行的 MCP 服务器清单；
  - 配置文件信息：自动扫描部署 cordis 文件（`$DSH_HOME/cordis.patch.yml` 与 `$DSH_HOME/profiles/<name>/cordis.yml`、`cordis.patch.yml`），逐行展示解析出的 mcp-client 配置（id / serverName / transport / command / url / 是否禁用）；
  - 可用的 MCP 配置文件格式全文，一键把示例写入 `$DSH_HOME/mcp.example.yml`。

运行时状态直接读取 dsh 工具注册表，配置扫描基于部署真实文件，插件自身不维护持久化状态。

## 安装

前提：已安装 dsh（CLI 内置 `@deepseek-ai/dsh-mcp-client` 作为补丁层依赖），并有 web 配置。

```sh
# npm 发布后
dsh plugin --profile web add @linxin666/dsh-mcp-manager

# 或从 GitHub 安装
dsh plugin --profile web add github:ALFFL1ST/dsh-mcp-manager

# 或本地源码安装
dsh plugin --profile web add link:E:/path/to/dsh-mcp-manager
```

安装后刷新 Web 页面即可：输入栏下方出现「MCP」按钮，设置面板出现「MCP 服务」页。

> 两个界面注册在 shell 的 `conversation.composer.dock` 与 `settings.section` 槽位，需要较新版本的 dsh Web 应用。

## 使用

- 点击输入栏下方「● MCP」展开/收起运行中服务器面板；绿点 + 数字表示有服务器在跑。
- 「设置 → MCP 服务」查看运行状态、配置文件解析结果与示例格式，可一键生成 `$DSH_HOME/mcp.example.yml`。
- 在 `cordis.patch.yml`（或 `cordis.yml`）中按示例添加 mcp-client 行后触发热更新，面板即可看到新服务器与其 `mcp__<server>__<tool>` 工具。

## MCP 配置格式

每个 MCP 服务器对应一行 `@deepseek-ai/dsh-mcp-client` 插件：

```yaml
- id: mcp-filesystem
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: filesystem   # 工具命名空间，部署内唯一，[A-Za-z0-9_-]{1,32}
    transport: stdio         # 本地子进程 stdio 传输
    command: npx
    args: ['-y', '@modelcontextprotocol/server-filesystem', 'D:\data']
    env:
      SOME_TOKEN: !!js process.env.SOME_TOKEN   # 用 !!js 从环境变量注入密钥

- id: mcp-web
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: web
    transport: streamable-http   # 远程 HTTP(S) 传输
    url: http://127.0.0.1:8080/mcp
    headers:
      Authorization: !!js '`Bearer ${process.env.MCP_TOKEN}`'
```

| 字段  | 传输  | 必填  | 说明  |
| --- | --- | --- | --- |
| `transport` | 两者  | 是   | `stdio` 或 `streamable-http` |
| `serverName` | 两者  | 是   | 工具命名空间，模型工具名形如 `mcp__<serverName>__<toolName>` |
| `command` / `args` / `env` / `cwd` | stdio | command 必填 | 子进程启动参数 |
| `url` / `headers` | http | url 必填 | 服务器端点与附加请求头（如鉴权 token） |
| `toolCallTimeoutMs` | 两者  | 否   | 单次工具调用超时（默认 60000） |
| `failOnStartupError` | 两者  | 否   | 初始连接失败时拒绝插件激活（默认 false） |
| `reconnect.*` | 两者  | 否   | 断线自动重连策略（默认启用） |

## API

| 方法  | 路径  | 说明  |
| --- | --- | --- |
| GET | `/api/dsh-mcp-manager/status` | 运行中服务器 + 配置文件扫描结果 + 示例格式 |
| POST | `/api/dsh-mcp-manager/example` | 把示例写入 `$DSH_HOME/mcp.example.yml` |

两条路由仅接受回环请求（127.0.0.1 / localhost + 浏览器同源标记）。

## License

[Apache-2.0](LICENSE)
