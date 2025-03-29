import WorldScene from '@/components/WorldScene.tsx'
import WebSocketClient from '@/components/WebSocketClient.tsx'

export default function Home() {
    return (
        <>
            <WorldScene altText='adjust alt text here' />
            <div style={{ margin: '20px auto', maxWidth: '600px' }}>
                <WebSocketClient />
            </div>
        </>
    )
}
