"""Builds the Jinja2 template context for the All India Will PDF
(see pdf_generator.py / templates/all_india_will.yaml.j2).

Every function here is a direct port of the rendering logic in
web/src/features/create-will/AllIndiaWillDocument.tsx (opening clause,
asset-section lettering, executor/guardian clauses, witness particulars)
and web/src/utils/format.ts (ordinal/yearInWords/dateDDMMYYYY) — kept in
one place so the PDF and the on-screen preview stay in sync when either
changes. The genuinely dynamic, sentence-level text (composed from
multiple fields with conditional punctuation) is built here as ready
strings; the template file only decides section order and static
boilerplate wording.

Every raw field value that reaches the template is passed through esc()
first (XML-escapes &/</>/'/") — the PDF is rendered by ReportLab's
Paragraph, which interprets a small XML-like markup subset in its input,
so this must happen once, here, before any composition/concatenation.
"""

from xml.sax.saxutils import escape as _xml_escape

BLANK = "_______________________"

# Mirrors web/src/data/options.ts's MONTHS array — needed to resolve a
# month name back to its 1-based index for dateDDMMYYYY.
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

_ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def esc(value) -> str:
    if value is None:
        return ""
    return _xml_escape(str(value))


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def ordinal(n) -> str:
    """Same output as web/src/utils/format.ts's ordinal() for every valid
    day-of-month (1-31): 1st, 2nd, 3rd, 4th..11th-13th, 21st, etc."""
    num = _int(n)
    if num is None:
        return esc(n)
    v = num % 100
    suffix = "th" if 11 <= v <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(num % 10, "th")
    return f"{num}{suffix}"


def _two_digit_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    t, o = divmod(n, 10)
    return _TENS[t] + (f" {_ONES[o]}" if o else "")


def number_to_words(n: int) -> str:
    if n == 0:
        return "Zero"
    if n < 100:
        return _two_digit_words(n)
    if n < 1000:
        h, rem = divmod(n, 100)
        return _ONES[h] + " Hundred" + (f" and {_two_digit_words(rem)}" if rem else "")
    th, rem = divmod(n, 1000)
    words = (_ONES[th] if th < 20 else _two_digit_words(th)) + " Thousand"
    if rem:
        words += f" and {_two_digit_words(rem)}" if rem < 100 else f" {number_to_words(rem)}"
    return words


def year_in_words(year) -> str:
    n = _int(year)
    return number_to_words(n) if n is not None else esc(year)


def date_ddmmyyyy(day, month, year) -> str:
    d, y = _int(day), _int(year)
    if d is None or y is None or month not in MONTHS:
        return ""
    return f"{d:02d}/{MONTHS.index(month) + 1:02d}/{y}"


def rel_of(item: dict) -> str:
    value = item.get("relationOther") if item.get("relation") == "Other" else item.get("relation")
    return esc(value) if value else ""


def witness_rel_of(w: dict) -> str:
    value = w.get("relationToTestatorOther") if w.get("relationToTestator") == "Other" else w.get("relationToTestator")
    return esc(value) if value else ""


def occupation_of(item: dict) -> str:
    value = item.get("occupationOther") if item.get("occupation") == "Other" else item.get("occupation")
    return esc(value) if value else ""


def v(d: dict, key: str, fallback: str = BLANK) -> str:
    value = (d or {}).get(key)
    return esc(value) if value else fallback


def _national(d: dict, key: str = "nationality") -> str:
    value = (d or {}).get(key)
    return f"{esc(value)} national" if value else BLANK


def _filled(items) -> list:
    return [it for it in (items or []) if isinstance(it, dict) and str(it.get("description") or "").strip()]


def _render_asset_list(items: list, label: str) -> list:
    numbered = len(items) > 1
    lines = []
    for i, item in enumerate(items):
        prefix = f"({i + 1}) " if numbered else ""
        id_type = item.get("idType") or "Aadhaar Card"
        lines.append(
            f"{prefix}{label}: {v(item, 'description')} Bequeathed to: {v(item, 'beneficiary')} "
            f"Relationship: {rel_of(item) or BLANK}, bearing {esc(id_type)} Number: {v(item, 'idNumber')}."
        )
    return lines


def _witness_particular(index: int, w: dict) -> str:
    letter = chr(97 + index)
    return (
        f"{letter}) {v(w, 'name')} {esc(w.get('parentRelation')) or 'son/daughter/wife'} of {v(w, 'parentName')}, "
        f"aged {esc(w.get('age')) or '___'}, {esc(w.get('maritalStatus')) or 'unmarried/married'} "
        f"nationality {_national(w)}, occupation {occupation_of(w) or BLANK}, resident of {v(w, 'address')}, "
        f"bearing PAN Number {v(w, 'pan')}, Aadhaar Number {v(w, 'aadhaarNumber')}, "
        f"Relation to Testator: {witness_rel_of(w) or BLANK}"
    )


def _witness_particulars_text(witnesses: list) -> str:
    # Each witness's particulars sit on their own line (a "<br/>" separator
    # is real ReportLab Paragraph markup, not escaped user data — it's only
    # ever inserted here, never built from a field value) — the last one
    # is followed by a space instead, since "make my last and final WILL."
    # continues straight on from it rather than starting a new line.
    parts = []
    for i, w in enumerate(witnesses):
        sep = "<br/>" if i < len(witnesses) - 1 else " "
        parts.append(_witness_particular(i, w) + sep)
    return "".join(parts)


def _opening_clause(testator: dict, witnesses: list, execution_date_str: str) -> str:
    marital_status = esc(testator.get("maritalStatus")) or ""
    clause = (
        f"I, {v(testator, 'fullName')}, having PAN {v(testator, 'pan')}, Aadhaar No. {v(testator, 'aadhaarNumber')}, "
        f"{esc(testator.get('relation')) or ''} of {v(testator, 'parentSpouseName')}, aged {esc(testator.get('age')) or '___'}, "
        f"{marital_status} nationality {_national(testator)}, occupation {occupation_of(testator) or BLANK}, "
        f"resident of {v(testator, 'address')}"
    )
    if testator.get("maritalStatus") == "married":
        son_names = [n for n in (testator.get("sonNames") or []) if n]
        daughter_names = [n for n in (testator.get("daughterNames") or []) if n]
        son_count = "one" if len(son_names) == 1 else (str(len(son_names)) if son_names else "___")
        daughter_count = "one" if len(daughter_names) == 1 else (str(len(daughter_names)) if daughter_names else "___")
        son_join = esc(", ".join(son_names)) or BLANK
        daughter_join = esc(", ".join(daughter_names)) or BLANK
        clause += (
            f", I am married to {v(testator, 'spouseName')}, bearing PAN {v(testator, 'spousePan')}, "
            f"Aadhaar No. {v(testator, 'spouseAadhaarNumber')} "
            f"and I have {son_count} son, namely, {son_join} and {daughter_count} daughter, namely, {daughter_join}"
        )
    witness_particulars = _witness_particulars_text(witnesses)
    clause += f". And on the {execution_date_str}, and in the presence of two following witnesses:<br/>{witness_particulars}make my last and final WILL."
    return clause


def _residue_clause(entries: list) -> str:
    prefix = "the following, in equal shares: " if len(entries) > 1 else ""
    parts = []
    for i, entry in enumerate(entries):
        id_type = entry.get("idType") or "Aadhaar Card"
        suffix = "; " if i < len(entries) - 1 else "."
        parts.append(
            f"{rel_of(entry) or BLANK}, {v(entry, 'name')}, nationality {_national(entry)}, "
            f"occupation {occupation_of(entry) or BLANK}, bearing {esc(id_type)} Number: {v(entry, 'idNumber')}{suffix}"
        )
    return (
        "I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any "
        "property or assets, both movable and immovable, which I may acquire after the execution of this "
        "Will, or which has been inadvertently omitted from this document, shall be given entirely to "
        f"{prefix}{''.join(parts)}"
    )


def _executor_appointment_clause(executor: dict) -> str:
    if executor.get("executorType") == "org":
        return (
            f"I appoint Organization / Entity Name: {v(executor, 'orgName')}, with Authorized Representative / "
            f"Contact Person: {v(executor, 'orgRepName')}, bearing Registration / Tax ID Number: "
            f"{v(executor, 'orgRegNumber')}, and having Registered Office Address: {v(executor, 'orgAddress')}."
        )
    return (
        f"I appoint {v(executor, 'name')}, having Relationship to Testator: {v(executor, 'relation')}, "
        f"with Contact Details / Address: {v(executor, 'address')}, bearing {esc(executor.get('idType')) or ''} "
        f"Number: {v(executor, 'idNumber')}."
    )


def _guardian_appointment_clause(guardian: dict) -> str:
    return (
        f"I appoint {v(guardian, 'name')}, having Relation to Testator: {v(guardian, 'relation')}, "
        f"with Address: {v(guardian, 'address')}, bearing {esc(guardian.get('idType')) or ''} "
        f"Number: {v(guardian, 'idNumber')}."
    )


def build_pdf_context(will: dict) -> dict:
    testator = will.get("testator") or {}
    executor = will.get("executor") or {}
    guardian = will.get("guardian") or {}
    all_india_assets = will.get("allIndiaAssets") or {}
    all_india_residue = will.get("allIndiaResidue") or []
    witnesses = will.get("witnesses") or []

    if testator.get("signDay") and testator.get("signMonth") and testator.get("signYear"):
        execution_date_str = (
            f"{ordinal(testator['signDay'])} day of {esc(testator['signMonth'])} "
            f"of the year {year_in_words(testator['signYear'])}"
        )
        sign_date_ddmmyyyy = date_ddmmyyyy(testator["signDay"], testator["signMonth"], testator["signYear"]) or "____________________"
    else:
        execution_date_str = "____________________"
        sign_date_ddmmyyyy = "____________________"

    gender = testator.get("gender")
    title = "Testator" if gender == "male" else "Testatrix" if gender == "female" else "Testator/Testatrix"

    house_flat = _filled(all_india_assets.get("houseFlat"))
    land_plot = _filled(all_india_assets.get("landPlot"))
    commercial_property = _filled(all_india_assets.get("commercialProperty"))
    vehicle = _filled(all_india_assets.get("vehicle"))
    jewellery = _filled(all_india_assets.get("jewellery"))
    social_media_digital = _filled(all_india_assets.get("socialMediaDigital"))
    intellectual_property = _filled(all_india_assets.get("intellectualProperty"))

    has_immovable = bool(house_flat or land_plot or commercial_property)
    has_vehicle = bool(vehicle)
    has_personal = bool(jewellery)
    has_digital_misc = bool(social_media_digital or intellectual_property)

    next_letter = ord("B")
    letter_immovable = letter_vehicle = letter_personal = letter_digital_misc = ""
    if has_immovable:
        letter_immovable, next_letter = chr(next_letter), next_letter + 1
    if has_vehicle:
        letter_vehicle, next_letter = chr(next_letter), next_letter + 1
    if has_personal:
        letter_personal, next_letter = chr(next_letter), next_letter + 1
    if has_digital_misc:
        letter_digital_misc, next_letter = chr(next_letter), next_letter + 1

    executor_type = executor.get("executorType") or "individual"

    return {
        "blank": BLANK,
        "title": title,
        "opening_clause": _opening_clause(testator, witnesses, execution_date_str),
        "has_immovable": has_immovable,
        "has_vehicle": has_vehicle,
        "has_personal": has_personal,
        "has_digital_misc": has_digital_misc,
        "letter_immovable": letter_immovable,
        "letter_vehicle": letter_vehicle,
        "letter_personal": letter_personal,
        "letter_digital_misc": letter_digital_misc,
        "house_flat_lines": _render_asset_list(house_flat, "House / Flat"),
        "land_plot_lines": _render_asset_list(land_plot, "Land / Plot"),
        "commercial_property_lines": _render_asset_list(commercial_property, "Commercial Property"),
        "vehicle_lines": _render_asset_list(vehicle, "Vehicle / Car"),
        "jewellery_lines": _render_asset_list(jewellery, "Jewellery & Heirlooms"),
        "social_media_digital_lines": _render_asset_list(social_media_digital, "Social Media / Digital"),
        "intellectual_property_lines": _render_asset_list(intellectual_property, "Intellectual Property"),
        "residue_clause": _residue_clause(all_india_residue),
        "special_instructions": esc((will.get("specialInstructions") or "").strip()) or None,
        "testator_full_name": v(testator, "fullName"),
        "testator_email": v(testator, "email"),
        "testator_sign_place": v(testator, "signPlace"),
        "sign_date_ddmmyyyy": sign_date_ddmmyyyy,
        "witnesses": [{"name": v(w, "name")} for w in witnesses],
        "show_executor": bool(executor.get("wantsExecutor")),
        "executor_type": executor_type,
        "executor_appointment_clause": _executor_appointment_clause(executor),
        "executor_consent_who": (
            "the Authorized Representative of the Organization mentioned"
            if executor_type == "org" else "the Executor named above"
        ),
        "executor_label_suffix": " / Representative" if executor_type == "org" else "",
        "show_guardian": bool(guardian.get("hasMinors")),
        "guardian_appointment_clause": _guardian_appointment_clause(guardian),
    }
