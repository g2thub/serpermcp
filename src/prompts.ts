export interface PromptSpec {
  name: string;
  title: string;
  description: string;
  args: Array<{ name: string; description: string; required: boolean }>;
  render: (args: Record<string, string | undefined>) => string;
}

function list(value: string | undefined): string {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items.join("、") : "";
}

export const PROMPTS: PromptSpec[] = [
  {
    name: "research-topic",
    title: "研究一个主题",
    description: "给出检索步骤，让模型用 google_search 和 scrape 把一个主题查清楚。",
    args: [
      { name: "topic", description: "要研究的主题", required: true },
      { name: "depth", description: "basic 或 detailed，默认 basic", required: false },
      { name: "focus_areas", description: "逗号分隔的关注点", required: false },
    ],
    render: ({ topic = "", depth, focus_areas }) => {
      const focus = list(focus_areas);
      const detailed = depth === "detailed";
      return [
        `研究「${topic}」。先用 google_search 找来源，再用 scrape 打开最有用的几页。`,
        focus ? `优先覆盖：${focus}。` : "",
        detailed ? "展开机制、分歧和证据，不要停在定义。" : "先给能站住的概览和关键事实。",
        "按这五块写：概览、要点、证据来源、不同说法、结论。每条关键结论旁边写上来源标题。",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    name: "compare-sources",
    title: "对照多个来源",
    description: "让模型对同一问题比较多份网页，而不是只摘第一页。",
    args: [
      { name: "topic", description: "要对照的问题", required: true },
      { name: "min_sources", description: "至少比较几份来源，默认 3", required: false },
    ],
    render: ({ topic = "", min_sources }) => {
      const count = Number(min_sources);
      const minimum = Number.isInteger(count) && count > 0 ? count : 3;
      return [
        `围绕「${topic}」至少比较 ${minimum} 个独立来源。`,
        "用 google_search 找候选，用 scrape 读原文，不要只靠摘要。",
        "分开写：一致的地方、互相矛盾的地方、来源本身是否靠得住、综合之后能说什么。",
      ].join("\n");
    },
  },
  {
    name: "fact-check",
    title: "核对一句话",
    description: "让模型用检索和原文核对一条具体说法。",
    args: [
      { name: "claim", description: "要核对的说法", required: true },
      { name: "thoroughness", description: "quick 或 thorough，默认 quick", required: false },
    ],
    render: ({ claim = "", thoroughness }) => {
      const thorough = thoroughness === "thorough";
      return [
        `核对这句话：「${claim}」`,
        thorough
          ? "多找几份一手或权威来源，用 scrape 读原文再下判断。"
          : "先用 google_search 找直接证据，必要时 scrape 打开最相关的一页。",
        "给出：是否成立、支持它的证据、反证、还缺什么、最后一句话判断。",
      ].join("\n");
    },
  },
  {
    name: "technical-search",
    title: "查技术资料",
    description: "让模型按技术栈去搜文档、示例和已知问题。",
    args: [
      { name: "query", description: "技术问题", required: true },
      { name: "tech_stack", description: "逗号分隔的技术栈", required: false },
      { name: "content_type", description: "docs、tutorials 或 issues；省略表示不限", required: false },
    ],
    render: ({ query = "", tech_stack, content_type }) => {
      const stack = list(tech_stack);
      const kind = content_type && content_type !== "all" ? content_type : "";
      return [
        `查这个技术问题：${query}`,
        stack ? `限定在：${stack}。` : "",
        kind ? `优先找 ${kind}。` : "",
        "可以加 site、filetype、intitle 缩小范围。",
        "结果分成：推荐做法、能抄的例子、常见坑、文档入口、社区里的补充。",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
];
