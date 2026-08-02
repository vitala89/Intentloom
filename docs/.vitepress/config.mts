import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Intentloom",
  description:
    "Independent, provider-neutral infrastructure framework for reliable agentic engineering workflows.",
  base: "/Intentloom/",
  cleanUrls: true,
  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: "Overview", link: "/README" },
      { text: "Specs", link: "/specs/AIF_V0_1_SPEC" },
      { text: "Architecture", link: "/architecture/ARCHITECTURE" },
      { text: "ADRs", link: "/decisions/README" },
      { text: "Governance", link: "/governance/CODE_QUALITY_STANDARDS" },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Overview", link: "/README" },
          { text: "Curated Skills", link: "/guides/CURATED_SKILLS" },
          { text: "Architecture Overview", link: "/architecture/ARCHITECTURE" },
          {
            text: "System Boundaries",
            link: "/architecture/SYSTEM_BOUNDARIES",
          },
        ],
      },
      {
        text: "Specifications",
        items: [
          { text: "AIF v0.1 Core Spec", link: "/specs/AIF_V0_1_SPEC" },
          {
            text: "Evidence & Connection v0.2",
            link: "/specs/CONNECTED_PROJECT_AND_EVIDENCE_V0_2_SPEC",
          },
          {
            text: "Managed Extension Lifecycle v0.3",
            link: "/specs/MANAGED_EXTENSION_LIFECYCLE_V0_3_SPEC",
          },
          {
            text: "Curated Skill Routing",
            link: "/specs/CURATED_SKILL_ROUTING_SPEC",
          },
          {
            text: "Agentic Harness",
            link: "/specs/AGENTIC_HARNESS_SPEC",
          },
        ],
      },
      {
        text: "Architecture Decisions",
        items: [{ text: "ADR Index", link: "/decisions/README" }],
      },
      {
        text: "Governance & Security",
        items: [
          {
            text: "Code Quality Standards",
            link: "/governance/CODE_QUALITY_STANDARDS",
          },
          {
            text: "Engineering Principles",
            link: "/governance/ENGINEERING_PRINCIPLES",
          },
          {
            text: "Memory & Security Roadmap",
            link: "/roadmap/MEMORY_AND_SECURITY_ROADMAP",
          },
          {
            text: "Agentic Harness Plan",
            link: "/roadmap/AGENTIC_HARNESS_PLAN",
          },
          {
            text: "Agentic Harness Sources",
            link: "/reference/AGENTIC_HARNESS_SOURCES",
          },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vitala89/Intentloom" },
    ],
  },
});
