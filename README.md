# AZ-104 Practice Lab

A self-contained study app for the Microsoft Azure Administrator (AZ-104) exam. It contains original practice questions with detailed explanations, a study guide, practice sessions, and progress tracking. It is an independent study project and is not affiliated with or endorsed by Microsoft.

## Run the app

Requires Python 3. From this directory, run:

```powershell
python build.py
```

The build validates the question bank and writes `dist/index.html`. Open that file in a browser to use the app. Validate one question file directly with `python validate.py questions/D1.1.1.json`.

## Project contents

- `questions/` - question bank grouped by AZ-104 objective
- `src/` - app HTML template, JavaScript, and styles
- `blueprint.json` and `research.json` - exam objectives and study references
- `build.py` and `validate.py` - build and content validation tools
- `AUTHORING.md` - question-writing and validation requirements

Generated files in `dist/` are not committed; build them locally with `python build.py`.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys the app on pushes to `main`. The expected site URL is `https://lephcheone-org.github.io/az-104-tracker/`. If the first workflow run cannot enable Pages automatically, set the repository's Pages source to **GitHub Actions** under **Settings > Pages**, then rerun the workflow.

## Data and credentials

The app has no project backend. Study progress is stored in the browser. Optional cross-device sync uses a private GitHub Gist and a token supplied by the user; that token is stored in the browser's local storage and is not part of this repository. Never commit personal access tokens, passwords, or populated local configuration files.

Question examples that show password parameters use placeholders only. Do not use them as real credentials.