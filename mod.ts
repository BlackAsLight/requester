/**
 * @module
 * This module offers a simple function to connect the disjointed sending and receiving of messages between two parties.
 */

import { z } from 'zod'

type Payload = z.infer<typeof payload>
const payload: z.ZodObject<{
	uuid: z.ZodString
	isCaller: z.ZodBoolean
	data: z.ZodUnknown
}> = z.object({
	uuid: z.string(),
	isCaller: z.boolean(),
	data: z.unknown(),
})

/**
 * The createRequester function takes three arguments with the last one being optional. The `request` argument handles sending
 * messages that are ready to be sent off, and the `response` argument handles responding to the incoming requests. The value
 * returned from the `response` argument is what will be returned to the requesting party. The last argument `timeout` sets an
 * amount of time (ms) you'd like to wait for the other party to respond to. If they don't respond within that time an error is
 * thrown.
 *
 * The generic type `T` indicates what types of messages you can send to the other party, while the generic type `U` indicates
 * what type of context you'd like to pass along with any incoming messages to the `request` argument so it can respond
 * appropriately.
 */
export function createRequester<T, U = undefined>(
	request: (payload: Payload, context?: U) => unknown | Promise<unknown>,
	response: (data: unknown) => unknown | Promise<unknown>,
	timeout = 30_000,
): {
	post(data: T, context?: U): void
	request(data: T, context?: U): Promise<unknown>
	onMessage(data: unknown, context?: U): Promise<void>
} {
	const responses: Record<string, [unknown] | undefined | null> = {}
	return {
		post(data: T, context?: U): void {
			request({ uuid: '-1', isCaller: true, data }, context)
		},
		async request(data: T, context?: U): Promise<unknown> {
			const uuid = createUUID()
			responses[uuid] = null
			await request({ uuid, isCaller: true, data }, context)
			const endTime = performance.now() + timeout
			while (performance.now() < endTime) {
				await sleep(0)
				const response = responses[uuid]
				if (response) {
					responses[uuid] = undefined
					return response[0]
				}
			}
			responses[uuid] = undefined
			throw Error('Request Timed Out!')
		},
		async onMessage(data: unknown, context?: U): Promise<void> {
			const result = payload.safeParse(data)
			if (result.success)
				if (result.data.isCaller)
					if (result.data.uuid !== '-1')
						request({ uuid: result.data.uuid, isCaller: false, data: await response(result.data.data) }, context)
					else await response(result.data.data)
				else responses[result.data.uuid] = [result.data.data]
		},
	}
	function createUUID(): string {
		while (true) {
			const uuid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()
			if (responses[uuid] === undefined) return uuid
		}
	}
	function sleep(ms: number): Promise<true> {
		return new Promise<true>(a => setTimeout(() => a(true), ms))
	}
}
