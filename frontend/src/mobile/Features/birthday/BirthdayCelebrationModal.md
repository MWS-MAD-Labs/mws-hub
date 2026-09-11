WKWK iya anjir 😭 **1415 line itu kebangetan** kalau cuma buat prompt Codex. Token lu bisa langsung jebol.

Sebenernya bisa banget dipadatkan jadi **±100–200 line** tanpa kehilangan requirement penting. Yang bikin panjang biasanya gue jelasin konteks, alasan, struktur, contoh, edge case, dll. **Codex nggak perlu semua itu.**

Kalau targetnya cuma: **“nih existing file, tambahin popup birthday sesuai UI yang gua mau, jangan rusak logic”**, cukup begini:

````md
# Birthday Celebration Popup

Implement birthday celebration popup di MWS Hub mobile.

## Existing Files

- `frontend/src/mobile/Features/birthday/BirthdayList.tsx`
- `frontend/src/mobile/Features/birthday/BirthdayModal.tsx`

Boleh tambah file baru:
- `frontend/src/mobile/Features/birthday/BirthdayCelebrationModal.tsx`

## IMPORTANT

- Jangan ubah backend.
- Jangan ubah API.
- Jangan ubah logic fetching birthday yang sudah ada.
- Jangan redesign `BirthdayList`.
- `BirthdayModal.tsx` tetap menjadi modal "All Birthday".
- Celebration popup adalah UI baru yang terpisah.
- Reuse data `birthdays` yang sudah di-fetch.
- Jangan tambah dependency baru.

## Behavior

Celebration popup hanya muncul jika ada birthday dengan:

`birthday.is_today === true`

Jika ada birthday hari ini, popup otomatis terbuka setelah data birthday berhasil dimuat.

Jika tidak ada birthday hari ini, popup tidak muncul.

Jika ada beberapa birthday hari ini:
- Semua birthday hari ini ditampilkan di popup.
- Card menggunakan UI yang sama.
- User bisa swipe horizontal antar birthday.
- Gunakan native horizontal scroll + CSS scroll snap.
- Tampilkan pagination dots jika jumlah birthday > 1.
- Tidak perlu library carousel.

## Animation

Popup menggunakan fullscreen overlay.

Urutan animasi:

1. Overlay fade in.
2. Fireworks/confetti muncul dari bottom-left menuju center secara diagonal.
3. Fireworks/confetti juga muncul dari bottom-right menuju center secara diagonal.
4. Setelah itu birthday card naik dari bawah layar.
5. Card berhenti di tengah.
6. Fireworks selesai, card tetap tampil.

Animation hanya dimainkan sekali saat popup dibuka.

Jika `prefers-reduced-motion` aktif, kurangi/nonaktifkan animation.

## UI

Style harus mengikuti UI MWS Hub yang sudah ada.

Gunakan:
- existing Tailwind classes
- existing design tokens
- `lucide-react`
- existing `Avatar`, `AvatarImage`, `AvatarFallback`

Jangan bikin desain yang terlalu rounded, terlalu glassmorphism, atau gradient berlebihan.

Popup:
- `fixed inset-0`
- dark translucent backdrop
- subtle backdrop blur
- high z-index
- mobile-first
- safe-area aware

Birthday card:
- centered
- compact
- responsive
- `w-[calc(100%-2rem)]`
- `max-w-md`
- subtle border/shadow
- moderate rounded corners

Isi card:

- Cake icon
- "Happy Birthday!"
- Employee photo
- Employee name
- Short birthday greeting
- Close button
- Pagination dots jika multiple

Contoh:

Happy Birthday!

[PHOTO]

Employee Name

"Wishing you a wonderful birthday filled with happiness and joy! 🎂"

● ○ ○

## Interaction

- Close button menutup popup.
- Klik backdrop boleh menutup popup.
- Klik birthday card tidak boleh menutup popup.
- Swipe horizontal bekerja di mobile.
- Pagination mengikuti birthday yang sedang terlihat.
- Satu birthday = tidak perlu pagination.
- Lima birthday harus tetap menggunakan card UI yang sama, bukan mengecilkan semua card sekaligus.

## Implementation

Di `BirthdayList.tsx` tambahkan hanya state/wiring minimum yang diperlukan untuk membuka:

`BirthdayCelebrationModal`

Gunakan birthday data yang sudah ada.

Contoh konsep:

```tsx
const todayBirthdays = birthdays.filter(
  (birthday) => birthday.is_today,
);
````

Tambahkan state:

```tsx
const [isBirthdayCelebrationOpen, setIsBirthdayCelebrationOpen] =
  useState(false);
```

Saat data birthday berhasil dimuat:

```tsx
if (data.some((birthday) => birthday.is_today)) {
  setIsBirthdayCelebrationOpen(true);
}
```

Lalu render:

```tsx
<BirthdayCelebrationModal
  birthdays={todayBirthdays}
  open={isBirthdayCelebrationOpen}
  onOpenChange={setIsBirthdayCelebrationOpen}
/>
```

Sesuaikan dengan tipe/props existing project.

## Fireworks

Jangan install library fireworks/confetti.

Implementasi menggunakan CSS/React saja.

Fireworks harus terlihat berasal dari:

- bottom-left → diagonal ke center
- bottom-right → diagonal ke center

Buat visual sederhana tapi polished, jangan terlalu ramai.

## Final Requirements

Pertahankan semua behavior existing.

Jangan refactor API.
Jangan refactor fetching.
Jangan mengubah `BirthdayModal`.
Jangan mengubah layout utama `BirthdayList`.

Fokus hanya pada:

1. Birthday celebration modal baru.
2. Minimal state wiring di `BirthdayList`.
3. Animation.
4. Swipe multiple birthdays.
5. Pagination.
6. Responsive mobile UI.

Setelah selesai, cek TypeScript/build dan pastikan tidak ada error.

## Reference UI

Use the provided reference image as the visual reference.

IMPORTANT:
The birthday celebration must be a REAL MODAL POPUP overlaying the existing BirthdayList, not an inline component/card.

The existing BirthdayList must remain visible behind a dark translucent overlay.

Visual sequence:
1. Existing BirthdayList becomes dimmed.
2. Confetti/fireworks appear from bottom-left and bottom-right toward the center.
3. Birthday card rises from the bottom.
4. Birthday card settles in the center of the screen.
5. Card remains interactive.
6. Multiple birthday cards are horizontally swipeable inside the modal.

Match the reference image's overall composition, spacing, proportions, and visual hierarchy.
Do not redesign the existing BirthdayList.
