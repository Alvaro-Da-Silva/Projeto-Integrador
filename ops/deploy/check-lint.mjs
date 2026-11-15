import fs from 'node:fs'
import path from 'node:path'

const eslint = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const baseline = JSON.parse(fs.readFileSync(new URL('./lint-baseline.json', import.meta.url), 'utf8'))
const current = new Map()
for (const file of eslint) {
  const name = path.relative(process.cwd(), file.filePath).split(path.sep).join('/')
  for (const message of file.messages) {
    const key = JSON.stringify([name, message.ruleId, message.severity, message.message.split(String.fromCharCode(10))[0]])
    current.set(key, (current.get(key) ?? 0) + 1)
  }
}
if (process.argv.includes('--baseline')) {
  console.log(JSON.stringify(Object.fromEntries([...current].sort()), null, 2))
} else {
  let newIssues = 0
  for (const [key, count] of current) {
    if (count > (baseline[key] ?? 0)) {
      console.error(key)
      newIssues += count - (baseline[key] ?? 0)
    }
  }
  process.exitCode = newIssues === 0 ? 0 : 1
  console.log(`ESLint: ${newIssues} ocorrências além da base revisada`)
}
