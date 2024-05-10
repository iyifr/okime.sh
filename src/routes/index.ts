import { defineEventHandler } from 'h3'

const handler = defineEventHandler((e) => {
	switch (e.method) {
		case 'GET':
			return 'Hola'
		default:
			return 'HAHAH'
	}
})

export default handler
