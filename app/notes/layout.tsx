// app/notes/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = false; // ✅ a boolean, not an object

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
