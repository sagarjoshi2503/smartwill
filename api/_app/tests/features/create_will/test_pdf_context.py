from _app.features.create_will.pdf_context import (
    BLANK, _dob_display, _format_aadhaar, _id_number_display, build_pdf_context, date_ddmmyyyy, number_to_words,
    occupation_of, ordinal, rel_of, v_aadhaar, year_in_words,
)


# --- date of birth formatting ---

def test_dob_display_formats_iso_date_as_ddmmyyyy():
    assert _dob_display("1990-06-20") == "20/06/1990"


def test_dob_display_blank_when_missing():
    assert _dob_display(None) == "___"
    assert _dob_display("") == "___"


def test_dob_display_escapes_non_iso_input_instead_of_reformatting():
    assert _dob_display("not-a-date") == "not-a-date"


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


# --- asset bequest lines: beneficiary marital status + address ---

def test_asset_line_includes_beneficiary_marital_status_and_address():
    will = _will(
        beneficiaries=[{
            "name": "Bob", "dateOfBirth": "1986-01-15", "maritalStatus": "Married", "relation": "Son",
            "address": "123 Main St", "pan": "ABCDE1234F", "aadhaarNumber": "111122223333",
        }],
    )
    will["allIndiaAssets"]["vehicle"] = [{"description": "Car 1", "beneficiary": "Bob"}]
    ctx = build_pdf_context(will)
    line = ctx["vehicle_lines"][0]
    assert "date of birth 15/01/1986, Married," in line
    assert "resident of 123 Main St" in line
    assert "Relation to Testator/Testatrix: Son" in line


def test_asset_line_falls_back_to_blank_when_beneficiary_marital_status_missing():
    will = _will(beneficiaries=[{"name": "Bob"}])
    will["allIndiaAssets"]["vehicle"] = [{"description": "Car 1", "beneficiary": "Bob"}]
    ctx = build_pdf_context(will)
    assert f", {BLANK}," in "".join(ctx["vehicle_lines"])


def test_asset_line_uses_org_block_when_beneficiary_is_an_organization():
    will = _will(
        beneficiaries=[{
            "beneficiaryType": "org", "orgName": "ABC Foundation Trust", "orgRepName": "Priya Mehta",
            "orgRegNumber": "REG123", "orgAddress": "789 Trust Rd",
        }],
    )
    will["allIndiaAssets"]["vehicle"] = [{"description": "Car 1", "beneficiary": "ABC Foundation Trust"}]
    line = build_pdf_context(will)["vehicle_lines"][0]
    assert "Bequeathed to: ABC Foundation Trust (Entity Name)" in line
    assert "Authorized Representative: Priya Mehta" in line
    assert "Registration / Tax ID Number: REG123" in line
    assert "Registered Office Address: 789 Trust Rd" in line
    assert "date of birth" not in line


# --- residue clause: marital status + "Relation to Testator:" label ---

def test_residue_clause_includes_marital_status_and_relation_label():
    will = _will(
        testator={"fullName": "Jane", "gender": "male", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []},
        allIndiaResidue=[{
            "name": "Sam", "dateOfBirth": "1990-06-20", "maritalStatus": "Widowed", "relation": "Brother",
            "nationality": "Indian", "occupation": "Business", "address": "456 Park Ave",
            "idType": "PAN Card", "idNumber": "SAMPN1234E",
        }],
    )
    clause = build_pdf_context(will)["residue_clause"]
    assert "Sam, date of birth 20/06/1990, Widowed, Relation to Testator: Brother" in clause


def test_residue_clause_multiple_entries_each_carry_relation_label():
    will = _will(
        allIndiaResidue=[
            {"name": "Sam", "dateOfBirth": "1990-06-20", "maritalStatus": "Widowed", "relation": "Brother", "idType": "PAN Card", "idNumber": "A"},
            {"name": "Amy", "dateOfBirth": "1995-09-01", "maritalStatus": "Married", "relation": "Sister", "idType": "PAN Card", "idNumber": "B"},
        ],
    )
    clause = build_pdf_context(will)["residue_clause"]
    assert "Relation to Testator/Testatrix: Brother" in clause
    assert "Relation to Testator/Testatrix: Sister" in clause


def test_residue_clause_uses_org_block_when_beneficiary_is_an_organization():
    will = _will(
        allIndiaResidue=[{
            "beneficiaryType": "org", "orgName": "XYZ Charitable Trust", "orgRepName": "Amit Rao",
            "orgRegNumber": "REG999", "orgAddress": "12 Charity Lane",
        }],
    )
    clause = build_pdf_context(will)["residue_clause"]
    assert "XYZ Charitable Trust (Entity Name)" in clause
    assert "Authorized Representative: Amit Rao" in clause
    assert "Registration / Tax ID Number: REG999" in clause
    assert "Registered Office Address: 12 Charity Lane" in clause
    assert "date of birth" not in clause


# --- Special Non-Asset Instructions: fixed lead-in sentence (template-level) ---

def test_special_instructions_context_value_unchanged_lead_in_lives_in_template():
    # The fixed lead-in sentence ("I hereby direct my Executor and family
    # members...") is static boilerplate added directly in
    # all_india_will.yaml.j2, not composed here — this just confirms the
    # context still passes through the testator's free text untouched.
    ctx = build_pdf_context(_will(specialInstructions="Please look after my dog."))
    assert ctx["special_instructions"] == "Please look after my dog."


# --- opening clause: spouse Aadhaar-before-PAN order/wording ---

def test_opening_clause_spouse_aadhaar_before_pan():
    will = _will(testator={
        "fullName": "Jane", "maritalStatus": "married", "sonNames": [], "daughterNames": [],
        "spouseName": "John", "spousePan": "SPOUS1234E", "spouseAadhaarNumber": "444455556666",
    })
    clause = build_pdf_context(will)["opening_clause"]
    aadhaar_pos = clause.index("Aadhaar Number 4444 5555 6666")
    pan_pos = clause.index("PAN Number SPOUS1234E")
    assert aadhaar_pos < pan_pos


# --- XML-escaping of user-supplied text (ReportLab's Paragraph parses a
# small XML-like markup subset, so & < > must be escaped in composed text) ---

def test_special_characters_are_xml_escaped_in_composed_clauses():
    will = _will(testator={
        "fullName": "M&M <Corp>", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": [],
    })
    ctx = build_pdf_context(will)
    assert "M&amp;M &lt;Corp&gt;" in ctx["opening_clause"]
    assert "<Corp>" not in ctx["opening_clause"]


# --- Aadhaar number formatting (printed unmasked on the generated document) ---

def test_format_aadhaar_spaces_a_clean_12_digit_value_in_groups_of_4():
    assert _format_aadhaar("111122223333") == "1111 2222 3333"


def test_format_aadhaar_strips_existing_spaces_and_hyphens_before_counting_digits():
    assert _format_aadhaar("1111-2222-3333") == "1111 2222 3333"
    assert _format_aadhaar("1111 2222 3333") == "1111 2222 3333"


def test_format_aadhaar_leaves_a_non_12_digit_value_as_is():
    assert _format_aadhaar("11112222") == "11112222"
    assert _format_aadhaar("1111222233334") == "1111222233334"


def test_format_aadhaar_escapes_non_numeric_input_instead_of_reformatting():
    assert _format_aadhaar("not-a-number") == "not-a-number"


def test_v_aadhaar_falls_back_to_blank_placeholder_when_missing():
    assert v_aadhaar({}, "aadhaarNumber") == "_______________________"
    assert v_aadhaar({"aadhaarNumber": ""}, "aadhaarNumber") == "_______________________"
    assert v_aadhaar({"aadhaarNumber": "444455556666"}, "aadhaarNumber") == "4444 5555 6666"


def test_id_number_display_formats_aadhaar_type_but_not_others():
    assert _id_number_display("Aadhaar Card", "777788889999") == "7777 8888 9999"
    assert _id_number_display("PAN Card", "ABCDE1234F") == "ABCDE1234F"
    assert _id_number_display("Passport", "A1234567") == "A1234567"


def test_id_number_display_blank_when_value_missing():
    assert _id_number_display("Aadhaar Card", "") == "_______________________"
    assert _id_number_display("Aadhaar Card", None) == "_______________________"
