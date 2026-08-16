dsh-mcp-manager
dsh Web GUI 的 MCP 管理面板插件：输入栏下方一键查看当前运行的 MCP 服务器，设置页面查看 MCP 配置文件信息和可用的配置格式。

功能
输入底部栏MCP按钮（conversation.composer.dock）：灰点/绿点 + 数量组成，点开启动当前正在运行的MCP服务器（按工具里真实的mcp__<serverName>__<toolName>工具聚合服务器名、工具数、工具名样例），支持手动刷新。
设置 → MCP 服务页面（settings.section）：
当前运行的MCP服务清单；
配置文件信息：自动扫描配置cordis文件（$DSH_HOME/cordis.patch.yml与$DSH_HOME/profiles/<name>/cordis.yml、cordis.patch.yml），逐行显示解析出的mcp-client配置（id / serverName / Transport / command / url / 是否禁用）；
可用的MCP配置文件格式全文，一键把样本写入$DSH_HOME/mcp.example.yml。
运行时状态直接读取 dsh 工具读取，配置扫描基于配置真实文件，插件本身不维护持久化状态。

安装
前提：已安装 dsh（CLI 内置@deepseek-ai/dsh-mcp-client组件层依赖），并有 web 配置。

# npm 发布后
dsh plugin --profile web add @linxin666/dsh-mcp-manager

# 或从 GitHub 安装
dsh plugin --profile web add github:ALFFL1ST/dsh-mcp-manager

# 或本地源码安装
dsh plugin --profile web add link:E:/path/to/dsh-mcp-manager
安装后刷新网页即可：输入栏下方出现「MCP」按钮，设置面板出现「MCP 服务」页面。

界面注册在 shell 的conversation.composer.dock和两个settings.section位置，需要较新版本的 dsh Web 应用。

使用
点击输入栏下方「● MCP」展开/收起运行服务器面板；绿点+数字表示有服务器正在运行。
「设置 → MCP 服务」查看运行状态、配置文件解析结果与示例格式，可一键生成$DSH_HOME/mcp.example.yml。
在cordis.patch.yml（或cordis.yml）中按示例添加 mcp-client 行后触发热更新，面板即可看到新服务器和mcp__<server>__<tool>工具。
MCP配置格式
每个 MCP 服务器对应一行@deepseek-ai/dsh-mcp-client插件：

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
字段	传输性	必填	说明
transport	两者	是	stdio或streamable-http
serverName	两者	是	工具命名空间，模型工具名形如mcp__<serverName>__<toolName>
command//args​env​cwd	标准排版	命令必填	子进程启动参数
url/headers	http	网址必填	服务器端点与附加请求头（如鉴权token）
toolCallTimeoutMs	两者	否	单次工具调用超时（默认 60000）
failOnStartupError	两者	否	初始连接失败时拒绝插件激活（默认 false）
reconnect.*	两者	否	断线自动重连策略（默认启用）
API
方法	路径	说明
得到	/api/dsh-mcp-manager/status	运行中服务器 + 配置文件扫描结果 + 示例格式
邮政	/api/dsh-mcp-manager/example	把原文写成$DSH_HOME/mcp.example.yml
拒绝路由仅接受回环请求（127.0.0.1 / localhost + 浏览器同源标记）。

执照
Apache-2.0
