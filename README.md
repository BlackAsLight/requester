# Requester

Requester is a simple lib offering a method to connect disconnected communication between two environments like workers
for example. Basically joining the connections between sending and receiving information.

## Example
The below example connects a Client and a ShareWorker together so the Client can request information from the ShareWorker and
await a response.
```ts
import { createRequester } from '@doctor/requester'

const port = new SharedWorker('path').port

const { post, request, onMessage } = createRequester<string>(
	payload => port.postMessage(payload), // Handle Sending Messages
	data => console.log(data) // Handle Responding to Messages
)

port.onmessage = ({ data: { data: WorkerMessage } }) => onMessage(data)

console.log(await request('123')) // 123
```
```ts
import createRequester from '@doctor/requester'

const { onMessage } = createRequester<number, MessagePort>(
	(payload, port) => port.postMessage(payload) // Handle Sending Messages
	data => Number(data) // Handle Responding to Messages
)

self.onconnect = function({ ports: [port] }: MessageEvent) {
	port.onmessage = ({ data: { data: WorkerMessage } }) => onMessage(data, port)
}
```
