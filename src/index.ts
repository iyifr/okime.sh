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

import router from '../file-router'
import { join, dirname } from 'path'
import { readdir, watch } from 'fs/promises'

export class Okime {
	public app: App
	public router: Router
	private routeTree: any

	constructor() {
		this.app = createApp()
		this.router = createRouter()
		this.app.use(this.router)
		this.router.use('/', router)
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

	public use(path: string, handler: EventHandler<EventHandlerRequest, void>): void {
		this.app.use(path, handler)
	}

	private start(config: { port: number }): void {
		Bun.serve({
			port: config?.port,
			// @ts-expect-error
			fetch: toWebHandler(this.app),
		})
		console.log(`Server started on port ${config.port}`)
	}

	boot(options?: { port: number }) {
		this.start({ port: options?.port || 2004 })
	}

	async loadRoutes() {
		const s = join(__dirname, `./routes`)
		const files = await readdir(s, { recursive: true })
		try {
			files.forEach(async (file) => {
				const routeHandler = await import(join(__dirname, `./routes/${file}`))
				this.get(`/${file.slice(0, -3)}`, routeHandler.default)
				console.log(file.slice(0, -3))
			})
		} catch (e) {}
	}

	async generateRouteTree() {
		const dir = join(__dirname, 'routes/hello')
		const watcher = watch(dir)
		for await (const event of watcher) {
			console.log(`Detected ${event.eventType} in ${event.filename}`)
		}
	}
}

const app = new Okime()
app.boot()

app.get(
	'/',
	defineEventHandler((event) => `${event.node.req.method}`)
)

await app.loadRoutes()
await app.generateRouteTree()
