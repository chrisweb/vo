import Scene from '@/components/3d/Scene'

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
            <header className="py-6 px-4 bg-black/30 backdrop-blur-sm">

            </header>

            <main className="container mx-auto px-4 py-8">
                <Scene altText="3D virtual world with real-time user synchronization" />
            </main>

            <footer className="py-4 text-center text-gray-400 text-sm">

            </footer>
        </div>
    )
}
