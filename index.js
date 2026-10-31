/**
 * Host half of dsh-completed-ding.
 *
 * Session completion is observed in the browser from the live session status
 * projection, so the Host half intentionally owns no timer, subscription, or
 * stored record. Keeping it empty is what makes the plugin cost effectively
 * nothing when no reminder is on screen.
 */
export function apply() {}
