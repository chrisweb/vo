'use client'

import { useRef, useState } from 'react'

interface Message {
    content: string
    fromServer: boolean
    timestamp: string
}

export default function WebSocketClient() {
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [messageInput, setMessageInput] = useState('')
    const websocketRef = useRef<WebSocket | null>(null)

    const connect = () => {
        console.log('Connecting to WebSocket...')

        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
        if (isConnected || websocketRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${globalThis.location.host}/api/ws`

        const socket = new WebSocket(wsUrl)

        console.log('socket: ', socket)

        websocketRef.current = socket

        socket.onopen = () => {
            console.log('WebSocket connection opened')
            setIsConnected(true)
        }

        socket.onmessage = (event) => {
            console.log('Raw message from server:', event.data)
            try {
                const message: Message = JSON.parse(event.data)
                console.log('Parsed message from server:', message)
                setMessages((prev) => [...prev, message])
            } catch (e) {
                console.error('Error parsing message:', e)
                // Handle plain text messages by converting them to our format
                const plainTextMessage: Message = {
                    content: event.data,
                    fromServer: true,
                    timestamp: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, plainTextMessage])
            }
        }

        socket.onclose = () => {
            console.log('WebSocket connection closed')
            setIsConnected(false)
            websocketRef.current = null
        }

        socket.onerror = (error) => {
            console.error('WebSocket error:', error)
            setIsConnected(false)
        }
    }

    const sendMessage = () => {
        if (!messageInput.trim() || !isConnected || !websocketRef.current) {
            return
        }

        const message: Message = {
            content: messageInput,
            fromServer: false,
            timestamp: new Date().toISOString(),
        }

        // Add message to list immediately for better UX
        setMessages((prev) => [...prev, message])

        // Send message as JSON
        websocketRef.current.send(JSON.stringify(message))

        // Clear input field
        setMessageInput('')
    }

    // Uncomment this if you want to connect automatically when component mounts
    /*useEffect(() => {
        connect()
    }, [])*/

    return (
        <div className='websocket-client'>
            <div style={{ marginBottom: '10px' }}>
                <button
                    type='button'
                    onClick={connect}
                    disabled={isConnected}
                >
                    {isConnected ? 'Connected' : 'Connect'}
                </button>
                {isConnected &&
                    (
                        <span style={{ marginLeft: '10px', color: 'green' }}>
                            WebSocket connected!
                        </span>
                    )}
            </div>

            {isConnected && (
                <div style={{ marginBottom: '20px' }}>
                    <input
                        type='text'
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder='Type a message...'
                        style={{ marginRight: '10px', padding: '5px', width: '300px' }}
                    />
                    <button type='button' onClick={sendMessage}>Send</button>
                </div>
            )}

            {messages.length > 0 && (
                <div>
                    <h3>Messages:</h3>
                    <ul>
                        {messages.map((msg, index) => (
                            <li
                                key={index}
                                style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    borderRadius: '5px',
                                    backgroundColor: msg.fromServer ? '#e8f4fd' : '#e9f5e9',
                                    textAlign: msg.fromServer ? 'left' : 'right',
                                }}
                            >
                                <strong>{msg.fromServer ? 'Server' : 'You'}</strong>: {msg.content}
                                <div style={{ fontSize: '0.8em', color: '#666' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
