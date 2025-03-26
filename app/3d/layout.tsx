import '../globals.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      {children}
    </main>
  )
}