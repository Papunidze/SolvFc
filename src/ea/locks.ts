const STORAGE_KEY = 'easysbc:locked-items'

export function lockedItemIds() {
  return new Set<number>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
}

export function toggleLock(itemId: number) {
  const locked = lockedItemIds()
  if (locked.has(itemId)) locked.delete(itemId)
  else locked.add(itemId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...locked]))
  return locked.has(itemId)
}
