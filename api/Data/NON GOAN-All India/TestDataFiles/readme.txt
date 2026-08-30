Paste Will PDF files generated from the running system into this folder.

Each file pasted here is automatically compared against the matching
reference template in ../Template/ by
api/_app/tests/pdf_regression/test_will_pdf_matches_template.py — run it
with:

    cd api
    .venv-api/Scripts/python.exe -m pytest _app/tests/pdf_regression -v

Every .pdf file in this folder gets its own pass/fail result. A failure
means the generated document's fixed wording no longer matches the legal
template — it lists exactly which template phrases went missing (and in
what order they were expected), so you can see precisely what drifted.

Which template a file is checked against is decided by its filename:
  - contains "organizational" (case-insensitive) -> the Organizational
    Executor template
  - anything else -> the Individual Executor template (the default)

So name your pasted files accordingly, e.g.:
  my-test-will-individual-executor.pdf
  my-test-will-organizational-executor.pdf

This folder is meant to stay empty in git — it's your own local scratch
space for pasting whatever PDF you just downloaded from the app to check
it.
