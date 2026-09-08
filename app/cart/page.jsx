{/* Discount Code section temporarily hidden
<div className="p-4 border rounded bg-white space-y-3">
  <div className="font-semibold">Discount Code</div>

  <div className="flex gap-2">
    <input
      value={discountCode}
      onChange={(e) => setDiscountCode(e.target.value)}
      placeholder="Enter discount code"
      className="flex-1 border rounded px-3 py-2"
    />

    <button
      onClick={applyDiscountCode}
      className="bg-black text-white px-4 py-2 rounded"
    >
      Apply
    </button>
  </div>

  {appliedDiscount && (
    <div className="flex justify-between items-center text-sm text-green-700">
      <span>Applied: {appliedDiscount.code}</span>
      <button
        onClick={removeDiscount}
        className="text-xs underline text-red-600"
      >
        Remove
      </button>
    </div>
  )}
</div>
*/}
