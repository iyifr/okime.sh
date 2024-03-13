import { H3Event, H3Response, defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
	if (event.node.req.method === 'GET') {
		return '<h1>HIII</h1>'
	}
})

// export default function Handler(e: H3Event) {
// 	if (e.node.req.method === 'GET') {
// 		return {
// 			status: 200,
// 			body: JSON.stringify({ users: ['Alice', 'Bob', 'Charlieee'] }),
// 		}
// 	}
// }
