"""Validate AZ-104 question files. Usage: python az104\\validate.py <file.json> [...]"""
import json, re, sys, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
BP = json.load(open(os.path.join(HERE, "blueprint.json"), encoding="utf-8"))
OBJECTIVES = {o["id"] for d in BP["domains"] for g in d["groups"] for o in g["objectives"]}
SECTIONS = ["correctAnswer", "technical", "wrongOptions", "plainEnglish", "analogy",
            "jargon", "watchOut", "productionTip", "memoryTrick", "examTip"]
MIN_LEN = {"correctAnswer": 40, "technical": 400, "plainEnglish": 250, "analogy": 200,
           "watchOut": 120, "memoryTrick": 40, "examTip": 200}


def check(q, errors, where):
    def err(msg): errors.append(f"{where} {q.get('id', '?')}: {msg}")
    for key in ["id", "objective", "type", "difficulty", "prompt", "options", "correct",
                "assumptions", "sections", "sources", "verified"]:
        if key not in q: err(f"missing '{key}'")
    if errors and errors[-1].endswith("'sections'"): return
    if q.get("objective") not in OBJECTIVES: err(f"unknown objective {q.get('objective')}")
    if not str(q.get("id", "")).startswith(str(q.get("objective")) + "-"): err("id must start with '<objective>-'")
    if q.get("type") not in ("single", "multiple"): err("type must be single|multiple")
    if q.get("difficulty") not in ("foundation", "applied", "advanced"): err("bad difficulty")
    opts = q.get("options", [])
    ids = [o.get("id") for o in opts]
    if len(opts) < 2 or len(opts) > 6: err("need 2-6 options")
    if ids != [chr(65 + i) for i in range(len(ids))]: err("option ids must be A,B,C... in order")
    if any(not str(o.get("text", "")).strip() for o in opts): err("empty option text")
    correct = q.get("correct", [])
    if not correct or any(c not in ids for c in correct) or len(set(correct)) != len(correct): err("bad correct list")
    if q.get("type") == "single" and len(correct) != 1: err("single needs exactly 1 correct")
    if q.get("type") == "multiple":
        if len(correct) < 2: err("multiple needs 2+ correct")
        word = {2: "TWO", 3: "THREE", 4: "FOUR"}.get(len(correct))
        if word and f"Select {word}" not in q.get("prompt", ""): err(f"multiple prompt must say 'Select {word}'")
    s = q.get("sections", {})
    for name in SECTIONS:
        if name not in s: err(f"missing section {name}")
    for name, n in MIN_LEN.items():
        if name in s and len(str(s[name])) < n: err(f"section {name} too short (<{n} chars)")
    wrong = s.get("wrongOptions", {})
    if isinstance(wrong, dict):
        expected = set(ids) - set(correct)
        if set(wrong) != expected: err(f"wrongOptions keys {sorted(wrong)} != {sorted(expected)}")
        for k, v in wrong.items():
            if "isconception" not in v: err(f"wrongOptions {k} must name the misconception")
            if "ould be correct" not in v: err(f"wrongOptions {k} must say when it could be correct")
    else: err("wrongOptions must be an object")
    jar = s.get("jargon", [])
    if not isinstance(jar, list) or len(jar) < 4 or any(not j.get("term") or not j.get("definition") for j in jar):
        err("jargon must be a list of 4+ {term, definition}")
    pt = s.get("productionTip", {})
    if not isinstance(pt, dict) or len(str(pt.get("official", ""))) < 80 or len(str(pt.get("recommendation", ""))) < 80:
        err("productionTip needs official and recommendation (80+ chars each)")
    if "breaks down" not in str(s.get("analogy", "")).lower(): err("analogy must say where it breaks down")
    src = q.get("sources", [])
    if not src or any(not str(x.get("url", "")).startswith("https://learn.microsoft.com/") or not x.get("title") for x in src):
        err("sources must be learn.microsoft.com {title,url}")
    blob = json.dumps(q)
    words = len(re.findall(r"\w+", json.dumps(s))) + len(re.findall(r"\w+", str(q.get("prompt", ""))))
    if words < 800: err(f"too thin: {words} words across prompt+sections (spec asks 900-1600; minimum 800)")
    if re.search(r"<(div|span|br|p|ul|li|table)\b", blob, re.I): err("raw HTML is not allowed")
    if re.search(r"all of the above|none of the above", blob, re.I): err("no all/none of the above")


def boilerplate(data, errors, path):
    """Reject template text: the same long sentence or table row reused across 3+ questions in a file."""
    seen = Counter()
    for q in data:
        s = q.get("sections", {})
        pt = s.get("productionTip", {}) if isinstance(s.get("productionTip"), dict) else {}
        wo = s.get("wrongOptions", {}) if isinstance(s.get("wrongOptions"), dict) else {}
        texts = [str(s.get(k, "")) for k in ("correctAnswer", "technical", "plainEnglish", "analogy", "watchOut", "memoryTrick", "examTip")]
        texts += [str(pt.get("official", "")), str(pt.get("recommendation", ""))] + [str(v) for v in wo.values()]
        units = set()
        for t in texts:
            for line in t.split("\n"):
                for sent in re.split(r"(?<=[.!?])\s+", line):
                    sent = " ".join(sent.split())
                    if len(sent) >= 50 and not re.fullmatch(r"[|\-: ]+", sent): units.add(sent)
        seen.update(units)
    for sent, n in seen.most_common():
        if n < 3: break
        errors.append(f"{path}: boilerplate text reused in {n} questions (write question-specific content): {sent[:120]}")


def main(paths):
    errors, total, seen = [], 0, set()
    for path in paths:
        try:
            data = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            errors.append(f"{path}: invalid JSON: {e}"); continue
        if not isinstance(data, list): errors.append(f"{path}: must be a JSON array"); continue
        for q in data:
            total += 1
            if q.get("id") in seen: errors.append(f"{path}: duplicate id {q.get('id')}")
            seen.add(q.get("id"))
            check(q, errors, path)
        boilerplate(data, errors, path)
        letters = Counter(c for q in data for c in q.get("correct", []))
        print(f"{path}: {len(data)} questions; correct-letter spread {dict(letters)}")
    for e in errors: print("ERROR", e)
    print(f"{total} questions, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
