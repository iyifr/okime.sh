import { beforeEach, describe, expect, test, it } from 'bun:test'
import { CreateOkime, Okime } from '..'
import supertest, { SuperTest, Test } from 'supertest'
import { toNodeListener } from 'h3'

describe('app', () => {
	let okime: Okime
	let request: SuperTest<Test>

	beforeEach(() => {
		okime = new Okime()
		request = supertest(toNodeListener(okime.app))
	})

	it('can return JSON directly', async () => {
		okime.use('/api', (event) => ({ url: event.path }))
		const res = await request.get('/api')

		expect(res.body).toEqual({ url: '/' })
	})

	it('can group routes', async () => {
		const apiv1 = new Okime()
		apiv1.get('/', (event) => ({method: event.node.req.method}))
		okime.route('/api/v1', apiv1)

		const res = await request.get('/api/v1')
		expect(res.body).toEqual({method: 'GET'})
	})
})
