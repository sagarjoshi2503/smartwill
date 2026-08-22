import type { WillState } from "../types";

// The frontend mirror of api/_app/shared/redaction.py's redact_id_numbers
// — the exact same set of fields that function strips before persisting a
// Will, extracted here instead so they can be sent to the PDF-generation
// endpoint (api/_app/features/create_will/pdf_merge.py merges them back
// into the saved draft server-side). Keep these two field lists in sync —
// a field added to one without the other will either leak into storage or
// silently fail to appear on the generated PDF.
//
// Arrays are returned in the same order as `will` itself, which the PDF
// endpoint requires to line up positionally with what's already saved —
// see App.tsx's generate-PDF handlers, which always re-save the current
// `will` state immediately before calling the endpoint with this payload.
export function extractIdFields(will: WillState) {
  return {
    testator: {
      pan: will.testator.pan,
      aadhaarNumber: will.testator.aadhaarNumber,
      spousePan: will.testator.spousePan,
      spouseAadhaarNumber: will.testator.spouseAadhaarNumber,
    },
    executor: {
      idNumber: will.executor.idNumber,
      jointIdNumber: will.executor.jointIdNumber,
      subIdNumber: will.executor.subIdNumber,
    },
    guardian: {
      idNumber: will.guardian.idNumber,
      subIdNumber: will.guardian.subIdNumber,
    },
    residualIdNumber: will.residualIdNumber,
    witnesses: will.witnesses.map(w => ({ pan: w.pan, aadhaarNumber: w.aadhaarNumber })),
    allIndiaAssets: {
      houseFlat: will.allIndiaAssets.houseFlat.map(it => ({ idNumber: it.idNumber })),
      landPlot: will.allIndiaAssets.landPlot.map(it => ({ idNumber: it.idNumber })),
      commercialProperty: will.allIndiaAssets.commercialProperty.map(it => ({ idNumber: it.idNumber })),
      vehicle: will.allIndiaAssets.vehicle.map(it => ({ idNumber: it.idNumber })),
      jewellery: will.allIndiaAssets.jewellery.map(it => ({ idNumber: it.idNumber })),
      socialMediaDigital: will.allIndiaAssets.socialMediaDigital.map(it => ({ idNumber: it.idNumber })),
      intellectualProperty: will.allIndiaAssets.intellectualProperty.map(it => ({ idNumber: it.idNumber })),
    },
    allIndiaResidue: will.allIndiaResidue.map(entry => ({ idNumber: entry.idNumber })),
  };
}
