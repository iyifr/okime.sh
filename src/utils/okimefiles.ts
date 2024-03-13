const okimeFiles = ['get.ts', 'post.ts', 'index.ts', 'handler.ts', 'delete.ts', 'put.ts']
const isOkimeFile = (string: string) => okimeFiles.includes(string)

export {isOkimeFile}