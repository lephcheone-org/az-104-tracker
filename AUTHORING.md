# AZ-104 question authoring spec

You are writing ORIGINAL practice questions for the Microsoft AZ-104 (Azure Administrator) exam, skills measured as of 17 April 2026.
The bank feeds a self-contained study web app. Every question becomes a full lesson, so the explanation quality matters more than the question count.

## Hard rules

1. **Original only.** Never reproduce, paraphrase or "reconstruct" real exam items, exam dumps, braindumps or third-party practice tests. Write fresh scenarios (use fictional company names such as Contoso, Fabrikam, Tailspin Toys, Woodgrove Bank, Litware, Adatum).
2. **Never invent** rules, limits, SKUs, commands, parameters, portal blades, role names, exam objectives or product capabilities. If you are not certain, verify it with `web_fetch` against **learn.microsoft.com** (official docs) before using it. If you still cannot verify it, do not use it.
3. **Check anything that may have changed recently** (renames, retirements, preview-to-GA, defaults, limits, SKU names) against current official docs. Today is October 2026. Use current names: Microsoft Entra ID (formerly Azure AD), Azure Monitor Agent (not the legacy Log Analytics agent), Azure Virtual Network Manager, etc. Mention the former name once in the Jargon Buster when it helps.
4. Prefer GA behaviour. If something is preview, say so explicitly.
5. Every factual claim in the explanation must be supported by at least one cited official source in `sources` (learn.microsoft.com URLs that you actually fetched and confirmed exist).
6. Be internally consistent: the correct answer, technical explanation, wrong-option analysis and exam tip must agree.
7. Separate **official behaviour** (facts from docs) from **recommendations** (your advice). Label recommendations as such.
8. State assumptions (cloud = Azure public cloud, default settings, region support, licence tier, etc.) in `assumptions`.

## Question design

- Types: `single` (exactly one correct, 4 options, sometimes 5) or `multiple` (2 or 3 correct out of 4–6; prompt must end with "Each correct answer presents part of the solution. Select TWO." or "...Select THREE."). Aim for ~20% `multiple`.
- Difficulty mix: ~20% `foundation`, ~55% `applied`, ~25% `advanced`.
- Style like real Microsoft exams: scenario first ("You have an Azure subscription that contains…"), then a clear question ("What should you do first?", "Which role should you assign?", "Which two actions…"). Include realistic artefacts where useful: small tables of resources, NSG rule tables, Azure CLI / Az PowerShell commands, ARM JSON or Bicep snippets, KQL queries.
- Also use these exam patterns sometimes: "minimise administrative effort", "least privilege", "minimise cost", "Does this solution meet the goal?" (single, options Yes/No).
- Each question within an objective must test a DIFFERENT sub-concept. Spread across the whole objective: no near-duplicates.
- Distractors must be plausible to a half-prepared candidate and reflect real misconceptions. No "all of the above"/"none of the above". Keep option lengths similar (do not make the correct option the longest). Balance correct-answer letters across your set.
- Code: use fenced blocks with a language tag (```bicep, ```json, ```azurecli, ```powershell, ```kusto). Commands must be real and syntactically valid.

## Markdown subset (the app's renderer supports ONLY this)

- Paragraphs separated by a blank line
- `**bold**`, `*italic*`, `` `inline code` ``
- Bullets `- item`, numbered `1. item` (one level, no nesting)
- `#### Small heading`
- Tables: header row, `|---|---|` separator, rows
- Fenced code blocks ```lang … ```
- Links `[text](https://...)`
No HTML, no nested lists, no images.

## JSON schema (one file per objective = a JSON array of question objects)

```json
{
  "id": "D1.2.2-01",
  "objective": "D1.2.2",
  "type": "single",
  "difficulty": "applied",
  "prompt": "markdown scenario + question",
  "options": [ {"id": "A", "text": "markdown"}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."} ],
  "correct": ["B"],
  "assumptions": "markdown – what you assume (defaults, cloud, licensing, region…)",
  "sections": {
    "correctAnswer": "markdown",
    "technical": "markdown",
    "wrongOptions": { "A": "markdown", "C": "markdown", "D": "markdown" },
    "plainEnglish": "markdown",
    "analogy": "markdown",
    "jargon": [ {"term": "RBAC", "definition": "markdown"} ],
    "watchOut": "markdown",
    "productionTip": { "official": "markdown", "recommendation": "markdown" },
    "memoryTrick": "markdown",
    "examTip": "markdown"
  },
  "sources": [ {"title": "Page title", "url": "https://learn.microsoft.com/..."} ],
  "verified": "2026-10"
}
```

`wrongOptions` must contain a key for EVERY option that is not in `correct`, and no others.

## Required answer sections (all ten, every question)

1. **correctAnswer** – Start with the direct answer: the letter(s) and option text in bold, then 1–2 sentences on why. No preamble.
2. **technical** – Complete and self-contained Technical Explanation. Cover the underlying rules, **the order they are evaluated in, scope, inheritance, precedence and exceptions** where they apply. Build up complexity gradually. Use numbered steps / small tables when they help.
3. **wrongOptions** – Why Every Other Option Is Wrong: one entry per wrong option. Each must (a) say why it is wrong here, (b) name the misconception behind it ("Misconception: …"), and (c) say when it *could* be correct ("Could be correct when: …").
4. **plainEnglish** – In Plain English: a complete re-explanation for a smart high-school graduate with no IT background. Not a summary of the technical section – re-teach it from zero.
5. **analogy** – Real-World Analogy: tell the analogy, then map each part back to the real component (a small table `Analogy | Azure reality` works well), then a "**Where the analogy breaks down:**" paragraph.
6. **jargon** – Jargon Buster: define EVERY term, acronym, product, role, setting and command that appears in the question, options or explanation. Never assume a term is self-explanatory. Typically 6–15 entries.
7. **watchOut** – Watch Out / Good to Know: exam traps, easily confused ideas, exceptions, risks, limitations (bullets).
8. **productionTip** – Real-World Production Tip, in two parts:
   - `official`: documented behaviour relevant to production (how it is used, what to check first, outage/security risks, troubleshooting & validation steps).
   - `recommendation`: your practitioner recommendations incl. the least-privilege approach. Clearly opinion/advice.
9. **memoryTrick** – Memory Trick: a safe mnemonic or rule of thumb. Say explicitly if it is a simplification and where it fails.
10. **examTip** – Exam Tip: clue words in the question, how to rule options out, the exact distinction being tested, and how a harder version of this question might look.

## Quality rules

- Start with the direct answer. Accurate and consistent. No filler, no vague advice ("follow best practices" is banned unless you say exactly which).
- Never assume a term is self-explanatory. Build complexity gradually.
- Use headings, numbered steps, bullets and small tables where they help.
- Separate facts from recommendations. State assumptions.
- Typical length per question: 900–1600 words across all sections. Depth over padding.
- **No templated text.** Every section must be written specifically for its own question's scenario and options. Do NOT reuse generic paragraphs, sentences, analogy tables or memory tricks across questions to reach length (e.g. "Evaluate these questions in order...", "The safest exam answer is the one that..."). The validator rejects any sentence or table row of 50+ characters that appears in 3 or more questions of the same file. If a section is short, add real, question-specific detail (rules, scope, limits, examples), never filler.

## Process

1. Read the objective and fetch the relevant learn.microsoft.com pages (concept + how-to + limits/FAQ pages).
2. Plan the sub-concepts so the set covers the objective broadly.
3. Write the questions to the output file as a JSON array (UTF-8). Write in chunks if needed but the final file must be one valid JSON array.
4. Validate: run `python az104\validate.py az104\questions\<objective>.json` from the working directory `C:\Users\v-ashrestha\.copilot\chats\2026-10-06\musical-system-a125f49d` and fix every error it reports.
5. Report back only: file path, question count, and any facts you could not verify (and therefore left out).
