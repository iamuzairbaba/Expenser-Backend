/**
 * OCR is now handled entirely client-side via Tesseract.js.
 * This endpoint receives the already-parsed receipt data from the frontend,
 * validates it, and returns it — allowing future server-side enrichment
 * (e.g. merchant DB lookup, ML categorisation) without breaking the API contract.
 */
async function parseReceipt(req, res, next) {
  try {
    const { amount, date, merchant, category, confidence, subtotal, tax, invoiceNumber, paymentMethod, currency, rawText } = req.body;

    if (amount == null && !merchant) {
      return res.status(400).json({ message: "No receipt data provided" });
    }

    res.json({
      amount: amount != null ? Number(amount) : null,
      date: date || new Date().toISOString().slice(0, 10),
      merchant: merchant || "",
      category: category || null,
      confidence: confidence != null ? Number(confidence) : null,
      subtotal: subtotal != null ? Number(subtotal) : null,
      tax: tax != null ? Number(tax) : null,
      invoiceNumber: invoiceNumber || null,
      paymentMethod: paymentMethod || null,
      currency: currency || "USD",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { parseReceipt };
