export function transformFileStringToUrl(fileString: string, dir: string) {
	return fileString === dir ? fileString.replace(dir, '/') : fileString.replace(dir, '')
}
