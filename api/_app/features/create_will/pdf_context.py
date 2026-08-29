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

import re
from xml.sax.saxutils import escape as _xml_escape

from _app.shared.constants import (
    FLD_ALL_INDIA_ASSETS, FLD_EXECUTOR, FLD_GUARDIAN, FLD_SIGN_DAY, FLD_SIGN_MONTH, FLD_SIGN_YEAR, FLD_TESTATOR,
    FLD_WITNESSES,
)
from _app.features.create_will.section_titles import (
    ASSET_LABEL_COMMERCIAL_PROPERTY, ASSET_LABEL_HOUSE_FLAT, ASSET_LABEL_INTELLECTUAL_PROPERTY,
    ASSET_LABEL_JEWELLERY, ASSET_LABEL_LAND_PLOT, ASSET_LABEL_SOCIAL_MEDIA_DIGITAL, ASSET_LABEL_VEHICLE,
    HEADING_EXECUTOR_APPOINTMENT, HEADING_EXECUTOR_CONSENT, HEADING_GUARDIAN_APPOINTMENT,
    HEADING_GUARDIAN_CONSENT, HEADING_WITNESSES, SECTION_DIGITAL_MISC_ASSETS, SECTION_FINANCIAL_ASSETS,
    SECTION_IMMOVABLE_PROPERTY, SECTION_INTELLECTUAL_PROPERTY, SECTION_MOTOR_VEHICLES,
    SECTION_PERSONAL_VALUABLES, SECTION_SPECIAL_INSTRUCTIONS, TITLE_WILL,
)

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

# Spelled-out day-of-month ordinals ("Seventeenth", not "17th") — legal-
# document phrasing for the execution-date clause.
_ORDINAL_WORDS = [
    "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
    "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth",
    "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second", "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth",
    "Twenty-Sixth", "Twenty-Seventh", "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First",
]


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


def ordinal_in_words(n) -> str:
    """Same output as web/src/utils/format.ts's ordinalInWords() — the
    spelled-out day-of-month used in execution-date phrasing, e.g. 17 ->
    "Seventeenth" (as opposed to ordinal()'s numeric "17th")."""
    num = _int(n)
    if num is None or not (1 <= num <= 31):
        return esc(n)
    return _ORDINAL_WORDS[num - 1]


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


def _testator_relation(testator: dict) -> str:
    """Testator.relation is a lowercase code ("son"/"daughter"/"wife"),
    printed as-is in the opening clause ("<relation> of <name>") — except
    "other", which pairs with the free-text relationOther box (see
    web/src/data/options.ts's TESTATOR_RELATION_OPTIONS)."""
    value = testator.get("relationOther") if testator.get("relation") == "other" else testator.get("relation")
    return esc(value) if value else ""


def _gender_display(testator: dict) -> str:
    """testator.gender is stored as "male"/"female" — printed as "Male"/
    "Female" in the opening clause, not the raw lowercase code."""
    gender = testator.get("gender")
    return "Male" if gender == "male" else "Female" if gender == "female" else BLANK


def occupation_of(item: dict) -> str:
    value = item.get("occupationOther") if item.get("occupation") == "Other" else item.get("occupation")
    return esc(value) if value else ""


def v(d: dict, key: str, fallback: str = BLANK) -> str:
    value = (d or {}).get(key)
    return esc(value) if value else fallback


def _format_aadhaar(value) -> str:
    """XXXX XXXX XXXX — spaced every 4 digits, matching the physical Aadhaar
    card's printed format. Only reformats when the value has exactly 12
    digits (ignoring any spaces/hyphens already typed in); anything else
    (partial, non-numeric) prints as-is via esc(), unchanged."""
    digits = re.sub(r"\D", "", str(value))
    if len(digits) == 12:
        return " ".join(digits[i:i + 4] for i in range(0, 12, 4))
    return esc(value)


def v_aadhaar(d: dict, key: str, fallback: str = BLANK) -> str:
    value = (d or {}).get(key)
    return _format_aadhaar(value) if value else fallback


def _national(d: dict, key: str = "nationality") -> str:
    value = (d or {}).get(key)
    return f"{esc(value)} national" if value else BLANK


def _dob_display(value) -> str:
    """"17/03/1990" — every Date of Birth printed in this document (testator,
    witnesses, asset beneficiaries, executor, guardian, residuary entries)
    goes through this one function. `value` is whatever a native
    `<input type="date">` produced ("YYYY-MM-DD"); a blank/unset value stays
    "___". Mirrors web/src/utils/format.ts's formatDOB()."""
    if not value:
        return "___"
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", str(value))
    if not match:
        return esc(value)
    y, m, d = match.groups()
    return f"{d}/{m}/{y}"


def _id_type_label(id_type) -> str:
    """"Aadhaar Card"/"PAN Card" (the ID_TYPES dropdown values — see
    web/src/data/options.ts) print as plain "Aadhaar"/"PAN" wherever this
    document composes "<id type> Number" — other ID types (Passport, Voter
    ID, Driving Licence) are unaffected since they don't carry a trailing
    "Card"."""
    text = esc(id_type)
    return text[: -len(" Card")] if text.endswith(" Card") else text


def _id_number_display(id_type, value) -> str:
    """Formats a generic ID number for display — Aadhaar values (identified
    by the accompanying ID Type, e.g. an asset/executor/guardian ID field
    left on its default "Aadhaar Card" selection) get the same XXXX XXXX
    XXXX spacing as the dedicated aadhaarNumber fields (see
    v_aadhaar/_format_aadhaar); every other ID type prints as-is."""
    if not value:
        return BLANK
    return _format_aadhaar(value) if _id_type_label(id_type) == "Aadhaar" else esc(value)


def _filled(items) -> list:
    return [it for it in (items or []) if isinstance(it, dict) and str(it.get("description") or "").strip()]


def _filled_residue(entries) -> list:
    """Mirrors web/src/utils/willValidation.ts's residue "in use" check
    (relation, name, or org name filled in) — an untouched, still-blank
    residue row (the wizard starts with one) shouldn't produce a Residuary
    Beneficiary clause with nothing in it."""
    return [
        e for e in (entries or [])
        if isinstance(e, dict) and (
            str(e.get("relation") or "").strip() or str(e.get("name") or "").strip()
            or str(e.get("orgName") or "").strip()
        )
    ]


def _beneficiary_display_name(b: dict) -> str:
    """Mirrors web/src/utils/beneficiaryDisplay.ts's beneficiaryName() — an
    org beneficiary is identified by orgName, not the (blank) name field."""
    return str((b.get("orgName") if b.get("beneficiaryType") == "org" else b.get("name")) or "").strip()


def _find_beneficiary(beneficiaries: list, name) -> dict:
    """Asset items only carry a beneficiary *name* now (see
    web/src/features/create-will/WizardForms.tsx's BeneficiarySelect,
    restricted to existing Beneficiaries — no free-text "Other" escape
    hatch anymore) — their age/relationship/PAN/Aadhaar come from here,
    not from a second copy kept on the asset item itself."""
    name = str(name or "").strip()
    if not name:
        return {}
    for b in beneficiaries or []:
        if isinstance(b, dict) and _beneficiary_display_name(b) == name:
            return b
    return {}


def _render_asset_list(
    items: list, label: str, title: str, beneficiaries: list, start_index: int = 1,
    numbered: "bool | None" = None,
) -> list:
    if numbered is None:
        numbered = len(items) > 1
    lines = []
    for i, item in enumerate(items):
        prefix = f"{start_index + i} " if numbered else ""
        ben = _find_beneficiary(beneficiaries, item.get("beneficiary"))
        if ben.get("beneficiaryType") == "org":
            lines.append(
                f"{prefix}{label}: {v(item, 'description')} Bequeathed to: {v(ben, 'orgName')}, "
                f"Authorized Representative: {v(ben, 'orgRepName')}, "
                f"Registration / Tax ID Number: {v(ben, 'orgRegNumber')}, "
                f"Registered Office Address: {v(ben, 'orgAddress')}."
            )
        else:
            lines.append(
                f"{prefix}{label}: {v(item, 'description')} Bequeathed to: {v(item, 'beneficiary')}, "
                f"date of birth {_dob_display(ben.get('dateOfBirth'))}, {esc(ben.get('maritalStatus')) or BLANK}, "
                f"Relation to {title}: {rel_of(ben) or BLANK}, "
                f"resident of {v(ben, 'address')}, "
                f"having PAN {v(ben, 'pan')}, Aadhaar Number {v_aadhaar(ben, 'aadhaarNumber')}."
            )
    return lines


def _witness_particular(index: int, w: dict) -> str:
    letter = chr(97 + index)
    return (
        f"{letter}) {v(w, 'name')} {esc(w.get('parentRelation')) or 'son/daughter/wife'} of {v(w, 'parentName')}, "
        f"date of birth {_dob_display(w.get('dateOfBirth'))}, {esc(w.get('maritalStatus')) or 'unmarried/married'}, "
        f"{_national(w)}, occupation {occupation_of(w) or BLANK}, resident of {v(w, 'address')}, "
        f"having PAN Number {v(w, 'pan')}, Aadhaar Number {v_aadhaar(w, 'aadhaarNumber')}"
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
        f"I, {v(testator, 'fullName')}, {_gender_display(testator)}, "
        f"having PAN {v(testator, 'pan')}, Aadhaar Number {v_aadhaar(testator, 'aadhaarNumber')}, "
        f"{_testator_relation(testator)} of {v(testator, 'parentSpouseName')}, "
        f"date of birth {_dob_display(testator.get('dateOfBirth'))}, "
        f"{marital_status}, {_national(testator)}, occupation {occupation_of(testator) or BLANK}, "
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
            f", I am married to {v(testator, 'spouseName')}, "
            f"having Aadhaar Number {v_aadhaar(testator, 'spouseAadhaarNumber')}, "
            f"PAN Number {v(testator, 'spousePan')} "
            f"and I have {son_count} son, namely, {son_join} and {daughter_count} daughter, namely, {daughter_join}"
        )
    witness_particulars = _witness_particulars_text(witnesses)
    clause += f". And on {execution_date_str}, and in the presence of two following witnesses:<br/>{witness_particulars}make my last and final will."
    return clause


def _residue_clause(entries: list, title: str) -> str:
    prefix = "the following, in equal shares: " if len(entries) > 1 else ""
    parts = []
    for i, entry in enumerate(entries):
        id_type = entry.get("idType") or "Aadhaar Card"
        suffix = "; " if i < len(entries) - 1 else "."
        if entry.get("beneficiaryType") == "org":
            parts.append(
                f"{v(entry, 'orgName')}, "
                f"Authorized Representative: {v(entry, 'orgRepName')}, "
                f"Registration / Tax ID Number: {v(entry, 'orgRegNumber')}, "
                f"Registered Office Address: {v(entry, 'orgAddress')}{suffix}"
            )
        else:
            parts.append(
                f"{v(entry, 'name')}, date of birth {_dob_display(entry.get('dateOfBirth'))}, "
                f"{esc(entry.get('maritalStatus')) or BLANK}, "
                f"Relation to {title}: {rel_of(entry) or BLANK}, {_national(entry)}, "
                f"occupation {occupation_of(entry) or BLANK}, resident of {v(entry, 'address')}, "
                f"having {_id_type_label(id_type)} "
                f"Number: {_id_number_display(id_type, entry.get('idNumber'))}{suffix}"
            )
    return (
        "I hereby declare, direct, and devise that all the Rest and Residue of my estate, including any "
        "property or assets, both movable and immovable, which I may acquire after the execution of this "
        "Will, or which has been inadvertently omitted from this document, shall be given entirely to "
        f"{prefix}{''.join(parts)}"
    )


def _executor_appointment_clause(executor: dict, title: str) -> str:
    if executor.get("executorType") == "org":
        return (
            f"I appoint {v(executor, 'orgName')}, with Authorized Representative / "
            f"Contact Person: {v(executor, 'orgRepName')}, having Registration / Tax ID Number: "
            f"{v(executor, 'orgRegNumber')}, and having Registered Office Address: {v(executor, 'orgAddress')}."
        )
    return (
        f"I appoint {v(executor, 'name')}, date of birth {_dob_display(executor.get('dateOfBirth'))}, "
        f"Relation to {title}: {rel_of(executor) or BLANK}, "
        f"Occupation: {occupation_of(executor) or BLANK}, "
        f"resident of {v(executor, 'address')}, having {_id_type_label(executor.get('idType')) or ''} "
        f"Number: {_id_number_display(executor.get('idType'), executor.get('idNumber'))}."
    )


def _guardian_appointment_clause(guardian: dict, title: str) -> str:
    return (
        f"I appoint {v(guardian, 'name')}, date of birth {_dob_display(guardian.get('dateOfBirth'))}, "
        f"Relation to {title}: {rel_of(guardian) or BLANK}, "
        f"Occupation: {occupation_of(guardian) or BLANK}, resident of {v(guardian, 'address')}, "
        f"having {_id_type_label(guardian.get('idType')) or ''} "
        f"Number: {_id_number_display(guardian.get('idType'), guardian.get('idNumber'))}."
    )


def build_pdf_context(will: dict) -> dict:
    testator = will.get(FLD_TESTATOR) or {}
    executor = will.get(FLD_EXECUTOR) or {}
    guardian = will.get(FLD_GUARDIAN) or {}
    all_india_assets = will.get(FLD_ALL_INDIA_ASSETS) or {}
    all_india_residue = _filled_residue(will.get("allIndiaResidue"))
    witnesses = will.get(FLD_WITNESSES) or []
    beneficiaries = will.get("beneficiaries") or []

    if testator.get(FLD_SIGN_DAY) and testator.get(FLD_SIGN_MONTH) and testator.get(FLD_SIGN_YEAR):
        execution_date_str = (
            f"{ordinal_in_words(testator[FLD_SIGN_DAY])} day of {esc(testator[FLD_SIGN_MONTH])} "
            f"of the year {year_in_words(testator[FLD_SIGN_YEAR])}"
        )
    else:
        execution_date_str = "____________________"

    gender = testator.get("gender")
    title = "Testator" if gender == "male" else "Testatrix" if gender == "female" else "Testator/Testatrix"

    house_flat = _filled(all_india_assets.get("houseFlat"))
    land_plot = _filled(all_india_assets.get("landPlot"))
    commercial_property = _filled(all_india_assets.get("commercialProperty"))
    vehicle = _filled(all_india_assets.get("vehicle"))
    jewellery = _filled(all_india_assets.get("jewellery"))
    social_media_digital = _filled(all_india_assets.get("socialMediaDigital"))
    intellectual_property = _filled(all_india_assets.get("intellectualProperty"))
    special_instructions = esc((will.get("specialInstructions") or "").strip()) or None

    has_immovable = bool(house_flat or land_plot or commercial_property)
    has_vehicle = bool(vehicle)
    has_personal = bool(jewellery)
    has_social_digital = bool(social_media_digital)
    has_intellectual_property = bool(intellectual_property)
    has_special_instructions = bool(special_instructions)

    next_letter = ord("B")
    letter_immovable = letter_vehicle = letter_personal = ""
    letter_social_digital = letter_intellectual_property = letter_special_instructions = ""
    if has_immovable:
        letter_immovable, next_letter = chr(next_letter), next_letter + 1
    if has_vehicle:
        letter_vehicle, next_letter = chr(next_letter), next_letter + 1
    if has_personal:
        letter_personal, next_letter = chr(next_letter), next_letter + 1
    if has_social_digital:
        letter_social_digital, next_letter = chr(next_letter), next_letter + 1
    if has_intellectual_property:
        letter_intellectual_property, next_letter = chr(next_letter), next_letter + 1
    if has_special_instructions:
        letter_special_instructions, next_letter = chr(next_letter), next_letter + 1

    executor_type = executor.get("executorType") or "individual"

    # House/Flat, Land/Plot, and Commercial Property all sit under the one
    # "Immovable Property" section letter, so their item numbers run
    # continuously across all three (1, 2, 3...) instead of each category
    # restarting its own (1), (2) — matches every other numbered section,
    # which has only a single category and so never showed this bug.
    immovable_numbered = (len(house_flat) + len(land_plot) + len(commercial_property)) > 1
    house_flat_lines = _render_asset_list(
        house_flat, ASSET_LABEL_HOUSE_FLAT, title, beneficiaries, 1, immovable_numbered,
    )
    land_plot_lines = _render_asset_list(
        land_plot, ASSET_LABEL_LAND_PLOT, title, beneficiaries, len(house_flat) + 1, immovable_numbered,
    )
    commercial_property_lines = _render_asset_list(
        commercial_property, ASSET_LABEL_COMMERCIAL_PROPERTY, title, beneficiaries,
        len(house_flat) + len(land_plot) + 1, immovable_numbered,
    )

    return {
        "blank": BLANK,
        "title": title,
        "title_will": TITLE_WILL,
        "section_title_financial_assets": SECTION_FINANCIAL_ASSETS,
        "section_title_immovable": SECTION_IMMOVABLE_PROPERTY,
        "section_title_vehicle": SECTION_MOTOR_VEHICLES,
        "section_title_personal": SECTION_PERSONAL_VALUABLES,
        "section_title_social_digital": SECTION_DIGITAL_MISC_ASSETS,
        "section_title_intellectual_property": SECTION_INTELLECTUAL_PROPERTY,
        "section_title_special_instructions": SECTION_SPECIAL_INSTRUCTIONS,
        "heading_witnesses": HEADING_WITNESSES,
        "heading_executor_appointment": HEADING_EXECUTOR_APPOINTMENT,
        "heading_executor_consent": HEADING_EXECUTOR_CONSENT,
        "heading_guardian_appointment": HEADING_GUARDIAN_APPOINTMENT,
        "heading_guardian_consent": HEADING_GUARDIAN_CONSENT,
        "opening_clause": _opening_clause(testator, witnesses, execution_date_str),
        "has_immovable": has_immovable,
        "has_vehicle": has_vehicle,
        "has_personal": has_personal,
        "has_social_digital": has_social_digital,
        "has_intellectual_property": has_intellectual_property,
        "letter_immovable": letter_immovable,
        "letter_vehicle": letter_vehicle,
        "letter_personal": letter_personal,
        "letter_social_digital": letter_social_digital,
        "letter_intellectual_property": letter_intellectual_property,
        "letter_special_instructions": letter_special_instructions,
        "house_flat_lines": house_flat_lines,
        "land_plot_lines": land_plot_lines,
        "commercial_property_lines": commercial_property_lines,
        "vehicle_lines": _render_asset_list(vehicle, ASSET_LABEL_VEHICLE, title, beneficiaries),
        "jewellery_lines": _render_asset_list(jewellery, ASSET_LABEL_JEWELLERY, title, beneficiaries),
        "social_media_digital_lines": _render_asset_list(
            social_media_digital, ASSET_LABEL_SOCIAL_MEDIA_DIGITAL, title, beneficiaries,
        ),
        "intellectual_property_lines": _render_asset_list(
            intellectual_property, ASSET_LABEL_INTELLECTUAL_PROPERTY, title, beneficiaries,
        ),
        "has_residue": bool(all_india_residue),
        "residue_clause": _residue_clause(all_india_residue, title),
        "special_instructions": special_instructions,
        "testator_full_name": v(testator, "fullName"),
        "testator_sign_place": v(testator, "signPlace"),
        "execution_date_str": execution_date_str,
        "witnesses": [{"name": v(w, "name")} for w in witnesses],
        "show_executor": bool(executor.get("wantsExecutor")),
        "executor_type": executor_type,
        "executor_appointment_clause": _executor_appointment_clause(executor, title),
        "executor_consent_who": (
            "the Authorized Representative of the Organization mentioned"
            if executor_type == "org" else "the Executor of the Organization mentioned"
        ),
        "executor_label_suffix": " / Representative" if executor_type == "org" else "",
        "executor_consent_name": v(executor, "orgRepName") if executor_type == "org" else v(executor, "name"),
        "show_guardian": bool(guardian.get("hasMinors")),
        "guardian_appointment_clause": _guardian_appointment_clause(guardian, title),
        "guardian_name": v(guardian, "name"),
    }
