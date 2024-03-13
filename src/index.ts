import {
	App,
	EventHandler,
	EventHandlerRequest,
	H3Event,
	Router,
	createApp,
	createError,
	createRouter,
	defineEventHandler,
	getRequestURL,
	toWebHandler,
	useBase,
} from 'h3'

import { join, dirname } from 'path'
import { readdir, watch, stat } from 'fs/promises'
import { statSync } from 'fs'
import { isOkimeFile } from './utils/okimefiles'
import { convertRouteFormatWithBrackets, hasVariableSegment } from './utils/denormalizeRoute'

export class Okime {
	public app: App
	public router: Router
	public routeTree: { file: string; path: string }[] = []

	constructor() {
		this.app = createApp()
		this.router = createRouter()
		this.app.use(this.router)
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

	async boot(options?: { port: number }) {
		this.start({ port: options?.port || 2004 })
		await this.createRouteTree('routes')
		this.loadRoutes()
	}

	async loadRoutes() {
		try {
			this.routeTree.forEach(async (route) => {
				// Find the file and access it's default function
				const filePath = join(__dirname, route.path)
				const routeHandler = await import(join(filePath, route.file))

				// Transform the file path into URL string relative to root "routes" folder.
				const routePath =
					route.path === 'routes'
						? route.path.replace('routes', '/')
						: route.path.replace('routes', '')

				this.handleRoute({ routePath, handler: routeHandler.default, file: route.file })
			})
		} catch (e) {
			console.log(e)
		}
	}

	private handleRoute({
		routePath,
		handler,
		file,
	}: {
		routePath: string
		handler: any
		file: string
	}) {
		let finalRoutePath: string

		// Check if URL string is like this - '/posts/[id]/comments/[id]'
		// Then make it like this - '/posts/:id/comments/:id' so h3 can route it correctly
		if (hasVariableSegment(routePath)) {
			finalRoutePath = convertRouteFormatWithBrackets(routePath)
		} else finalRoutePath = routePath

		switch (file) {
			case 'get.ts': {
				this.router.get(finalRoutePath, handler)
			}
			case 'post.ts': {
				this.router.post(finalRoutePath, defineEventHandler(handler))
			}
			case 'put.ts': {
				this.router.put(finalRoutePath, handler)
			}
			case 'patch.ts': {
				this.router.patch(finalRoutePath, handler)
			}
			case 'delete.ts': {
				this.router.delete(finalRoutePath, handler)
			}
			case 'handler.ts': {
				this.router.use(finalRoutePath, defineEventHandler(handler))
			}
			case 'index.ts': {
				this.router.use(finalRoutePath, handler)
			}
			default:
				null
		}
	}

	async generateRouteTree() {
		const dir = join(__dirname, 'routes')
		const watcher = watch(dir)
		for await (const event of watcher) {
			if (event.eventType === 'rename') {
				await this.createRouteTree('routes')
			}
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
				if (isOkimeFile(file) || hasVariableSegment(file)) {
					routeTree.push({ file, path: dir })
				}
			}
		}
		this.routeTree = routeTree
		return routeTree
	}
}

const app = new Okime()

await app.boot()

// await app.createRouteTree('routes')

// await app.loadRoutes()
// await app.generateRouteTree()

// loadRoutesBeta() {
// 	const appRouter = this.routeManager(this.routeTree)
// 	this.app.use(appRouter)
// }

// routeManager = (routes: Okime['routeTree']) =>
// 	defineEventHandler(async (event: H3Event) => {
// 		const { req, res } = event.node
// 		const url = getRequestURL(event)
// 		const routePath = url.pathname
// 		const method = req.method?.toLocaleLowerCase()

// 		const match = routes.find(
// 			(route) => transformFileStringToUrl(route.path, 'routes') === routePath
// 		)

// 		if (!match) {
// 			throw createError({
// 				status: 400,
// 				message: 'Route not found',
// 			})
// 		} else {
// 			const filePath = join(__dirname, match.path)
// 			const routeHandler = await import(join(filePath, match.file))
// 			this.app.use(
// 				transformFileStringToUrl(match.path, 'routes'),
// 				defineEventHandler(routeHandler.default)
// 			)
// 		}
// 	})
