import type { AdminCentralPerson } from "@/admin/api/adminApi";
import type { AutocompleteOption } from "@/admin/components/ui/Autocomplete";

// Central's active staff as suggestions for an exception's email: shown by
// name, searchable by name, email or unit, and picking one fills the email.
export function peopleOptions(people: AdminCentralPerson[]): AutocompleteOption[] {
  return people.map((person) => ({
    value: person.email,
    label: person.name,
    description: person.unit ? `${person.email} · ${person.unit}` : person.email,
    keywords: person.unit ?? undefined,
  }));
}
