from _app.core.exceptions import AppError
from _app.shared.constants import (
    FLD_AADHAAR_NUMBER, FLD_ALL_INDIA_ASSETS, FLD_ALL_INDIA_RESIDUE, FLD_EXECUTOR, FLD_GUARDIAN,
    FLD_ID_NUMBER, FLD_JOINT_ID, FLD_PAN, FLD_RESIDUAL_ID, FLD_SPOUSE_AADHAAR_NUMBER, FLD_SUB_ID,
    FLD_TESTATOR, FLD_WITNESSES, HTTP_BAD_REQUEST, ID_FIELDS_LENGTH_MISMATCH,
)


def _merge_fields(item: dict, source: dict, fields: tuple) -> dict:
    if not isinstance(item, dict):
        return item
    if not isinstance(source, dict):
        return item
    merged = dict(item)
    for field in fields:
        if source.get(field):
            merged[field] = source[field]
    return merged


def _merge_list(items, source_items, fields: tuple):
    if not isinstance(items, list):
        return items
    source_items = source_items if isinstance(source_items, list) else []
    if source_items and len(source_items) != len(items):
        raise AppError(HTTP_BAD_REQUEST, ID_FIELDS_LENGTH_MISMATCH)
    return [
        _merge_fields(item, source_items[i], fields) if i < len(source_items) else item
        for i, item in enumerate(items)
    ]


def _merge_asset_categories(assets, source_assets, fields: tuple = (FLD_ID_NUMBER,)):
    if not isinstance(assets, dict):
        return assets
    source_assets = source_assets if isinstance(source_assets, dict) else {}
    return {
        category: _merge_list(items, source_assets.get(category), fields)
        for category, items in assets.items()
    }


def merge_id_fields(will_data: dict, id_fields: dict) -> dict:
    """The server-side counterpart to shared/redaction.py: merges
    client-supplied ID-number field values (never persisted to MongoDB —
    see redact_id_numbers) back into a DB-loaded will document
    immediately before PDF generation. Structurally mirrors
    redact_id_numbers's field walk exactly — every field that function
    strips is merged back in here, and only those fields.

    Arrays (witnesses, asset-category items, residue entries) merge by
    index against the DB-stored document. This is only safe because the
    caller (create_will.service.generate_will_pdf, driven by the
    frontend re-saving the Will immediately before requesting the PDF)
    guarantees the client-sent array order/length matches what's stored —
    a length mismatch raises rather than silently misaligning an ID
    number to the wrong person."""
    if not isinstance(will_data, dict):
        return will_data
    id_fields = id_fields if isinstance(id_fields, dict) else {}

    merged = dict(will_data)
    if isinstance(merged.get(FLD_TESTATOR), dict):
        merged[FLD_TESTATOR] = _merge_fields(
            merged[FLD_TESTATOR], id_fields.get(FLD_TESTATOR),
            (FLD_PAN, FLD_AADHAAR_NUMBER, FLD_SPOUSE_AADHAAR_NUMBER),
        )
    if isinstance(merged.get(FLD_EXECUTOR), dict):
        merged[FLD_EXECUTOR] = _merge_fields(
            merged[FLD_EXECUTOR], id_fields.get(FLD_EXECUTOR), (FLD_ID_NUMBER, FLD_JOINT_ID, FLD_SUB_ID),
        )
    if isinstance(merged.get(FLD_GUARDIAN), dict):
        merged[FLD_GUARDIAN] = _merge_fields(
            merged[FLD_GUARDIAN], id_fields.get(FLD_GUARDIAN), (FLD_ID_NUMBER, FLD_SUB_ID),
        )
    if FLD_RESIDUAL_ID in merged and id_fields.get(FLD_RESIDUAL_ID):
        merged[FLD_RESIDUAL_ID] = id_fields[FLD_RESIDUAL_ID]
    if isinstance(merged.get(FLD_WITNESSES), list):
        merged[FLD_WITNESSES] = _merge_list(
            merged[FLD_WITNESSES], id_fields.get(FLD_WITNESSES), (FLD_AADHAAR_NUMBER,),
        )
    if isinstance(merged.get(FLD_ALL_INDIA_ASSETS), dict):
        merged[FLD_ALL_INDIA_ASSETS] = _merge_asset_categories(
            merged[FLD_ALL_INDIA_ASSETS], id_fields.get(FLD_ALL_INDIA_ASSETS),
        )
    if isinstance(merged.get(FLD_ALL_INDIA_RESIDUE), list):
        merged[FLD_ALL_INDIA_RESIDUE] = _merge_list(
            merged[FLD_ALL_INDIA_RESIDUE], id_fields.get(FLD_ALL_INDIA_RESIDUE), (FLD_ID_NUMBER,),
        )
    return merged
