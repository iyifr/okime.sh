function denormalizeRoute({ route }: { route: string }) {
	let denormalizedRoute = route

	// Replace anonymous parameters with **
	denormalizedRoute = denormalizedRoute.replace(/{(\*?param\d+)}/g, (_, name) => {
		if (name.startsWith('*param')) {
			return '**'
		} else {
			return `/*`
		}
	})

	// Replace named parameters with :name
	denormalizedRoute = denormalizedRoute.replace(/{(\w+)}/g, (_, name) => `:${name}`)

	return denormalizedRoute
}

export function hasVariableSegment(route: string): boolean {
	const regex = /\[([^\]]+)\]/g
	return regex.test(route)
}

export function convertRouteFormatWithBrackets(route: string): string {
	return route.replace(/\[([^\]]+)\]/g, (match, capturedName) => {
		// Check if the captured name starts with a colon (:) for consistency
		return capturedName.startsWith(':') ? capturedName : `:${capturedName}`
	})
}
