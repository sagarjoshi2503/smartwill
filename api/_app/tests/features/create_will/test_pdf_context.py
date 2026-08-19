from _app.features.create_will.pdf_context import (
    build_pdf_context, date_ddmmyyyy, number_to_words, occupation_of, ordinal, rel_of, year_in_words,
)


# --- ordinal / number-to-words / date formatting ---

def test_ordinal_handles_special_cases():
    assert ordinal(1) == "1st"
    assert ordinal(2) == "2nd"
    assert ordinal(3) == "3rd"
    assert ordinal(4) == "4th"
    assert ordinal(11) == "11th"
    assert ordinal(12) == "12th"
    assert ordinal(13) == "13th"
    assert ordinal(21) == "21st"
    assert ordinal(22) == "22nd"
    assert ordinal(31) == "31st"


def test_ordinal_non_numeric_returns_escaped_input():
    assert ordinal("abc") == "abc"


def test_number_to_words_matches_reference_examples():
    assert number_to_words(0) == "Zero"
    assert number_to_words(6) == "Six"
    assert number_to_words(20) == "Twenty"
    assert number_to_words(99) == "Ninety Nine"
    assert number_to_words(100) == "One Hundred"
    assert number_to_words(105) == "One Hundred and Five"
    assert number_to_words(2026) == "Two Thousand and Twenty Six"
    assert number_to_words(2000) == "Two Thousand"
    assert number_to_words(1001) == "One Thousand and One"


def test_year_in_words_non_numeric_falls_back_to_string():
    assert year_in_words("unknown") == "unknown"


def test_date_ddmmyyyy_formats_and_pads():
    assert date_ddmmyyyy(3, "August", 2026) == "03/08/2026"
    assert date_ddmmyyyy("14", "August", "2026") == "14/08/2026"


def test_date_ddmmyyyy_returns_empty_for_bad_input():
    assert date_ddmmyyyy(None, "August", 2026) == ""
    assert date_ddmmyyyy(3, "Augustt", 2026) == ""


# --- relOf / occupationOf ---

def test_rel_of_uses_other_field_when_relation_is_other():
    assert rel_of({"relation": "Other", "relationOther": "Cousin"}) == "Cousin"
    assert rel_of({"relation": "Son", "relationOther": ""}) == "Son"
    assert rel_of({}) == ""


def test_occupation_of_uses_other_field_when_occupation_is_other():
    assert occupation_of({"occupation": "Other", "occupationOther": "Farmer"}) == "Farmer"
    assert occupation_of({"occupation": "Business"}) == "Business"


# --- build_pdf_context: asset filtering + dynamic section lettering ---

def _will(**overrides):
    base = {
        "testator": {"fullName": "Jane Doe", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []},
        "executor": {"wantsExecutor": False},
        "guardian": {"hasMinors": False},
        "allIndiaAssets": {
            "houseFlat": [], "landPlot": [], "commercialProperty": [], "vehicle": [],
            "jewellery": [], "socialMediaDigital": [], "intellectualProperty": [],
        },
        "allIndiaResidue": [],
        "witnesses": [],
    }
    base.update(overrides)
    return base


def test_empty_asset_categories_produce_no_asset_sections():
    ctx = build_pdf_context(_will())
    assert ctx["has_immovable"] is False
    assert ctx["has_vehicle"] is False
    assert ctx["has_personal"] is False
    assert ctx["has_social_digital"] is False
    assert ctx["has_intellectual_property"] is False
    assert ctx["letter_immovable"] == ""


def test_asset_item_without_description_is_treated_as_not_filled_in():
    will = _will()
    will["allIndiaAssets"]["houseFlat"] = [{"description": "", "beneficiary": "Bob"}]
    ctx = build_pdf_context(will)
    assert ctx["has_immovable"] is False
    assert ctx["house_flat_lines"] == []


def test_section_lettering_skips_empty_categories():
    will = _will()
    will["allIndiaAssets"]["vehicle"] = [{"description": "Car", "beneficiary": "Bob", "relation": "Son", "idNumber": "X"}]
    will["allIndiaAssets"]["intellectualProperty"] = [{"description": "Book", "beneficiary": "Bob", "relation": "Son", "idNumber": "Y"}]
    ctx = build_pdf_context(will)
    # Immovable/personal/social-digital are all empty, so vehicle gets "B" and
    # intellectual property gets "C" — matches AllIndiaWillDocument.tsx's
    # dynamic letterImmovable/letterVehicle/... assignment.
    assert ctx["letter_immovable"] == ""
    assert ctx["letter_vehicle"] == "B"
    assert ctx["letter_personal"] == ""
    assert ctx["letter_social_digital"] == ""
    assert ctx["letter_intellectual_property"] == "C"


def test_multiple_items_in_one_category_are_numbered():
    will = _will()
    will["allIndiaAssets"]["vehicle"] = [
        {"description": "Car 1", "beneficiary": "Bob", "relation": "Son", "idNumber": "X"},
        {"description": "Car 2", "beneficiary": "Amy", "relation": "Daughter", "idNumber": "Y"},
    ]
    ctx = build_pdf_context(will)
    assert ctx["vehicle_lines"][0].startswith("1 Vehicle / Car: Car 1")
    assert ctx["vehicle_lines"][1].startswith("2 Vehicle / Car: Car 2")


def test_single_item_in_a_category_is_not_numbered():
    will = _will()
    will["allIndiaAssets"]["vehicle"] = [{"description": "Car 1", "beneficiary": "Bob", "relation": "Son", "idNumber": "X"}]
    ctx = build_pdf_context(will)
    assert ctx["vehicle_lines"][0].startswith("Vehicle / Car: Car 1")


# --- executor / guardian visibility + title resolution ---

def test_show_executor_and_guardian_flags():
    will = _will(executor={"wantsExecutor": True, "executorType": "individual"}, guardian={"hasMinors": True})
    ctx = build_pdf_context(will)
    assert ctx["show_executor"] is True
    assert ctx["show_guardian"] is True


def test_executor_org_vs_individual_clause():
    org = build_pdf_context(_will(executor={"wantsExecutor": True, "executorType": "org", "orgName": "Acme LLP"}))
    assert "Organization / Entity Name: Acme LLP" in org["executor_appointment_clause"]
    assert org["executor_consent_who"] == "the Authorized Representative of the Organization mentioned"
    assert org["executor_label_suffix"] == " / Representative"

    individual = build_pdf_context(_will(executor={"wantsExecutor": True, "executorType": "individual", "name": "Bob"}))
    assert individual["executor_appointment_clause"].startswith("I appoint Bob")
    assert individual["executor_consent_who"] == "the Executor of the Organization mentioned"
    assert individual["executor_label_suffix"] == ""


def test_title_resolution_by_gender():
    assert build_pdf_context(_will(testator={"fullName": "Jane", "gender": "male", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []}))["title"] == "Testator"
    assert build_pdf_context(_will(testator={"fullName": "Jane", "gender": "female", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []}))["title"] == "Testatrix"
    assert build_pdf_context(_will(testator={"fullName": "Jane", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []}))["title"] == "Testator/Testatrix"


# --- XML-escaping of user-supplied text (ReportLab's Paragraph parses a
# small XML-like markup subset, so & < > must be escaped in composed text) ---

def test_special_characters_are_xml_escaped_in_composed_clauses():
    will = _will(testator={
        "fullName": "M&M <Corp>", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": [],
    })
    ctx = build_pdf_context(will)
    assert "M&amp;M &lt;Corp&gt;" in ctx["opening_clause"]
    assert "<Corp>" not in ctx["opening_clause"]
