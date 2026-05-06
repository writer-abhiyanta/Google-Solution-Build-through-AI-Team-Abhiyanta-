# Wireframe: Neutral-IQ Decision Engine

This document provides a structural layout and wireframe representation of the Neutral-IQ Decision Engine.

## Application Structure overview

The application is distributed into two primary states depending on the authentication:
1. **Unauthenticated:** A login/onboarding screen where the user resolves their identity.
2. **Authenticated:** Main application featuring a dynamic sidebar, top-bar, main workspace for prompts, and result dashboard.

---

## 1. Authentication / Onboarding Screen

The user is presented with a sleek, tech-focused dark mode card structure, ensuring identity synchronization before allowing them to query the decision engine.

```text
+-----------------------------------------------------------------------------+
|                                                                             |
|                                                                             |
|                                +-----------------------------------+        |
|                                |         [Sparkle Icon]            |        |
|                                |                                   |        |
|                                |  Initiate Synchronization         |        |
|   +-------------------+        |  Complete Onboarding              |        |
|   |                   |        |                                   |        |
|   |  Feature Toggles  |        |  [ ] Login with Google as Student |        |
|   |   & Information   |        |  [ ] Login with Google as Employee|        |
|   |                   |        |                                   |        |
|   +-------------------+        |  ------ or ------                 |        |
|                                |                                   |        |
|                                |  [ ] Continue as Neutral          |        |
|                                |                                   |        |
|                                |  End-To-End Decision Integrity    |        |
|                                +-----------------------------------+        |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. Main Dashboard Layout

When the user logs in, they are directed to the main application interface, consisting of a sticky left sidebar and a wide workspace.

### Wireframe Representation

```text
+------------------------+-------------------------------------------------------+
| SIDEBAR (Left)         | WORKSPACE / DASHBOARD (Right)                         |
|------------------------|-------------------------------------------------------|
| [Brain] Neutral-IQ     | [Menu/X]  [Search History...]   [Status] [UserAvatar] |
|                        |-------------------------------------------------------|
| Marketplace (Agents)   |                                                       |
| - [Scale] Lex          |  +-------------------------------------------------+  |
| - [Activity] Data      |  | Decision Input Area                             |  |
| - [Layers] Architect   |  | > "Enter query for decision analysis..."        |  |
| - [Target] Visionary   |  |                                                 |  |
| - [Users] Diplomat     |  | Intuition Override: [------O-----------] 50%    |  |
|                        |  | [x] Detect Biases                               |  |
| - [History] Storage    |  | [ ANALYZE STRATEGY ]                            |  |
|                        |  +-------------------------------------------------+  |
|------------------------|                                                       |
| PROFILE                |  +--------------------------+ +--------------------+  |
| [Avatar] Name          |  | Overall Impact  [ 82% ]  | | Breakdown Charts   |  |
| Sync ID: 12345         |  | Consensus: STABLE        | | [===|==|====]      |  |
|                        |  +--------------------------+ +--------------------+  |
| [Logout] Terminate     |                                                       |
|                        |  +-------------------------------------------------+  |
|                        |  | ETHICAL ALIGNMENT (Utilitarianism, etc.)        |  |
|                        |  | [High/Medium/Low] Description + Analysis        |  |
|                        |  +-------------------------------------------------+  |
|                        |                                                       |
|                        |  +-------------------------------------------------+  |
|                        |  | STRATEGIC ROADMAP (Timeline/Steps)              |  |
|                        |  | 1. Immediate Phase (0-3 Months)                 |  |
|                        |  | 2. Integration Phase...                         |  |
|                        |  +-------------------------------------------------+  |
|                        |                                                       |
|                        |  +-------------------------------------------------+  |
|                        |  | XAI TREE (Explainable AI Logic)                 |  |
|                        |  | -> Premise --> Logic --> Conclusion             |  |
|                        |  +-------------------------------------------------+  |
|                        |                                                       |
|                        |  +-------------------------------------------------+  |
|                        |  | FEEDBACK SYSTEM                                 |  |
|                        |  | Accuracy [**]   Usefulness [****]               |  |
|                        |  | [Submit System Telemetry]                       |  |
|                        |  +-------------------------------------------------+  |
+------------------------+-------------------------------------------------------+
```

---

## 3. History Storage Index

If the user clicks "Brain Storage" in the sidebar or searches using the top bar, the workspace is replaced with the history grid index.

```text
+------------------------+-------------------------------------------------------+
| SIDEBAR (Left)         | WORKSPACE / DASHBOARD (Right)                         |
|------------------------|-------------------------------------------------------|
| ...                    | [Menu/X]  [Search History...]   [Status] [UserAvatar] |
|                        |-------------------------------------------------------|
|                        |                                                       |
|                        | MATCHES: "Strategy"            [EXIT_STORAGE]         |
|                        |                                                       |
|                        | [Card 1]                     [Card 2]                 |
|                        | +-----------------------+    +-----------------------+|
|                        | | [Agent]  [Score 85%]  |    | [Agent]  [Score 60%]  ||
|                        | | "Prompt text..."      |    | "Prompt text..."      ||
|                        | | [PDF][CSV][JSON]      |    | [PDF][CSV][JSON]      ||
|                        | +-----------------------+    +-----------------------+|
|                        |                                                       |
+------------------------+-------------------------------------------------------+
```

### Component Details

- **Input Configuration Bar:** Features a large text area for inputting decisions. Accompanied by sliders for intuition overrides and checkboxes for enabling debiasing algorithms.
- **Results Engine:** After execution, statistical areas update revealing AI evaluation. Recharts are used to showcase alignment scores.
- **Micro-Agents:** Each micro-agent in the sidebar acts as a filter or "personality" domain, changing the context and the result output format slightly in terms of scoring metrics.
