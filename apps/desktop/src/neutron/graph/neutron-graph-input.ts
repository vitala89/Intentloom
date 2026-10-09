import type { NeutronTaskNode } from "@intentloom/protocol";

export function neutronDesktopGraphNodes(prompt: string): NeutronTaskNode[] {
  return [
    {
      taskId: "task-a",
      parentId: null,
      dependencies: [],
      role: "context-scout",
      requiredCapabilities: ["inspect"],
      state: "ready",
      expectedOutput: prompt,
    },
  ];
}
