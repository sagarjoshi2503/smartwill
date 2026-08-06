from _app.shared.constants import (
    FLD_AADHAAR_NUMBER, FLD_ALL_INDIA_ASSETS, FLD_ALL_INDIA_RESIDUE, FLD_EXECUTOR, FLD_GOAN_ASSETS,
    FLD_GOAN_DEED_WITNESSES, FLD_GOAN_RESIDUE, FLD_GOAN_SPOUSE, FLD_GOAN_TESTATOR, FLD_GOAN_WITNESSES,
    FLD_GUARDIAN, FLD_ID_NUMBER, FLD_JOINT_ID, FLD_PAN, FLD_RESIDUAL_ID, FLD_SPOUSE_AADHAAR_NUMBER,
    FLD_SUB_ID, FLD_TESTATOR, FLD_WITNESSES,
)


def _strip_fields(item, fields: tuple) -> dict:
    return {**item, **{f: "" for f in fields}} if isinstance(item, dict) else item


def _strip_list(items, fields: tuple):
    return [_strip_fields(item, fields) for item in items] if isinstance(items, list) else items


def _strip_asset_categories(assets, fields: tuple = (FLD_ID_NUMBER,)):
    return (
        {category: _strip_list(items, fields) for category, items in assets.items()}
        if isinstance(assets, dict) else assets
    )


def redact_id_numbers(will_data: dict) -> dict:
    """ID numbers (Aadhaar/PAN/etc.) are sensitive and only needed transiently
    in the browser to render the generated Will document — they must never be
    persisted to the database. Covers every ID-bearing field across both the
    All India and Goan Will shapes (see web/src/types.ts's WillState). Single
    shared implementation — every save path (testator save, admin save/
    complete) must route through this one, since a second copy has drifted
    out of sync with new fields before."""
    if not isinstance(will_data, dict):
        return will_data

    redacted = dict(will_data)
    if isinstance(redacted.get(FLD_TESTATOR), dict):
        redacted[FLD_TESTATOR] = _strip_fields(
            redacted[FLD_TESTATOR], (FLD_PAN, FLD_AADHAAR_NUMBER, FLD_SPOUSE_AADHAAR_NUMBER),
        )
    if isinstance(redacted.get(FLD_EXECUTOR), dict):
        redacted[FLD_EXECUTOR] = _strip_fields(redacted[FLD_EXECUTOR], (FLD_ID_NUMBER, FLD_JOINT_ID, FLD_SUB_ID))
    if isinstance(redacted.get(FLD_GUARDIAN), dict):
        redacted[FLD_GUARDIAN] = _strip_fields(redacted[FLD_GUARDIAN], (FLD_ID_NUMBER, FLD_SUB_ID))
    if FLD_RESIDUAL_ID in redacted:
        redacted[FLD_RESIDUAL_ID] = ""
    if isinstance(redacted.get(FLD_WITNESSES), list):
        redacted[FLD_WITNESSES] = _strip_list(redacted[FLD_WITNESSES], (FLD_AADHAAR_NUMBER,))
    if isinstance(redacted.get(FLD_ALL_INDIA_ASSETS), dict):
        redacted[FLD_ALL_INDIA_ASSETS] = _strip_asset_categories(redacted[FLD_ALL_INDIA_ASSETS])
    if isinstance(redacted.get(FLD_ALL_INDIA_RESIDUE), list):
        redacted[FLD_ALL_INDIA_RESIDUE] = _strip_list(redacted[FLD_ALL_INDIA_RESIDUE], (FLD_ID_NUMBER,))

    # Goan Will fields — independent shape from the All India fields above
    # (see web/src/types.ts's GoanPerson/GoanAssets/GoanResidueEntry/
    # GoanWitness), so each needs its own redaction rather than reusing the
    # All India handling.
    if isinstance(redacted.get(FLD_GOAN_TESTATOR), dict):
        redacted[FLD_GOAN_TESTATOR] = _strip_fields(redacted[FLD_GOAN_TESTATOR], (FLD_PAN, FLD_AADHAAR_NUMBER))
    if isinstance(redacted.get(FLD_GOAN_SPOUSE), dict):
        redacted[FLD_GOAN_SPOUSE] = _strip_fields(redacted[FLD_GOAN_SPOUSE], (FLD_PAN, FLD_AADHAAR_NUMBER))
    if isinstance(redacted.get(FLD_GOAN_ASSETS), dict):
        redacted[FLD_GOAN_ASSETS] = _strip_asset_categories(redacted[FLD_GOAN_ASSETS])
    if isinstance(redacted.get(FLD_GOAN_RESIDUE), list):
        redacted[FLD_GOAN_RESIDUE] = _strip_list(redacted[FLD_GOAN_RESIDUE], (FLD_ID_NUMBER,))
    if isinstance(redacted.get(FLD_GOAN_WITNESSES), list):
        redacted[FLD_GOAN_WITNESSES] = _strip_list(redacted[FLD_GOAN_WITNESSES], (FLD_PAN, FLD_AADHAAR_NUMBER))
    if isinstance(redacted.get(FLD_GOAN_DEED_WITNESSES), list):
        redacted[FLD_GOAN_DEED_WITNESSES] = _strip_list(
            redacted[FLD_GOAN_DEED_WITNESSES], (FLD_PAN, FLD_AADHAAR_NUMBER),
        )
    return redacted
