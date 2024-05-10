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
	toWebHandler
} from 'h3'

import { join, dirname } from 'path'
import { readdir, watch, stat } from 'fs/promises'
import { statSync } from 'fs'
import { isOkimeFile } from './utils/okimefiles'
import {
	convertRouteFormatWithBrackets,
	hasVariableSegment
} from './utils/denormalizeRoute'
import {
	compareArrays,
	convertSpecialFileNameToHttpMethod,
	transformFileStringToUrl
} from './utils/transforms'

export class Okime {
	public app: App
	public router: Router
	public routeTree: { file: string; path: string }[] = []

	constructor() {
		this.app = createApp()
		this.router = createRouter()
	}

	public use(
		path: string,
		handler: EventHandler<EventHandlerRequest, void>
	): void {
		this.app.use(path, handler)
	}

	private start(config: { port: number }): void {
		Bun.serve({
			port: config?.port,
			//@ts-ignore
			fetch: toWebHandler(this.app)
		})
		console.log(`Server started on port ${config.port}`)
	}

	async boot(options?: { port: number }) {
		await this.createRouteTree('routes', __dirname)

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
				await this.createRouteTree('routes', __dirname)
			}
		}
	}

	public async createRouteTree(dir: string, __dirname: string) {
		const dirPath = join(__dirname, dir)
		const files = await readdir(dirPath).catch(() => {
			console.log('No routes directory in root path')
			return []
		})
		const routeTree: Okime['routeTree'] = []

		for (const file of files) {
			const filePath = join(dirPath, file)
			const isDirectory = statSync(filePath).isDirectory()

			if (isDirectory) {
				const subPath = join(dir, file)
				const subRouteTree = await this.createRouteTree(
					subPath,
					__dirname
				)
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

	private routeManager = (routes: Okime['routeTree']) =>
		defineEventHandler(async (event: H3Event) => {
			const { req, res } = event.node
			const url = getRequestURL(event)
			const routePath = url.pathname
			const method = req.method?.toLocaleLowerCase()
			const fileUrlPath = (path: string) =>
				transformFileStringToUrl(path, 'routes')

			let matches = routes.filter(
				(route) => fileUrlPath(route.path) === routePath
			)

			// If we cannot find a direct match check for a variable match.
			if (matches.length === 0) {
				matches = routes
					.filter((item) => {
						return hasVariableSegment(item.path)
					})
					.filter((item) => {
						const arr1 = convertRouteFormatWithBrackets(
							fileUrlPath(item.path)
						)
							.split('/')
							.filter((item) => item !== '')

						const arr2 = routePath
							.split('/')
							.filter((item) => item !== '')

						if (arr1.length > 1 && arr2.length > 1) {
							const proxy = arr1.filter(
								(item, index) => index % 2 === 0
							)
							const proxy2 = arr2.filter(
								(item, index) => index % 2 === 0
							)
							const isEqual = compareArrays(proxy, proxy2)
							return isEqual
						} else if (arr1.length === 1) {
							return true
						}
					})
			}

			if (!matches) {
				throw createError({
					status: 400,
					message: 'Route not found'
				})
			} else {
				// Make sure what we matched is a file that the framework recognizes
				const final = matches.find((item) => isOkimeFile(item.file))

				if (final) {
					const filePath = join(__dirname, final.path)
					const routeHandler = await import(
						join(filePath, final.file)
					)
					console.log(routeHandler)

					const segment = transformFileStringToUrl(
						final.path,
						'routes'
					)
					const finalPath = hasVariableSegment(segment)
						? convertRouteFormatWithBrackets(segment)
						: segment

					let __routeHandler
					const _routeHandler = () => {
						const method = event.method.toUpperCase()
						if (routeHandler[method]) {
							__routeHandler = routeHandler[method]
						} else {
							__routeHandler = routeHandler.default
						}
					}

					_routeHandler()

					switch (final.file) {
						case 'get.ts': {
							this.router.get(finalPath, __routeHandler!)
						}
						case 'post.ts': {
							this.router.post(finalPath, __routeHandler!)
						}
						case 'put.ts': {
							this.router.put(finalPath, __routeHandler!)
						}
						case 'patch.ts': {
							this.router.patch(finalPath, __routeHandler!)
						}
						case 'delete.ts': {
							this.router.delete(finalPath, __routeHandler!)
						}
						case 'handler.ts': {
							this.router.use(finalPath, __routeHandler!)
						}
						case 'index.ts': {
							this.router.use(finalPath, __routeHandler!)
						}
					}
				} else {
					throw createError({
						statusCode: 405,
						message: 'Method not allowed'
					})
				}
			}
		})
}

const app = new Okime()
app.boot()
