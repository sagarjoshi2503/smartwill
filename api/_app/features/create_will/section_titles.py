"""Single source of truth for every section/subsection title printed in the
All India Will PDF — pdf_context.py hands these to
templates/all_india_will.yaml.j2 as context variables (see
build_pdf_context's section_title_*/heading_*/asset_label_* keys), and the
template never spells a section name out as a literal string itself.
Renaming a section (heading or lettered subsection) or an asset line's
label prefix means editing exactly one constant here — never a string
buried in pdf_context.py's composition functions or in the .yaml.j2 file.
"""

TITLE_WILL = "WILL"

# Section subheadings (the lettered "A. ...:", "B. ...:" lines) — the
# leading letter and trailing colon are added where these are used, not
# part of the title itself, since the letter is assigned dynamically
# (see build_pdf_context's letter_* fields).
SECTION_FINANCIAL_ASSETS = "Financial Assets"
SECTION_IMMOVABLE_PROPERTY = "Immovable Property"
SECTION_MOTOR_VEHICLES = "Motor Vehicles"
SECTION_PERSONAL_VALUABLES = "Personal & Valuables"
SECTION_DIGITAL_MISC_ASSETS = "Digital & Miscellaneous Assets"
SECTION_INTELLECTUAL_PROPERTY = "Intellectual Property"
SECTION_SPECIAL_INSTRUCTIONS = "Special Non-Asset Instructions"

# Page headings (printed in caps — see pdf_generator.py's "heading" block type).
HEADING_WITNESSES = "WITNESSES"
HEADING_EXECUTOR_APPOINTMENT = "Appointment of Executor for this Will"
HEADING_EXECUTOR_CONSENT = "Executor's Consent"
HEADING_GUARDIAN_APPOINTMENT = "Appointment of Guardian for Minor Beneficiary"
HEADING_GUARDIAN_CONSENT = "Guardian's Consent"

# Per-line label prefixes used inside a rendered asset list (e.g. "House /
# Flat: <description> Bequeathed to: ..."), independent from the section
# subheading text above — several of these categories share one section
# (Immovable Property covers House/Flat, Land/Plot, and Commercial Property).
ASSET_LABEL_HOUSE_FLAT = "House / Flat"
ASSET_LABEL_LAND_PLOT = "Land / Plot"
ASSET_LABEL_COMMERCIAL_PROPERTY = "Commercial Property"
ASSET_LABEL_VEHICLE = "Vehicle / Car"
ASSET_LABEL_JEWELLERY = "Jewellery & Heirlooms"
ASSET_LABEL_SOCIAL_MEDIA_DIGITAL = "Social Media / Digital"
ASSET_LABEL_INTELLECTUAL_PROPERTY = "Intellectual Property"
