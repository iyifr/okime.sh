import { defineEventHandler } from 'h3'

const handler = defineEventHandler((e) => {
	switch (e.method) {
		case 'GET':
			return 'Hola'
		default:
			return 'Biatch'
	}
})

export const GET = defineEventHandler((e) => {
	return 'Hola mi amigos'
})

export const POST = defineEventHandler((e) => {
	return 'It seems to work really really well'
})

export default handler
