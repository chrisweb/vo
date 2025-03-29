import type { NextApiRequest, NextApiResponse } from 'next'

export const runtime = 'edge'

export default function handler(request: NextApiRequest, response: NextApiResponse) {

    // demo websockets
    // https://docs.deno.com/examples/http_server_websocket/

    console.log('request', request)
    console.log('request.headers', request.headers)

    if (request.headers['upgrade'] !== 'websocket') {
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/426
        return new Response('Upgrade Required', { status: 426 })
    }

    // https://docs.deno.com/api/deno/~/Deno.upgradeWebSocket
    const { socket, response: denoResponse } = Deno.upgradeWebSocket(request as unknown as Request)

    eventListeners(socket)

    console.log('client connected')

    // Send properly formatted JSON message instead of plain string
    socket.send(JSON.stringify({
        content: 'hello there',
        fromServer: true,
        timestamp: new Date().toISOString(),
    }))

    // Convert Headers to a format compatible with OutgoingHttpHeaders
    const headersObject: Record<string, string | string[]> = {}
    denoResponse.headers.forEach((value, key) => {
        headersObject[key] = value
    })

    console.log('headersObject', headersObject)

    //response.writeHead(101, headersObject)
    //response.end(denoResponse.body)
    return new Response('Upgraded', { ...headersObject })
}

const eventListeners = (socket: WebSocket) => {
    socket.addEventListener('open', () => {
        console.log('a client connected!')
    })

    socket.addEventListener('message', (event) => {
        console.log('Received message:', event.data)
        try {
            const data = JSON.parse(event.data)
            // Echo back with server flag
            socket.send(JSON.stringify({
                content: data.content,
                fromServer: true,
                timestamp: new Date().toISOString(),
            }))
        } catch (error) {
            console.error('Error parsing message:', error)
        }
    })

    socket.addEventListener('close', () => {
        console.log('a client disconnected!')
    })

    socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event)
    })

    // Using the on-event handlers as backup
    socket.onopen = () => {
        console.log('a client connected!')
    }

    socket.onmessage = () => {
        // Already handled by addEventListener above
    }

    socket.onclose = () => {
        console.log('a client disconnected!')
    }

    socket.onerror = (event) => {
        console.error('WebSocket error:', event)
    }
}
