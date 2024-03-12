import {
	App,
	EventHandler,
	EventHandlerRequest,
	H3Event,
	Router,
	createApp,
	createRouter,
	defineEventHandler,
	toWebHandler,
	useBase,
} from 'h3'

import { join, dirname } from 'path'
import { readdir, watch, stat } from 'fs/promises'
import { statSync } from 'fs'

export class Okime {
	public app: App
	public router: Router
	public routeTree: { file: string; path: string }[] = []

	constructor() {
		this.app = createApp()
		this.router = createRouter()
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
		try {
			this.routeTree.forEach(async (route) => {
				const filePath = join(__dirname, route.path)
				const routePath =
					route.path === 'routes'
						? route.path.replace('routes', '/')
						: route.path.replace('routes', '')

				const routeHandler = await import(join(filePath, route.file))
				this.get(routePath, routeHandler.default)
			})
		} catch (e) {
			console.log(e)
		}
	}

	async generateRouteTree() {
		const dir = join(__dirname)
		const watcher = watch(dir)
		for await (const event of watcher) {
			console.log(`Detected ${event.eventType} in ${event.filename}`)
		}
	}

	public async createRouteTree(dir: string) {
		const dirPath = join(__dirname, dir)
		const files = await readdir(dirPath)

		const routeTree: Okime['routeTree'] = []

		for (const file of files) {
			const filePath = join(dirPath, file)
			const isDirectory = statSync(filePath).isDirectory()

			if (isDirectory) {
				const subPath = join(dir, file)
				const subRouteTree = await this.createRouteTree(subPath)
				routeTree.push(...subRouteTree)
			} else {
				const okimeFiles = ['get.ts', 'post.ts', 'index.ts', 'handler.ts', 'delete.ts', 'put.ts']
				const isOkimeFile = (string: string) => okimeFiles.includes(string)
				if (isOkimeFile(file)) {
					routeTree.push({ file: `/${file}`, path: dir })
				}
			}
		}

		this.routeTree = routeTree
		return routeTree
	}
}

const app = new Okime()

app.boot()

await app.createRouteTree('routes')
console.log(app.routeTree)

await app.loadRoutes()
// await app.generateRouteTree()
