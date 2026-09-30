# serpermcp

本地 stdio MCP。用你自己的 Serper API key 做两件事：搜 Google，抓一个网页。

查询和要抓的 URL 会发给 Serper，密钥只放在发往 `google.serper.dev` 和 `scrape.serper.dev` 的 `X-API-KEY` 头里。

## 工具

- `google_search`：搜索。返回 Serper 的 JSON（organic、knowledge graph、people also ask、related searches）。
- `scrape`：抓一个 `http` 或 `https` 页面，返回正文、可选 markdown、head metadata、JSON-LD。抓取发生在 Serper 那边。

`site`、`filetype`、`inurl`、`intitle`、`related`、`cache`、`before`、`after`、`exact`、`exclude`、`or` 会先编成一条 `q`，再和 `gl`、`hl`、`location`、`num`、`page`、`autocorrect`、`tbs` 一起提交。运算符不会当成额外 JSON 字段再送一遍。

`gl` 和 `hl` 可以不填。

提示词：`research-topic`、`compare-sources`、`fact-check`、`technical-search`。它们只生成检索说明，真正发请求的是上面两个工具。

## 安装

Node.js 18 或更新。不用克隆仓库，MCP 客户端配置写成：

```json
{
  "mcpServers": {
    "serpermcp": {
      "command": "npx",
      "args": ["-y", "github:g2thub/serpermcp"],
      "env": {
        "SERPER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

`npx` 会从 GitHub 拉下来并编译。密钥放在配置的 `env` 里，这个进程不读 `.env`。

本地改代码时：

```bash
cd ~/Desktop/serpermcp
npm install
npm test
```

`npm test` 会编译，并用一个假密钥走一遍 stdio 握手。它不会访问 Serper。开发时也可以把上面的 `command` 换成 `node`，`args` 换成这个仓库里的 `dist/index.js`。

每次搜索和抓取都会计入 Serper 额度。需要确认再调用时，不要把这两个工具设成自动批准。
