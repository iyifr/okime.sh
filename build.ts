import { $ } from 'bun'
import { build, type Options } from 'tsup'

const tsupConfig: Options = {
	entry: ['src/**/*.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	bundle: true,
	// outExtension() {
	// 	return {
	// 		js: '.js'
	// 	}
	// }n
} satisfies Options

await Promise.all([
	// ? tsup esm
	build({
		outDir: 'dist',
		format: 'esm',
		target: 'node20',
		cjsInterop: false,
		dts: true,
		...tsupConfig,
	}),
	// ? tsup cjs
	build({
		outDir: 'dist/cjs',
		format: 'cjs',
		target: 'node20',
		dts: true,
		// dts: true,
		...tsupConfig,
	}),
])

// await $`tsc --project tsconfig.dts.json`

await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist',
	minify: true,
	target: 'bun',
})

await Promise.all([$`cp dist/*.d.ts dist/cjs`])

await $`cp dist/index*.d.ts dist/bun`

process.exit()
