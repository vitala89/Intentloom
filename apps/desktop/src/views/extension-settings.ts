export type SettingValue = boolean | number | string;

export interface ExtensionSettingProperty {
  readonly type: "boolean" | "number" | "string";
  readonly title: string;
  readonly default: SettingValue;
}

export interface ExtensionSettingsSection {
  readonly id: string;
  readonly title: string;
  readonly properties: Record<string, ExtensionSettingProperty>;
}

export class ExtensionSettingsStore {
  private readonly sections = new Map<string, ExtensionSettingsSection>();
  private readonly values = new Map<string, SettingValue>();

  public registerSection(section: ExtensionSettingsSection): () => void {
    this.sections.set(section.id, section);
    for (const [key, prop] of Object.entries(section.properties)) {
      const storageKey = `${section.id}:${key}`;
      if (!this.values.has(storageKey)) {
        this.values.set(storageKey, prop.default);
      }
    }
    return () => {
      this.sections.delete(section.id);
    };
  }

  public get(sectionId: string, key: string): SettingValue | undefined {
    return this.values.get(`${sectionId}:${key}`);
  }

  public set(sectionId: string, key: string, value: SettingValue): boolean {
    const section = this.sections.get(sectionId);
    if (!section) return false;
    const prop = section.properties[key];
    if (!prop) return false;
    if (typeof value !== prop.type) return false;
    this.values.set(`${sectionId}:${key}`, value);
    return true;
  }

  public getSection(id: string): ExtensionSettingsSection | undefined {
    return this.sections.get(id);
  }
}

export const globalExtensionSettingsStore = new ExtensionSettingsStore();
