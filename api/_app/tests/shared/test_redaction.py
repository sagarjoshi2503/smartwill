from _app.shared.redaction import redact_id_numbers


def _will_data() -> dict:
    return {
        "testator": {"fullName": "T", "pan": "ABCDE1234F", "aadhaarNumber": "111122223333", "spousePan": "SPOUS1234E", "spouseAadhaarNumber": "222233334444"},
        "executor": {"name": "E", "idNumber": "EEEEE1111E", "jointIdNumber": "JJJJJ2222J", "subIdNumber": "SSSSS3333S"},
        "guardian": {"name": "G", "idNumber": "GGGGG4444G", "subIdNumber": "HHHHH5555H"},
        "residualIdNumber": "RRRRR6666R",
        "witnesses": [
            {"name": "W1", "pan": "WWWWW1111W", "aadhaarNumber": "333344445555"},
            {"name": "W2", "pan": "WWWWW2222W", "aadhaarNumber": "666677778888"},
        ],
        "allIndiaResidue": [{"beneficiary": "Bob", "idNumber": "AAAAA7777A"}],
        "goanTestator": {"fullName": "GT", "pan": "GTPAN1234E", "aadhaarNumber": "444455556666"},
        "goanSpouse": {"fullName": "GS", "pan": "GSPAN1234E", "aadhaarNumber": "777788889999"},
        "goanAssets": {"house": [{"description": "House", "idNumber": "GHOUSE111I"}]},
        "goanResidue": [{"beneficiary": "Amy", "idNumber": "GRES11112I"}],
        "goanWitnesses": [{"name": "GW1", "pan": "GWWWW1111W", "aadhaarNumber": "888899990000"}],
        "goanDeedWitnesses": [{"name": "GDW1", "pan": "GDWWW1111W", "aadhaarNumber": "999900001111"}],
    }


def test_redacts_every_id_bearing_field_across_both_will_shapes():
    redacted = redact_id_numbers(_will_data())

    assert redacted["testator"]["pan"] == ""
    assert redacted["testator"]["aadhaarNumber"] == ""
    assert redacted["testator"]["spousePan"] == ""
    assert redacted["testator"]["spouseAadhaarNumber"] == ""
    assert redacted["executor"]["idNumber"] == ""
    assert redacted["executor"]["jointIdNumber"] == ""
    assert redacted["executor"]["subIdNumber"] == ""
    assert redacted["guardian"]["idNumber"] == ""
    assert redacted["guardian"]["subIdNumber"] == ""
    assert redacted["residualIdNumber"] == ""
    assert redacted["witnesses"][0]["pan"] == ""
    assert redacted["witnesses"][0]["aadhaarNumber"] == ""
    assert redacted["witnesses"][1]["pan"] == ""
    assert redacted["allIndiaResidue"][0]["idNumber"] == ""
    assert redacted["goanTestator"]["pan"] == ""
    assert redacted["goanTestator"]["aadhaarNumber"] == ""
    assert redacted["goanSpouse"]["pan"] == ""
    assert redacted["goanSpouse"]["aadhaarNumber"] == ""
    assert redacted["goanAssets"]["house"][0]["idNumber"] == ""
    assert redacted["goanResidue"][0]["idNumber"] == ""
    assert redacted["goanWitnesses"][0]["pan"] == ""
    assert redacted["goanWitnesses"][0]["aadhaarNumber"] == ""
    assert redacted["goanDeedWitnesses"][0]["pan"] == ""
    assert redacted["goanDeedWitnesses"][0]["aadhaarNumber"] == ""


def test_preserves_non_id_fields_untouched():
    redacted = redact_id_numbers(_will_data())

    assert redacted["testator"]["fullName"] == "T"
    assert redacted["executor"]["name"] == "E"
    assert redacted["allIndiaResidue"][0]["beneficiary"] == "Bob"
    assert redacted["goanAssets"]["house"][0]["description"] == "House"


def test_beneficiary_pan_and_aadhaar_are_not_redacted():
    # allIndiaAssets carries no ID of its own (see the function's own
    # comment) — this only matters if a caller mistakenly expects
    # beneficiary-level ID numbers to be stripped here too; they aren't,
    # since extractIdFields() on the frontend has no beneficiaries entry.
    data = _will_data()
    data["beneficiaries"] = [{"name": "Bob", "pan": "BENPAN1234E", "aadhaarNumber": "121212121212"}]

    redacted = redact_id_numbers(data)

    assert redacted["beneficiaries"][0]["pan"] == "BENPAN1234E"
    assert redacted["beneficiaries"][0]["aadhaarNumber"] == "121212121212"


def test_missing_or_non_dict_sections_are_left_as_is():
    assert redact_id_numbers({"testator": None, "witnesses": "not-a-list"}) == {
        "testator": None, "witnesses": "not-a-list",
    }


def test_non_dict_input_is_returned_unchanged():
    assert redact_id_numbers("not-a-dict") == "not-a-dict"
    assert redact_id_numbers(None) is None
