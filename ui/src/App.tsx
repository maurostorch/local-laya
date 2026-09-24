import { useEffect, useMemo, useState } from 'react'
import { ApiError, fetchHealth, runDecision } from './api'
import { QuestionEditor } from './QuestionEditor'
import { buildRequest, exampleQuestions, exampleState, newQuestion, validate } from './request'
import { Results } from './Results'
import type { Health, LayaResponse, ModelName, QuestionDraft } from './types'

const models: ModelName[] = ['auto', 'english', 'multilingual', 'typed-decisions']

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  const [stateText, setStateText] = useState(exampleState)
  const [stateAsJson, setStateAsJson] = useState(true)
  const [questions, setQuestions] = useState<QuestionDraft[]>(exampleQuestions)
  const [model, setModel] = useState<ModelName>('auto')
  const [apiKey, setApiKey] = useState('')

  const [running, setRunning] = useState(false)
  const [response, setResponse] = useState<LayaResponse | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [showRequest, setShowRequest] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((error: Error) => setHealthError(error.message))
  }, [])

  const errors = useMemo(() => validate(stateText, stateAsJson, questions), [stateText, stateAsJson, questions])
  const request = useMemo(
    () => (errors.length === 0 ? buildRequest(stateText, stateAsJson, questions, model) : null),
    [errors, stateText, stateAsJson, questions, model],
  )

  const updateQuestion = (updated: QuestionDraft) =>
    setQuestions((current) => current.map((question) => (question.uid === updated.uid ? updated : question)))

  const removeQuestion = (uid: string) => setQuestions((current) => current.filter((question) => question.uid !== uid))

  const run = async () => {
    if (!request) return
    setRunning(true)
    setRunError(null)
    const startedAt = performance.now()
    try {
      const result = await runDecision(request, apiKey)
      setElapsedMs(performance.now() - startedAt)
      setResponse(result)
    } catch (error) {
      const status = error instanceof ApiError ? ` (HTTP ${error.status})` : ''
      setRunError(`${(error as Error).message}${status}`)
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setStateText('')
    setStateAsJson(false)
    setQuestions([newQuestion()])
    setResponse(null)
    setRunError(null)
  }

  const loadExample = () => {
    setStateText(exampleState)
    setStateAsJson(true)
    setQuestions(exampleQuestions())
    setResponse(null)
    setRunError(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Laya Playground</h1>
        <span className={`status ${health ? 'ok' : healthError ? 'down' : ''}`}>
          {health
            ? `Ready on ${health.device}: ${health.loaded.join(', ') || 'no checkpoint loaded yet'}`
            : healthError
              ? `Service unreachable: ${healthError}`
              : 'Connecting…'}
        </span>
      </header>

      <main className="layout">
        <form
          className="panel form"
          onSubmit={(event) => {
            event.preventDefault()
            void run()
          }}
        >
          <div className="toolbar">
            <button type="button" className="link-button" onClick={loadExample}>
              Load example
            </button>
            <button type="button" className="link-button" onClick={reset}>
              Clear
            </button>
          </div>

          <section>
            <div className="section-title">
              <h2>Input</h2>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={stateAsJson}
                  onChange={(event) => setStateAsJson(event.target.checked)}
                />
                Send as JSON
              </label>
            </div>
            <textarea
              value={stateText}
              rows={7}
              spellCheck={!stateAsJson}
              placeholder={stateAsJson ? '{"body": "…"}' : 'An email, a ticket, a user prompt…'}
              onChange={(event) => setStateText(event.target.value)}
            />
          </section>

          <section>
            <h2>Questions</h2>
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.uid}
                question={question}
                index={index}
                onChange={updateQuestion}
                onRemove={() => removeQuestion(question.uid)}
              />
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() => setQuestions((current) => [...current, newQuestion()])}
            >
              + Add question
            </button>
          </section>

          <section className="settings">
            <label className="field">
              <span>Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value as ModelName)}>
                {models.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>API key (only if LAYA_API_KEY is set)</span>
              <input
                type="password"
                value={apiKey}
                autoComplete="off"
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
          </section>

          {errors.length > 0 && (
            <ul className="errors">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <div className="actions">
            <button type="submit" className="primary" disabled={!request || running}>
              {running ? 'Running…' : 'Run'}
            </button>
            <button type="button" className="link-button" onClick={() => setShowRequest((shown) => !shown)}>
              {showRequest ? 'Hide request' : 'Show request'}
            </button>
          </div>

          {showRequest && request && <pre className="request-preview">{JSON.stringify(request, null, 2)}</pre>}
        </form>

        <div className="panel output">
          <h2>Results</h2>
          {runError && <p className="run-error">{runError}</p>}
          {response ? (
            <Results response={response} elapsedMs={elapsedMs} />
          ) : (
            !runError && <p className="empty">Fill in the form and press Run.</p>
          )}
        </div>
      </main>
    </div>
  )
}
