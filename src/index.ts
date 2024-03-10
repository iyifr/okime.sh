import {
	App,
	EventHandler,
	EventHandlerRequest,
	Router,
	createApp,
	createRouter,
	defineEventHandler,
	toWebHandler,
	useBase,
} from 'h3'

import { readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'

export class Okime {
	public app: App
	public router: Router

	constructor() {
		this.app = createApp()

		this.router = createRouter()

		// mount router
		this.app.use(this.router)
	}

	public get(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.router.get(path, defineEventHandler(handler))
	}
	public post(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.router.get(path, defineEventHandler(handler))
	}
	public patch(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.router.get(path, defineEventHandler(handler))
	}
	public delete(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.router.get(path, defineEventHandler(handler))
	}
	public put(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.router.get(path, defineEventHandler(handler))
	}

	public route(path: string, base: Okime) {
		this.app.use(path, useBase(path, base.router.handler))
	}

	public use(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.app.use(path, handler)
	}

	private start(config: { port: number }): void {
		const server = Bun.serve({
			port: config?.port,
			// @ts-expect-error
			fetch: toWebHandler(this.app),
		})
		console.log(`Server started on port ${config.port}`)
	}

	boot(options?: { port: number }) {
		this.start({ port: options?.port || 4231 })
	}
}

// Access h3 engine directly for tests
export function CreateOkime() {
	const instance = new Okime()
	return instance.app
}

const app = new Okime()
app.boot()
