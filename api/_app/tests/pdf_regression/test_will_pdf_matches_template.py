"""Compares a real, system-generated Will PDF against the reference legal
template it's supposed to match.

## How to use this

1. Generate a Will PDF from the running app (download it, or hit
   `POST /api/will/{will_id}/pdf`).
2. Drop the file into `api/Data/NON GOAN-All India/TestDataFiles/` (see that
   folder's `readme.txt` for the naming convention that picks which
   reference template it's checked against).
3. Run `pytest _app/tests/pdf_regression -v` (or the whole suite — this
   module is picked up automatically). Each file gets its own test, so a
   folder of 5 PDFs produces 5 pass/fail results, one per file.

## What "match" means here

The reference templates in `Template/` are the actual legal document, blank
— every fill-in field is either a long run of underscores, or (since it's
meant to be filled in by hand) a multiple-choice menu like "male/female" or
"Spouse / Son / Daughter / ... / Other" for a human to circle. A generated
PDF has all of that resolved to one real value, so a byte- or line-for-line
diff would never match — pagination shifts, line-wrapping changes, and every
blank/menu is literally different text.

What must **not** change is the fixed legal wording around those blanks and
menus — that's exactly the class of bug this suite is guarding against
(e.g. the "Organization / Entity Name:" wording that shouldn't have been
there, or the "(Entity Name)" label that got added and then had to be
removed — both found by eye during manual review, not by any automated
test, before this one existed).

So the check is: strip the template's blank-fill runs (`___`+) and choice
menus, split what's left into fixed segments, keep only the segments that
look like the start of a genuine sentence or heading (capitalized, long
enough — this throws out the small connective fragments splitting leaves
behind), then confirm every one of those segments appears in the generated
PDF's text, **in the same order** (not just "somewhere in the document" —
actually in sequence, so a paragraph that got moved to the wrong section
would still be caught). Order is enforced with a moving cursor: each
segment must be found at or after the position the previous one ended at.

A section that's legitimately empty in the pasted PDF's own data (no
vehicles listed, no special instructions, etc.) will correctly show that
section's heading as "missing" — that's not a bug in this test, it's an
accurate reflection that the two documents don't have the same content to
compare there. Read a failure's phrase list before assuming it's a real
regression.

This deliberately does NOT check that the *filled-in values* (names,
dates, ID numbers) are correct — that's a data-plumbing concern already
covered by `create_will/test_pdf_context.py`'s unit tests. This test's job
is narrower and complementary: did the fixed wording drift from the legal
template.
"""

import re
from pathlib import Path

import pytest
from pypdf import PdfReader

DATA_DIR = Path(__file__).resolve().parents[3] / "Data" / "NON GOAN-All India"
TEMPLATE_DIR = DATA_DIR / "Template"
TESTDATA_DIR = DATA_DIR / "TestDataFiles"

# Filename keyword -> which reference template a generated PDF is checked
# against. Matched case-insensitively against the generated file's own
# name (see TestDataFiles/readme.txt for the naming convention this
# implements). The first matching keyword wins; "individual" is the
# fallback when neither keyword appears, since that's the more common case.
TEMPLATE_KEYWORDS = {
    "organizational": "ORGANIZATIONAL",
    "individual": "INDIVIDUAL",
}

# Blank-fill runs in the reference templates are long stretches of
# underscores (e.g. "_______________________"). Three or more is enough to
# distinguish a real blank from an underscore used as ordinary punctuation
# (which doesn't happen in these documents, but the threshold costs nothing).
BLANK_RUN = re.compile(r"_{3,}")

# The templates are blank *legal forms* — besides underscore blanks, they
# also print multiple-choice menus for a human to circle/complete by hand
# (e.g. "male/female", "unmarried/ married/ widowed/divorced", the long
# "Spouse / Son / Daughter / ... / Other" relationship list). The system
# never prints the menu — it prints the one value that was actually
# selected — so these spans are exactly as "variable" as an underscore
# blank and must be stripped the same way, or almost the entire document
# would show up as "missing" even when nothing is actually wrong. A menu is
# recognized as 2+ slash-separated word groups; "male/female" is the one
# real 2-word menu with only a single slash, so it's matched explicitly.
# A genuine single "/" elsewhere (e.g. "and/or") is deliberately NOT
# touched by either pattern — losing that distinction would hide a real
# wording change inside an actual sentence.
MENU_RUN = re.compile(
    r"\(?\s*(?:[A-Za-z]+\s*/\s*){2,}[A-Za-z]+(?:\s*etc)?\s*\)?|\bmale/female\b", re.IGNORECASE,
)
VARIABLE_RUN = re.compile(f"(?:{BLANK_RUN.pattern})|(?:{MENU_RUN.pattern})", re.IGNORECASE)

# "Testator"/"Testatrix" resolve to the testator's actual gendered title
# (see pdf_generator.py's _make_signature_footer / pdf_context.py's title
# resolution) — the reference template always shows the generic
# "Testator/ Testatrix" form since it's a blank form for anyone to use.
# Normalized to one canonical token on both sides so this expected,
# gender-driven substitution isn't reported as a wording mismatch.
TESTATOR_TITLE = re.compile(r"Testator\s*/\s*Testatrix|Testatrix\s*/\s*Testator|\bTestator\b|\bTestatrix\b")


def _normalize_testator_title(text: str) -> str:
    return TESTATOR_TITLE.sub("TESTATOR_TITLE", text)


# After stripping blanks/menus, only keep segments that read like the start
# of a genuine sentence or heading — this throws out the small leftover
# fragments (stray punctuation, an orphaned "etc)", a mid-clause word right
# before a menu) that splitting inevitably produces, which would otherwise
# either trivially match anywhere or fail with a useless, noisy diff. A
# real invariant sentence in this document always starts with a capital
# letter or digit and runs long enough to be meaningful; the connective
# fragments left behind by the split do not.
MIN_SEGMENT_LEN = 30
SEGMENT_START = re.compile(r"^[A-Z0-9]")


def _extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = re.sub(r"\s+", " ", " ".join(pages)).strip()
    return _normalize_testator_title(text)


def _template_segments(template_text: str) -> list[str]:
    raw_segments = [s.strip() for s in VARIABLE_RUN.split(template_text)]
    return [s for s in raw_segments if len(s) >= MIN_SEGMENT_LEN and SEGMENT_START.match(s)]


def _find_template(keyword: str) -> Path:
    matches = [p for p in TEMPLATE_DIR.glob("*.pdf") if keyword.lower() in p.name.lower()]
    if not matches:
        raise FileNotFoundError(
            f"No reference template in {TEMPLATE_DIR} has '{keyword}' in its filename — "
            "was it renamed or moved?"
        )
    if len(matches) > 1:
        raise FileNotFoundError(
            f"Multiple reference templates in {TEMPLATE_DIR} match '{keyword}': "
            f"{[p.name for p in matches]} — ambiguous, keep exactly one per keyword."
        )
    return matches[0]


def _template_for(generated_pdf_name: str) -> Path:
    lower = generated_pdf_name.lower()
    for keyword_key, keyword in TEMPLATE_KEYWORDS.items():
        if keyword_key in lower:
            return _find_template(keyword)
    return _find_template(TEMPLATE_KEYWORDS["individual"])


def _missing_segments(generated_text: str, segments: list[str]) -> list[tuple[int, str]]:
    """Returns [(segment_index, segment_text), ...] for every template
    segment not found in generated_text at or after where the previous
    match left off — i.e. present but out of order also counts as missing."""
    missing = []
    cursor = 0
    for i, segment in enumerate(segments):
        pos = generated_text.find(segment, cursor)
        if pos == -1:
            missing.append((i, segment))
        else:
            cursor = pos + len(segment)
    return missing


def _discover_test_pdfs() -> list[Path]:
    if not TESTDATA_DIR.exists():
        return []
    return sorted(TESTDATA_DIR.glob("*.pdf"))


def pytest_generate_tests(metafunc):
    if "generated_pdf" in metafunc.fixturenames:
        pdfs = _discover_test_pdfs()
        metafunc.parametrize("generated_pdf", pdfs, ids=[p.name for p in pdfs])


def test_generated_pdf_matches_reference_template(generated_pdf: Path):
    template_path = _template_for(generated_pdf.name)
    segments = _template_segments(_extract_text(template_path))
    generated_text = _extract_text(generated_pdf)

    missing = _missing_segments(generated_text, segments)

    if missing:
        preview = "\n".join(f"  [{i}] {text[:160]}{'…' if len(text) > 160 else ''}" for i, text in missing[:10])
        more = f"\n  ...and {len(missing) - 10} more" if len(missing) > 10 else ""
        pytest.fail(
            f"{generated_pdf.name}: {len(missing)}/{len(segments)} fixed template phrases were not found "
            f"(in order) against reference template '{template_path.name}'.\n"
            f"This means the generated document's wording has drifted from the legal template — "
            f"either a real regression, or the template itself changed and this test's reference "
            f"copy needs updating.\n\nMissing phrases:\n{preview}{more}"
        )


def test_no_pdfs_pasted_yet_is_reported_clearly():
    """Not a real assertion — just makes sure an empty TestDataFiles/ folder
    produces one clear, informative skip instead of pytest silently
    collecting zero tests (which looks like nothing ran, not "nothing to
    check yet")."""
    if _discover_test_pdfs():
        pytest.skip("PDFs are present — see test_generated_pdf_matches_reference_template's own results.")
    pytest.skip(
        f"No PDFs in {TESTDATA_DIR} yet — paste a system-generated Will PDF there to compare it "
        "against the reference template (see that folder's readme.txt)."
    )
