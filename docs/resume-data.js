// Resume data for the client-side tailored-resume generator.
// Companies and dates are FIXED; only job titles are rewritten to match a keyword.
window.RESUME_DATA = {
  name: "Corderio Vonner",
  contact: "Corderio.Vonner@outlook.com  |  linkedin.com/in/corderiovonner  |  github.com/vonnerco",
  summary:
    "Principal AI Agentic Engineer with 8+ years security/DevSecOps, with the last 2+ years focused on Agentic AI, LLM systems built with LangChain, LangGraph, and Model Context Protocol (MCP). Built Cox's Agentic AI Center of Excellence; design and orchestrate multi-agent systems\u2014tool/function calling, agent identity and least privilege, RAG, agent handoffs, and human-in-the-loop control\u2014across Claude, Gemini, GPT, Meta Llama, Mistral, DeepSeek, Grok, and Azure OpenAI on AKS.",
  skills: [
    { label: "Agentic & Multi-Agent AI", value: "LangChain, LangGraph, Model Context Protocol (MCP) Servers/Clients, Tool & Function Calling, Supervisor/Hierarchical/Swarm Orchestration, Agent Handoff, Human-in-the-Loop, Agent2Agent (A2A)" },
    { label: "GenAI & LLM Engineering", value: "RAG, Prompt Engineering, Fine-Tuning & PEFT, Embeddings & Vector Search, Reranking, LangSmith, LangServe, LLM Evaluation (Evals), Structured Outputs, Memory" },
    { label: "Models & Platforms", value: "OpenAI GPT & Azure OpenAI, Anthropic Claude, Google Gemini, Meta Llama, Mistral, DeepSeek, Grok, Hugging Face, Amazon Bedrock" },
    { label: "Guardrails, Safety & Red Teaming", value: "NeMo Guardrails, LlamaGuard, OWASP LLM Top 10, MITRE ATLAS, Prompt Injection & Jailbreak Defense, Tool-Poisoning Defense, AI Red Teaming, Adversarial ML Testing" },
    { label: "AI Governance & Compliance", value: "NIST AI RMF, ISO/IEC 42001, EU AI Act, Model Risk Management, SOC 2, NIST CSF, Zero Trust & NHI Governance" },
    { label: "Cloud, MLOps & Data", value: "AWS, Azure, GCP, AKS/GKE/EKS, Docker, Kubernetes, Terraform, CI/CD, Python, TypeScript, FastAPI, Spark, Snowflake, BigQuery, Vector Databases" },
    { label: "SecOps, Detection & Identity", value: "Microsoft Sentinel, Splunk, Palo Alto Cortex XSOAR, CrowdStrike Falcon, Microsoft Defender for Endpoint, Okta, Entra ID, Threat Hunting, Incident Response" }
  ],
  experience: [
    {
      company: "Cox Enterprises", location: "Atlanta, GA",
      title: "Principal AI Agentic Engineer", dates: "06/2025 \u2013 Present",
      bullets: [
        "Lead the design of Cox's enterprise multi-agent AI platform on LangChain, LangGraph, and MCP, orchestrating supervisor, hierarchical, and swarm agent topologies across Cox Automotive, Cox Communications, and Cox Media Group.",
        "Deliver multi-agent AI assistants (tool calling, RAG, memory) across Cox business units and Cox-owned brands including Kelley Blue Book and Autotrader, automating high-volume workflows.",
        "Architect stateful multi-agent workflows in LangGraph (durable state, checkpointing, interrupts, human-in-the-loop approval) for long-running, production-grade agents.",
        "Standardize MCP server/client architecture (JSON-RPC 2.0, OAuth 2.1) to expose databases, APIs, and internal tools to agents through a governed, reusable, auditable tool layer.",
        "Govern a shared MCP tool catalog and multi-agent registry, enforcing versioning, access control, and safe reuse across teams.",
        "Deliver multi-agent RAG pipelines with hybrid retrieval, reranking, and vector stores, using LangSmith tracing and evals to raise answer quality and cut hallucination.",
        "Ship agentic AI to production across Claude, Gemini, GPT, Meta Llama, Mistral, DeepSeek, Grok, and Azure OpenAI on AKS, tuning latency, cost, and autoscaling for millions of daily inference calls.",
        "Enforce agent identity, least-privilege tool authorization, and non-human identity (NHI) governance to stop unauthorized tool execution and privilege escalation.",
        "Lead agentic AI red-teaming (prompt injection, tool poisoning, jailbreak) and deploy NeMo Guardrails plus LlamaGuard input/output filtering to contain rogue agent behavior.",
        "Operate observability and kill-switch containment to detect agent drift, loops, and unsafe autonomy and halt compromised agents in real time.",
        "Built the Cox Agentic AI Center of Excellence and helped establish the Cox Security Center of Excellence, setting enterprise standards for multi-agent architecture, MCP governance, evals, DevSecOps, IAM, DLP, and incident response.",
        "Delivered the automated SecOps platform protecting 40K+ employees, processing 1.8M+ daily security events across 40,000+ endpoints at sub-second latency, driving $12M+ in annual risk-reduction savings.",
        "Modernized the agent runtime to LangChain/LangGraph 1.0 (create_agent plus middleware) to standardize agent behavior and retire legacy chains."
      ]
    },
    {
      company: "Cox Enterprises", location: "Atlanta, GA",
      title: "AI Agentic Engineer", dates: "10/2024 \u2013 05/2025",
      bullets: [
        "Built production agentic AI systems with LangChain and LangGraph, wiring LLM reasoning loops to enterprise tools through function calling.",
        "Implemented MCP servers to standardize tool and data access for agents, adding schema validation, auth, and tool-poisoning defenses after MCP's public release (Nov 2024).",
        "Designed multi-agent RAG architectures with retrieval, memory, and agent handoff for customer-facing and internal workflows.",
        "Built tool/function-call authorization and per-agent least-privilege scopes to constrain agent actions.",
        "Instrumented LangSmith tracing and evals to measure agent reliability and catch regressions.",
        "Hardened agentic cloud architectures across AWS, Azure, and GCP with Zero Trust, segmentation, and private networking (VPC/PrivateLink)."
      ]
    },
    {
      company: "Cox Enterprises", location: "Atlanta, GA",
      title: "AI Engineer (GenAI)", dates: "01/2024 \u2013 09/2024",
      bullets: [
        "Built GenAI applications with LangChain and LangGraph spanning RAG assistants, summarization, and document Q&A.",
        "Built RAG pipelines over Postgres, Snowflake, and vector stores with embeddings and retrieval tuning.",
        "Pioneered GenAI security baselines across AWS, Azure, and GCP, setting org-wide AI threat-defense and compliance standards.",
        "Integrated DevSecOps gates and SAST/DAST into the AI SDLC to remediate GenAI application vulnerabilities pre-deployment.",
        "Delivered GenAI solutions across Cox Automotive brands including Kelley Blue Book, Autotrader, and Manheim."
      ]
    },
    {
      company: "Cox Enterprises", location: "Atlanta, GA",
      title: "Cloud AI Engineer (GenAI)", dates: "01/2023 \u2013 12/2023",
      bullets: [
        "Built LLM applications with LangChain and Azure/OpenAI models, including RAG document ingestion and semantic search across knowledge bases.",
        "Engineered secure LLM document-ingestion workflows with Data Loss Prevention (DLP), PII redaction, and end-to-end payload encryption.",
        "Embedded OWASP Top 10 defenses and input validation across Python and Node.js AI services.",
        "Hardened multi-cloud AI infrastructure on AWS and Azure with PrivateLink, key rotation, and mTLS."
      ]
    },
    {
      company: "Cox Enterprises", location: "Atlanta, GA",
      title: "AI Infrastructure & Network Engineer", dates: "05/2022 \u2013 12/2022",
      bullets: [
        "Architected secure AI/ML network gateways and private endpoints (Azure PrivateLink), isolating model traffic from the public internet.",
        "Designed micro-segmented AI network architectures with Next-Generation Firewalls (NGFW) and egress filtering to prevent exfiltration and lateral movement.",
        "Evaluated emerging LLM orchestration frameworks for secure AI service routing and prompt-to-endpoint pipelines."
      ]
    },
    {
      company: "Flexport", location: "Atlanta, GA",
      title: "Senior DevSecOps Engineer", dates: "10/2019 \u2013 05/2022",
      bullets: [
        "Architected secure CI/CD and infrastructure-as-code in Terraform & Kubernetes with automated SAST/DAST, secret scanning, and policy-as-code gates.",
        "Enforced least-privilege IAM, RBAC, and secrets management across GCP (Composer, Pub/Sub, Dataflow) to secure real-time ETL/ML pipelines.",
        "Hardened a governed GCP lakehouse (BigQuery, Dataplex) with DLP, encryption, and access controls, delivering secure AI/ML-ready analytics to 200 stakeholders."
      ]
    },
    {
      company: "Hapag Lloyd", location: "Peachtree Corners, GA",
      title: "DevSecOps Engineer", dates: "01/2018 \u2013 10/2019",
      bullets: [
        "Built hardened CI/CD pipelines with automated security scanning, secrets management, and least-privilege access controls.",
        "Automated secure infrastructure-as-code (Terraform, Kubernetes) with policy enforcement and monitoring for terminal and yard systems.",
        "Secured containerized microservices (Express, FastAPI) with API gateway hardening, mTLS, and runtime protection, cutting truck turn times 25%."
      ]
    }
  ]
};
