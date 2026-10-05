import type { EAGroupButton, EAItem, LockPanel } from './globals'
import { lockedItemIds, toggleLock } from './locks'

const LOCK_LABEL = 'Lock for SolvFC'
const UNLOCK_LABEL = 'Unlock for SolvFC'

function toggleLockOf(panel: LockPanel, button: EAGroupButton) {
  const isLocked = toggleLock(panel.easysbcItem!.id)
  button.setText(isLocked ? UNLOCK_LABEL : LOCK_LABEL)
  services.Notification.queue([isLocked ? 'Locked: SolvFC will never use this player' : 'Unlocked for SolvFC', UINotificationType.NEUTRAL])
}

function createLockButton(panel: LockPanel, anchor: HTMLElement) {
  const button = new UTGroupButtonControl()
  button.init()
  button.setInteractionState(true)
  button.addTarget(panel, () => toggleLockOf(panel, button), EventType.TAP)
  anchor.after(button.__root)
  return button
}

function showLockButton(panel: LockPanel, anchor: HTMLElement, item: EAItem) {
  if (!item.isPlayer() || item.concept) return
  panel.easysbcItem = item
  panel.easysbcLockButton ??= createLockButton(panel, anchor)
  panel.easysbcLockButton.setText(lockedItemIds().has(item.id) ? UNLOCK_LABEL : LOCK_LABEL)
}

export function addLockAction() {
  const renderClubPanel = UTDefaultActionPanelView.prototype.render
  UTDefaultActionPanelView.prototype.render = function (item, ...rest) {
    const result = renderClubPanel.call(this, item, ...rest)
    showLockButton(this, this._bioButton.__root, item)
    return result
  }
  const setSlotItem = UTSlotActionPanelView.prototype.setItem
  UTSlotActionPanelView.prototype.setItem = function (item, ...rest) {
    const result = setSlotItem.call(this, item, ...rest)
    showLockButton(this, this._btnBio.__root, item)
    return result
  }
}
