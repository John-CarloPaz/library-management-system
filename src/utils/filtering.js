/**
 * Small, UI-agnostic filtering helpers.
 * Keep these pure so they’re easy to test and reuse across modules.
 */

/**
 * Normalize an array of ids that may be numbers/strings into numbers.
 * Invalid values are dropped.
 * @param {Array<any>} ids
 * @returns {number[]}
 */
export function normalizeNumericIds(ids) {
  if (!Array.isArray(ids)) return []
  return ids
    .map((v) => (typeof v === 'string' && v.trim() === '' ? NaN : Number(v)))
    .filter((n) => Number.isFinite(n))
}

/**
 * Filter items by branch_id using a selected list of branch ids.
 * Safely handles string vs number mismatches.
 *
 * @template T
 * @param {T[]} items
 * @param {Array<any>} selectedBranchIds
 * @param {(item: T) => any} getBranchId
 * @returns {T[]}
 */
export function filterByBranchIds(items, selectedBranchIds, getBranchId) {
  const selected = normalizeNumericIds(selectedBranchIds)
  if (selected.length === 0) return Array.isArray(items) ? items : []

  const selectedSet = new Set(selected)
  const src = Array.isArray(items) ? items : []

  return src.filter((item) => {
    const raw = getBranchId(item)
    const id = Number(raw)
    return Number.isFinite(id) && selectedSet.has(id)
  })
}
