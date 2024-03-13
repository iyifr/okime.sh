import { H3Event } from 'h3'

export default function Handler(E: H3Event) {
	return E.context?.params?.id
}
