export function transformFileStringToUrl(fileString: string, dir: string) {
	return fileString === dir ? fileString.replace(dir, '/') : fileString.replace(dir, '')
}

export function extractStringsFromRoute(route: string): string[] {
	// Handle the edge case where the route matches the pattern "/:${dynamic}"
	// const dynamicPattern = /\/:(\w+)/
	// const dynamicMatch = route.match(dynamicPattern)
	// if (dynamicMatch) {
	// 	return ['/']
	// }

	const regex = /(\w+)\/:(?:w+)/g
	const matches = Array.from(route.matchAll(regex), (match) => `/${match[1]}`)
	return matches
}

export function extractStringsFromPossibleDynamicRoute(route: string): string[] {
	const regex = /\/(\w+)\//
	const matches = []

	let match
	while ((match = regex.exec(route)) !== null) {
		matches.push(match[1])
	}

	return matches
}
