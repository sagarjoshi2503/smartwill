from _app.shared.validators import is_valid_email, normalize_email


# --- positive scenarios ---

def test_is_valid_email_accepts_a_well_formed_address():
    assert is_valid_email("jane@lawfirm.com") is True


def test_normalize_email_trims_and_lowercases():
    assert normalize_email("  Jane@LawFirm.com  ") == "jane@lawfirm.com"


def test_normalize_email_handles_none():
    assert normalize_email(None) == ""


# --- negative scenarios ---

def test_is_valid_email_rejects_missing_at_sign():
    assert is_valid_email("not-an-email") is False


def test_is_valid_email_rejects_missing_domain_dot():
    assert is_valid_email("jane@lawfirm") is False


def test_is_valid_email_rejects_empty_string():
    assert is_valid_email("") is False
