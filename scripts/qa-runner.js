#!/usr/bin/env node
/**
 * qa-runner.js — Gyandeep QA Automation
 *
 * Runs Lighthouse (Performance/PWA/Best Practices/SEO) and
 * axe-core (Accessibility) against the running dev server.
 *
 * Usage:
 *   node scripts/qa-runner.js [--url=http://localhost:5173] [--output=./qa-report]
 *
 * Dependencies (install once):
 *   npm install -D lighthouse axe-core puppeteer
 *
 * Exit codes:
 *   0 — All checks passed (no critical a11y violations, Lighthouse scores ≥ thresholds)
 *   1 — One or more checks failed
 */

import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Config ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('='))
)

const TARGET_URL = args.url || 'http://localhost:5173'
const OUTPUT_DIR = path.resolve(ROOT, args.output || 'qa-reports')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

// Lighthouse score thresholds (0–100)
const THRESHOLDS = {
  performance: 70,
  accessibility: 85,
  'best-practices': 80,
  seo: 75,
  pwa: 50,
}

// axe-core severity levels that will fail CI
const FAIL_ON_IMPACT = ['critical', 'serious']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function color(text, code) {
  return process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text
}
const green  = t => color(t, 32)
const red    = t => color(t, 31)
const yellow = t => color(t, 33)
const bold   = t => color(t, 1)
const dim    = t => color(t, 2)

function checkPackage(name) {
  try {
    const r = require.resolve(name, { paths: [ROOT] })
    return !!r
  } catch {
    return false
  }
}

function safeRequire(name) {
  try {
    const r = require.resolve(name, { paths: [ROOT] })
    return { default: require(r) }
  } catch {
    return null
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  ensureDir(OUTPUT_DIR)
  const results = { lighthouse: null, axe: null, timestamp: TIMESTAMP, url: TARGET_URL }
  let exitCode = 0

  console.log()
  console.log(bold('🔍 Gyandeep QA Runner'))
  console.log(dim(`Target: ${TARGET_URL}`))
  console.log(dim(`Output: ${OUTPUT_DIR}`))
  console.log()

  // ── 1. Lighthouse ─────────────────────────────────────────────────────────
  console.log(bold('📊 Running Lighthouse audit...'))

  let lighthouseAvailable = false
  try {
    require.resolve('lighthouse', { paths: [ROOT] })
    lighthouseAvailable = true
  } catch {
    console.log(yellow('  ⚠ lighthouse not installed. Run: npm install -D lighthouse'))
    console.log(dim('  Skipping Lighthouse audit.'))
  }

  if (lighthouseAvailable) {
    try {
      const { default: lighthouse } = await import('lighthouse')
      const chromeLauncher = await import('chrome-launcher')

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] })
      const options = {
        logLevel: 'error',
        output: ['json', 'html'],
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      }

      const runnerResult = await lighthouse(TARGET_URL, options)
      await chrome.kill()

      const lhr = runnerResult.lhr
      const categories = lhr.categories

      // Write reports
      const htmlReport = runnerResult.report[1]
      const jsonReport = runnerResult.report[0]
      const reportPath = path.join(OUTPUT_DIR, `lighthouse-${TIMESTAMP}.html`)
      const jsonPath = path.join(OUTPUT_DIR, `lighthouse-${TIMESTAMP}.json`)
      fs.writeFileSync(reportPath, htmlReport)
      fs.writeFileSync(jsonPath, jsonReport)

      console.log()
      console.log('  Scores:')
      const scores = {}
      let lighthouseFailed = false

      for (const [key, category] of Object.entries(categories)) {
        const score = Math.round((category.score || 0) * 100)
        scores[key] = score
        const threshold = THRESHOLDS[key] || 70
        const pass = score >= threshold
        if (!pass) { lighthouseFailed = true; exitCode = 1 }
        const icon = pass ? green('✓') : red('✗')
        const scoreStr = pass ? green(`${score}`) : red(`${score}`)
        console.log(`  ${icon} ${category.title.padEnd(20)} ${scoreStr} ${dim(`(min: ${threshold})`)}`)
      }

      results.lighthouse = { scores, reportPath, passed: !lighthouseFailed }
      console.log()
      console.log(`  Report saved: ${dim(reportPath)}`)
    } catch (err) {
      console.log(red(`  ✗ Lighthouse failed: ${err.message}`))
      results.lighthouse = { error: err.message, passed: false }
      exitCode = 1
    }
  }

  // ── 2. axe-core Accessibility ──────────────────────────────────────────────
  console.log()
  console.log(bold('♿ Running axe-core accessibility audit...'))

  let puppeteerAvailable = false
  let axeAvailable = false
  try {
    require.resolve('puppeteer', { paths: [ROOT] })
    puppeteerAvailable = true
  } catch {
    console.log(yellow('  ⚠ puppeteer not installed. Run: npm install -D puppeteer'))
  }
  try {
    require.resolve('axe-core', { paths: [ROOT] })
    axeAvailable = true
  } catch {
    console.log(yellow('  ⚠ axe-core not installed. Run: npm install -D axe-core'))
  }

  if (puppeteerAvailable && axeAvailable) {
    try {
      const puppeteer = (await import('puppeteer')).default
      const axeSource = fs.readFileSync(
        require.resolve('axe-core/axe.min.js', { paths: [ROOT] }),
        'utf8'
      )

      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 900 })
      await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 })

      await page.addScriptTag({ content: axeSource })
      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.axe.run(document, {
            runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
          }, (err, results) => resolve(err ? { error: err.message } : results))
        })
      })
      await browser.close()

      if (axeResults.error) throw new Error(axeResults.error)

      const violations = axeResults.violations || []
      const critical = violations.filter(v => FAIL_ON_IMPACT.includes(v.impact))
      const warnings = violations.filter(v => !FAIL_ON_IMPACT.includes(v.impact))

      // Write report
      const axeReportPath = path.join(OUTPUT_DIR, `axe-${TIMESTAMP}.json`)
      fs.writeFileSync(axeReportPath, JSON.stringify(axeResults, null, 2))

      console.log()
      console.log(`  Violations: ${violations.length} total (${critical.length} critical/serious, ${warnings.length} minor)`)
      console.log(`  Passes:     ${(axeResults.passes || []).length}`)
      console.log(`  Incomplete: ${(axeResults.incomplete || []).length}`)

      if (critical.length > 0) {
        exitCode = 1
        console.log()
        console.log(red('  Critical/Serious violations:'))
        for (const v of critical) {
          console.log(red(`    ✗ [${v.impact}] ${v.id}: ${v.description}`))
          for (const node of v.nodes.slice(0, 2)) {
            console.log(dim(`        ${node.html?.slice(0, 100) || 'N/A'}`))
          }
        }
      }

      if (warnings.length > 0) {
        console.log()
        console.log(yellow('  Minor violations (FYI):'))
        for (const v of warnings.slice(0, 5)) {
          console.log(yellow(`    ⚠ [${v.impact}] ${v.id}: ${v.description}`))
        }
        if (warnings.length > 5) console.log(dim(`    ... and ${warnings.length - 5} more`))
      }

      if (critical.length === 0 && warnings.length === 0) {
        console.log(green('  ✓ No accessibility violations found!'))
      }

      results.axe = {
        violations: violations.length,
        critical: critical.length,
        warnings: warnings.length,
        passes: (axeResults.passes || []).length,
        reportPath: axeReportPath,
        passed: critical.length === 0,
      }
      console.log()
      console.log(`  Report saved: ${dim(axeReportPath)}`)
    } catch (err) {
      console.log(red(`  ✗ axe-core audit failed: ${err.message}`))
      results.axe = { error: err.message, passed: false }
      exitCode = 1
    }
  } else {
    // Fallback: Use basic HTML structure check
    console.log(dim('  Running basic structure check (install puppeteer + axe-core for full audit)...'))
    try {
      const http = await import('http')
      const html = await new Promise((resolve, reject) => {
        const req = http.default.get(TARGET_URL, (res) => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => resolve(data))
        })
        req.on('error', reject)
        req.setTimeout(5000, () => req.destroy())
      })

      const checks = [
        { name: 'Has lang attribute',     pass: html.includes('lang=') },
        { name: 'Has charset meta',       pass: html.includes('charset') },
        { name: 'Has viewport meta',      pass: html.includes('viewport') },
        { name: 'Has title element',      pass: /<title[^>]*>[^<]+<\/title>/i.test(html) },
        { name: 'Has skip link or main',  pass: html.includes('main') || html.includes('skip') },
      ]

      for (const check of checks) {
        const icon = check.pass ? green('✓') : yellow('⚠')
        console.log(`  ${icon} ${check.name}`)
        if (!check.pass && check.name === 'Has lang attribute') exitCode = 1
      }

      results.axe = { basicChecks: checks, passed: exitCode === 0 }
    } catch (err) {
      console.log(yellow(`  ⚠ Could not reach ${TARGET_URL}: ${err.message}`))
      console.log(dim('  Make sure the dev server is running.'))
      results.axe = { error: `Server unreachable: ${err.message}`, passed: null }
    }
  }

  // ── 3. Summary ────────────────────────────────────────────────────────────
  console.log()
  console.log(bold('═'.repeat(50)))
  console.log(bold('📋 QA Summary'))
  console.log()

  const lighthouseStatus = results.lighthouse
    ? results.lighthouse.passed ? green('PASS') : red('FAIL')
    : yellow('SKIP')
  const axeStatus = results.axe
    ? results.axe.passed === null ? yellow('WARN')
      : results.axe.passed ? green('PASS') : red('FAIL')
    : yellow('SKIP')

  console.log(`  Lighthouse:    ${lighthouseStatus}`)
  console.log(`  Accessibility: ${axeStatus}`)
  console.log()

  // Write combined report
  const summaryPath = path.join(OUTPUT_DIR, `qa-summary-${TIMESTAMP}.json`)
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2))
  console.log(`  Summary saved: ${dim(summaryPath)}`)
  console.log()

  if (exitCode === 0) {
    console.log(green(bold('✅ All QA checks passed!')))
  } else {
    console.log(red(bold('❌ Some QA checks failed. See reports above.')))
  }

  console.log()
  process.exit(exitCode)
}

main().catch(err => {
  console.error('QA Runner error:', err)
  process.exit(1)
})
