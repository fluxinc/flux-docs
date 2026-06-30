# AI Config Assistant

The **DICOM Printer 2 Config Assistant** is an installable agent skill that knows how to author and edit DICOM Printer 2 `config.xml` files correctly — every action, the workflow engine, tag placeholders, and the engine's real defaults and pitfalls. Install it once, then ask Claude, Codex, or another skill-aware coding agent in plain English for the configuration you need.

::: tip Why use it
On its own, an AI tends to invent plausible-but-wrong XML (a wrong root element, made-up attributes). With the skill installed, the agent has the DICOM Printer 2 configuration model close at hand — querying a Modality Worklist, storing to PACS, printing to film, running plugins, and more.
:::

## Download

<a href="/dicom-printer-2-config-skill.zip" download>**⬇ Download the Config Assistant skill (.zip)**</a>

The bundle contains the skill itself plus detailed references and three ready-to-edit templates (print-to-PACS, print-to-film, and drop-folder ingestion).

## Install

### Claude Code

Claude Code loads skills from a `skills` folder automatically — no restart needed. Unzip the download there:

**macOS / Linux**

```bash
unzip ~/Downloads/dicom-printer-2-config-skill.zip -d ~/.claude/skills/
```

**Windows (PowerShell)**

```powershell
Expand-Archive "$HOME\Downloads\dicom-printer-2-config-skill.zip" "$HOME\.claude\skills\"
```

This creates `~/.claude/skills/dicom-printer-2-config/`. To scope it to a single project instead of your whole machine, unzip into that project's `.claude/skills/` folder.

### Claude (web / desktop)

Open Claude's **Settings → Capabilities → Skills**, choose **Upload skill**, and select the downloaded `.zip`.

### Codex

Codex installations commonly read skills from `~/.codex/skills/`. Unzip the download there:

```bash
unzip ~/Downloads/dicom-printer-2-config-skill.zip -d ~/.codex/skills/
```

### Other coding agents

The download follows the open **Agent Skills** format — a `SKILL.md` folder with references and templates — so it isn't Claude-specific. Unzip it into the skills directory your agent reads (for example a shared `.agents/skills/` folder, or your agent's configured skills location):

```bash
unzip ~/Downloads/dicom-printer-2-config-skill.zip -d ~/.agents/skills/
```

Then ask the agent for a configuration just as you would Claude.

## Use it

Describe what you want — your agent pulls in the skill when the task involves DICOM Printer 2 configuration. For example:

> Write a DICOM Printer 2 config that grabs the accession number from the print job's filename, queries our Modality Worklist at 10.0.0.50 port 104 (their AE `WORKLIST_SCP`, ours `DICOM_PRINTER`), and stores to the PACS at 10.0.0.51 port 104 (AE `PACS1`) as JPEG Lossless. If the worklist is empty, retry for a while; if there are several matches, let staff pick.

> Add a step to my config that auto-trims white margins and rotates landscape pages upright before storing.

You can also paste an existing `config.xml` and ask the agent to **review or fix** it.

## What it covers

- **Actions** — Query (Worklist / Study / Patient / Manual), Store, Save, Print, Parse, SetTag / SetSequence, Trim / Resize / Rotate / AutoRotateText, MergeJob, and Run / Notify plugins.
- **Workflow** — `Perform` with `onError`, `If` / `Switch`, `Suspend` retries, and the available condition fields.
- **Details** — tag placeholders, the Run-plugin stdin/stdout contract, and the engine's real defaults.

For the full element-by-element details, see the rest of this **Configuration** section.
