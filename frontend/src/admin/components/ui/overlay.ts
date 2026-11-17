// The admin Dropdown portals its menu outside any dialog. Radix counts a click
// there as "outside" and would close the dialog, so such clicks are ignored.
export function preventCloseFromDropdownMenu(event: { target: EventTarget | null; preventDefault: () => void }) {
  if (event.target instanceof Element && event.target.closest('[role="listbox"]')) event.preventDefault();
}
