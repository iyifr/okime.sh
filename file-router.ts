import { join, dirname } from 'path'
import { readdir } from 'fs/promises'
import { H3Event, H3Response, defineEventHandler, getRequestURL } from 'h3'
import { file, resolve } from 'bun'

const router = defineEventHandler(async (event) => {
	const { req, res } = event.node
	const reqUrl = getRequestURL(event)
	const url = new URL(reqUrl, `http://${req.headers.host}`)
	const routePath = url.pathname

	const s = join(__dirname, `./src/routes`)
	const files = await readdir(s)

	try {
		files.forEach(async (file) => {
			if (file.endsWith('ts') && file.slice(0, -3) === routePath.slice(1)) {
				const routeHandler = await import(join(__dirname, `./src/routes/${file}`))
				const response = await routeHandler.default(event)

				if (response) {
					res.statusCode = response.status
					res.end(response.body)
				} else {
					res.statusCode = 404
					res.end('Not Found')
				}
			}
		})
	} catch (e) {
		console.error(`Error handling route ${routePath}:`, e)
		res.statusCode = 404
		res.end('Not Found')
	}
})

export default router

// function normalizeRoute(_route: string) {
// 	const parameters: any[] = []

// 	let anonymousCtr = 0
// 	const route = _route
// 		.replace(/:(\w+)/g, (_, name) => `{${name}}`)
// 		.replace(/\/(\*)\//g, () => `/{param${++anonymousCtr}}/`)
// 		.replace(/\*\*{/, '{')
// 		.replace(/\/(\*\*)$/g, () => `/{*param${++anonymousCtr}}`)

// 	const paramMatches = route.matchAll(/{(\*?\w+)}/g)
// 	for (const match of paramMatches) {
// 		const name = match[1]
// 		if (!parameters.some((p) => p.name === name)) {
// 			parameters.push({ name, in: 'path', required: true })
// 		}
// 	}

// 	return {
// 		route,
// 		parameters,
// 	}
// }
