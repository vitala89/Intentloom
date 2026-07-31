import type { DesktopCommandContribution } from "@intentloom/protocol";
import type { CommandOption } from "./CommandPaletteModal.js";

export type CommandHandler = () => void | Promise<void>;

export interface RegisteredCommand {
  readonly declaration: DesktopCommandContribution;
  readonly handler: CommandHandler;
}

export class DesktopCommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();

  public register(
    declaration: DesktopCommandContribution,
    handler: CommandHandler,
  ): () => void {
    this.commands.set(declaration.id, { declaration, handler });
    return () => {
      this.commands.delete(declaration.id);
    };
  }

  public get(id: string): RegisteredCommand | undefined {
    return this.commands.get(id);
  }

  public async execute(id: string): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) return false;
    await cmd.handler();
    return true;
  }

  public toCommandOptions(): readonly CommandOption[] {
    const options: CommandOption[] = [];
    for (const [id, cmd] of this.commands.entries()) {
      options.push({
        id,
        label: cmd.declaration.title,
        category: cmd.declaration.category,
        ...(cmd.declaration.shortcut
          ? { shortcut: cmd.declaration.shortcut }
          : {}),
        icon: "⌘",
        action: () => {
          void cmd.handler();
        },
      });
    }
    return options;
  }
}

export const globalCommandRegistry = new DesktopCommandRegistry();
