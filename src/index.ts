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
import { extractStringsFromRoute, transformFileStringToUrl } from './utils/transforms'

export class Okime {
	public app: App
	public router: Router
	public routeTree: { file: string; path: string }[] = []

	constructor() {
		this.app = createApp()
		this.router = createRouter()
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
		await this.createRouteTree('routes')
		// this.loadRoutes()

		const handler = this.routeManager(this.routeTree)
		this.app.use(handler)

		// mount the router
		this.app.use(this.router)

		this.start({ port: options?.port || 2004 })

		await this.generateRouteTree()
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

	// OLD ROUTING IMPLEMENTATION
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

		if (hasVariableSegment(routePath)) {
			finalRoutePath = convertRouteFormatWithBrackets(routePath)
		} else finalRoutePath = routePath

		switch (file) {
			case 'get.ts': {
				this.router.get(finalRoutePath, defineEventHandler(handler))
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
				this.router.get(finalRoutePath, defineEventHandler(handler))
			}
			case 'index.ts': {
				this.router.get(finalRoutePath, handler)
			}
		}
	}

	routeManager = (routes: Okime['routeTree']) =>
		defineEventHandler(async (event: H3Event) => {
			const { req, res } = event.node
			const url = getRequestURL(event)
			const routePath = url.pathname
			const method = req.method?.toLocaleLowerCase()
			const fileUrlPath = (path: string) => transformFileStringToUrl(path, 'routes')

			let matches = routes.filter((route) => fileUrlPath(route.path) === routePath)

			if (matches.length === 0) {
				matches = routes
					.filter((item) => {
						return hasVariableSegment(item.path)
					})
					.filter((item) => {
						const arr1 = convertRouteFormatWithBrackets(fileUrlPath(item.path))
							.split('/')
							.filter((item) => item !== '')

						const arr2 = routePath.split('/').filter((item) => item !== '')
						//.filter((item, index) => index % 2 === 0)

						if (arr1.length > 1 && arr2.length > 1) {
							const proxy = arr1.filter((item, index) => index % 2 === 0)
							const proxy2 = arr2.filter((item, index) => index % 2 === 0)
							return compareArrays(proxy, proxy2)
						} else if (arr1.length === 1) {
							return true
						}
					})
			}

			if (!matches) {
				throw createError({
					status: 400,
					message: 'Route not found',
				})
			} else {
				const final = matches.find(
					(item) => convertSpecialFileNameToHttpMethod(item.file.slice(0, -3)) === method
				)

				if (final) {
					const filePath = join(__dirname, final.path)
					const routeHandler = await import(join(filePath, final.file))

					const segment = transformFileStringToUrl(final.path, 'routes')
					const finalPath = hasVariableSegment(segment)
						? convertRouteFormatWithBrackets(segment)
						: segment

					console.log(final.file)

					switch (final.file) {
						case 'get.ts': {
							this.router.get(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'post.ts': {
							this.router.post(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'put.ts': {
							this.router.put(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'patch.ts': {
							this.router.patch(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'delete.ts': {
							this.router.delete(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'handler.ts': {
							this.router.use(finalPath, defineEventHandler(routeHandler.default))
						}
						case 'index.ts': {
							this.router.get(finalPath, defineEventHandler(routeHandler.default))
						}
					}
				} else {
					throw createError({
						statusCode: 405,
						message: 'Method not allowed',
					})
				}
			}
		})
}

const app = new Okime()

await app.boot()

// await app.createRouteTree('routes')

// await app.loadRoutes()
// await app.generateRouteTree()

// class OkimeBeta extends Okime {
// 	constructor() {
// 		super()
// 		this.loadRoutesBeta()
// 	}

// 	async loadRoutesBeta() {
// 		await this.createRouteTree('routes')
// 		const appRouter = this.routeManager(this.routeTree)
// 		this.app.use(appRouter)
// 	}

// 		})
// }

// const app2 = new OkimeBeta()
// app2.boot({ port: 3003 })

function convertSpecialFileNameToHttpMethod(name: string) {
	if (name === 'handler' || name === 'index') {
		return 'get'
	} else return name
}

// const combine = (result: any, nextFun: (arg0: any) => any) => nextFun(result)
// const pipe =
// 	(...funs: any[]) =>
// 	(x: any) =>
// 		funs.reduce(combine, x)

const compareArrays = (a: any[], b: string | any[]) =>
	a.length === b.length && a.every((element, index) => element === b[index])
