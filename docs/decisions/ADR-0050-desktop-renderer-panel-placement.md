# ADR-0050: Desktop Renderer Contribution & Extension Panel Placement Spec

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Layout Architect, Security Board

---

## Context

The Intentloom Desktop Application requires support for custom side panels (`kind: "panel"`) and custom evidence/resource renderers (`kind: "renderer"`). Extension side panels should be hostable in declared desktop layout regions (e.g. `sidebar-bottom`, `inspector-panel`, `bottom-dock`) and custom renderers should handle specific media or diagnostic finding schemas without compromising layout integrity or UI responsiveness.

---

## Decision

We establish **Desktop Renderer Contribution & Extension Panel Placement**:

1. **Panel Contribution & Placement (`kind: "panel"`)**:
   - `id`: Unique panel identifier (e.g. `panel.git-status`).
   - `title`: Panel header title.
   - `region`: Declared desktop layout region (`"sidebar-bottom"` | `"inspector"` | `"dock"`).
   - `defaultExpanded`: Boolean initial expansion state.

2. **Custom Renderer Contribution (`kind: "renderer"`)**:
   - `id`: Unique renderer identifier (e.g. `renderer.diagram-mermaid`).
   - `resourceType`: Target MIME/schema type (e.g. `application/vnd.intentloom.diagram+json`).
   - `title`: Human-readable renderer description.

3. **Runtime Panel Registry (`apps/desktop/src/views/panel-registry.ts`)**:
   - `DesktopPanelRegistry` manages declared extension panels by layout region and handles dynamic panel mounting and unmounting.

---

## Consequences

- Third-party extensions can contribute custom side panels and resource renderers safely inside host layout bounds.
- UI layout stability and local-first invariants remain 100% guaranteed.
