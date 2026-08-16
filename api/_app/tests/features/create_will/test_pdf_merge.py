import pytest

from _app.core.exceptions import AppError
from _app.features.create_will.pdf_merge import merge_id_fields


def test_merges_testator_executor_guardian_id_fields():
    will_data = {
        "testator": {"fullName": "Jane Doe", "pan": "", "aadhaarNumber": "", "spouseAadhaarNumber": ""},
        "executor": {"name": "Bob", "idNumber": "", "jointIdNumber": "", "subIdNumber": ""},
        "guardian": {"name": "Carol", "idNumber": "", "subIdNumber": ""},
        "residualIdNumber": "",
    }
    id_fields = {
        "testator": {"pan": "AAAAA1111A", "aadhaarNumber": "111122223333", "spouseAadhaarNumber": "444455556666"},
        "executor": {"idNumber": "BBBBB2222B", "jointIdNumber": "CCCCC3333C", "subIdNumber": "DDDDD4444D"},
        "guardian": {"idNumber": "EEEEE5555E", "subIdNumber": "FFFFF6666F"},
        "residualIdNumber": "GGGGG7777G",
    }

    merged = merge_id_fields(will_data, id_fields)

    assert merged["testator"]["pan"] == "AAAAA1111A"
    assert merged["testator"]["aadhaarNumber"] == "111122223333"
    assert merged["testator"]["spouseAadhaarNumber"] == "444455556666"
    assert merged["testator"]["fullName"] == "Jane Doe"  # untouched
    assert merged["executor"]["idNumber"] == "BBBBB2222B"
    assert merged["executor"]["jointIdNumber"] == "CCCCC3333C"
    assert merged["executor"]["subIdNumber"] == "DDDDD4444D"
    assert merged["executor"]["name"] == "Bob"  # untouched
    assert merged["guardian"]["idNumber"] == "EEEEE5555E"
    assert merged["guardian"]["subIdNumber"] == "FFFFF6666F"
    assert merged["residualIdNumber"] == "GGGGG7777G"


def test_merges_witnesses_and_all_india_assets_and_residue_by_index():
    will_data = {
        "witnesses": [{"name": "Wit One", "aadhaarNumber": ""}, {"name": "Wit Two", "aadhaarNumber": ""}],
        "allIndiaAssets": {
            "houseFlat": [{"description": "Flat 1", "idNumber": ""}],
            "vehicle": [],
        },
        "allIndiaResidue": [{"name": "Res One", "idNumber": ""}],
    }
    id_fields = {
        "witnesses": [{"aadhaarNumber": "111111111111"}, {"aadhaarNumber": "222222222222"}],
        "allIndiaAssets": {"houseFlat": [{"idNumber": "HHHHH8888H"}]},
        "allIndiaResidue": [{"idNumber": "JJJJJ9999J"}],
    }

    merged = merge_id_fields(will_data, id_fields)

    assert merged["witnesses"][0]["aadhaarNumber"] == "111111111111"
    assert merged["witnesses"][1]["aadhaarNumber"] == "222222222222"
    assert merged["witnesses"][0]["name"] == "Wit One"  # untouched
    assert merged["allIndiaAssets"]["houseFlat"][0]["idNumber"] == "HHHHH8888H"
    assert merged["allIndiaAssets"]["houseFlat"][0]["description"] == "Flat 1"  # untouched
    assert merged["allIndiaAssets"]["vehicle"] == []
    assert merged["allIndiaResidue"][0]["idNumber"] == "JJJJJ9999J"


def test_empty_or_missing_id_fields_leave_will_data_untouched():
    will_data = {"testator": {"fullName": "Jane Doe", "pan": ""}}
    assert merge_id_fields(will_data, {}) == will_data
    assert merge_id_fields(will_data, None) == will_data


def test_missing_nested_objects_are_tolerated():
    will_data = {"testator": {"fullName": "Jane Doe", "pan": ""}}
    merged = merge_id_fields(will_data, {"executor": {"idNumber": "X"}})
    assert merged == will_data


def test_mismatched_array_length_raises_app_error():
    will_data = {"witnesses": [{"name": "Wit One", "aadhaarNumber": ""}, {"name": "Wit Two", "aadhaarNumber": ""}]}
    id_fields = {"witnesses": [{"aadhaarNumber": "111111111111"}]}  # only one, DB has two

    with pytest.raises(AppError) as exc_info:
        merge_id_fields(will_data, id_fields)
    assert exc_info.value.status_code == 400


def test_non_dict_will_data_passed_through_unchanged():
    assert merge_id_fields(None, {"testator": {"pan": "X"}}) is None
