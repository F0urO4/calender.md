import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSchedule, serializeSchedule, validateScheduleInput } from './schedule.js'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
const PORT = process.env.PORT || 5174
const dataDir = path.join(process.cwd(), 'data', 'weeks')

const ensureDataDir = async () => {
  await fs.mkdir(dataDir, { recursive: true })
}

const listWeeks = async () => {
  const entries = await fs.readdir(dataDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.replace(/\.md$/, ''))
    .filter((name) => /^\d{8}$/.test(name))
    .sort()
}

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/weeks', async (_req, res) => {
  try {
    await ensureDataDir()
    const weeks = await listWeeks()
    res.json({ weeks })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/weeks/:weekId', async (req, res) => {
  try {
    await ensureDataDir()
    const filePath = path.join(dataDir, `${req.params.weekId}.md`)
    const markdown = await fs.readFile(filePath, 'utf8')
    const schedule = parseSchedule(markdown)
    res.json({ schedule })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/weeks', upload.single('file'), async (req, res) => {
  try {
    await ensureDataDir()
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const markdown = req.file.buffer.toString('utf8')
    const schedule = parseSchedule(markdown)
    const serialized = serializeSchedule(schedule)
    const filePath = path.join(dataDir, `${schedule.weekId}.md`)
    await fs.writeFile(filePath, serialized, 'utf8')
    res.json({ schedule })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/weeks/:weekId', async (req, res) => {
  try {
    await ensureDataDir()
    const schedule = validateScheduleInput(req.body)
    if (schedule.weekId !== req.params.weekId) {
      return res.status(400).json({ error: 'weekId does not match route parameter' })
    }
    const serialized = serializeSchedule(schedule)
    const filePath = path.join(dataDir, `${schedule.weekId}.md`)
    await fs.writeFile(filePath, serialized, 'utf8')
    res.json({ schedule })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.listen(PORT, async () => {
  await ensureDataDir()
  console.log(`API server listening on http://localhost:${PORT}`)
})
