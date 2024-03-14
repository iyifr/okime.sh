import { H3Event, defineEventHandler } from 'h3'

export default function POST(E: H3Event) {
	return E.node.req.method?.toLocaleUpperCase()
}
