/**
 * Ordering helper shared by the section and block editors.
 *
 * Section and block order IS the document - legal copy is read top to bottom
 * and cross-references itself by number - so reordering is a first-class edit
 * rather than a nicety, and it is implemented once, immutably, here.
 */

/**
 * Return a copy of `items` with the element at `index` moved by `offset`
 * positions. Out-of-range moves return the original array unchanged, so a
 * caller may fire this from a button without bounds-checking first.
 *
 * @param items  - Source array (never mutated).
 * @param index  - Index of the element to move.
 * @param offset - -1 for up, 1 for down.
 */
export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length) return items;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
