"""Build az104/dist/az-104-practice.html from src/ parts, blueprint, research and questions."""
import datetime
import glob
import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
JS_PARTS = ["core.js", "views.js", "views2.js", "views3.js", "events.js"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "questions", "*.json")))
    check = subprocess.run([sys.executable, os.path.join(ROOT, "validate.py"), *files], capture_output=True, text=True)
    print(check.stdout.strip().splitlines()[-1] if check.stdout.strip() else check.stderr)
    if check.returncode != 0 and "--force" not in sys.argv:
        print(check.stdout[-4000:])
        sys.exit("Validation failed; fix errors or pass --force.")

    blueprint = json.loads(read(os.path.join(ROOT, "blueprint.json")))
    research = json.loads(read(os.path.join(ROOT, "research.json")))
    known = {o["id"] for d in blueprint["domains"] for g in d["groups"] for o in g["objectives"]}
    questions, seen = [], set()
    for path in files:
        try:
            items = json.loads(read(path))
        except ValueError as e:
            if "--force" in sys.argv:
                print(f"Skipping unreadable {os.path.basename(path)}: {e}")
                continue
            raise
        for q in items:
            if q["id"] in seen:
                sys.exit(f"Duplicate id {q['id']} in {path}")
            if q["objective"] not in known:
                sys.exit(f"Unknown objective {q['objective']} in {path}")
            seen.add(q["id"])
            questions.append(q)
    questions.sort(key=lambda q: (tuple(int(x) for x in q["objective"][1:].split(".")), int(q["id"].rsplit("-", 1)[1])))

    canonical = json.dumps(questions, sort_keys=True, ensure_ascii=False)
    version = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:10]
    built = datetime.date.today().isoformat()
    data = {"blueprint": blueprint, "research": research, "questions": questions, "bankVersion": version, "builtOn": built}
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\u0021--")

    js = "\n".join(read(os.path.join(SRC, p)) for p in JS_PARTS)
    css = read(os.path.join(SRC, "style.css"))
    for name, text in (("JS", js), ("CSS", css)):
        if "</script" in text.lower() or "</style" in text.lower():
            sys.exit(f"{name} contains a closing tag sequence")

    html = read(os.path.join(SRC, "template.html"))
    html = (html.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
            .replace("__VERSION__", version).replace("__COUNT__", str(len(questions))).replace("__BUILT__", built)
            .replace("/*__DATA__*/", data_json))

    out_dir = os.path.join(ROOT, "dist")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "az-104-practice.html")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    counts = {}
    for q in questions:
        counts[q["objective"][:2]] = counts.get(q["objective"][:2], 0) + 1
    print(f"Wrote {out} ({len(html) / 1024 / 1024:.2f} MB), {len(questions)} questions {counts}, version {version}")


if __name__ == "__main__":
    main()
