import type { Answer, LayaResponse } from './types'

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

function Bar({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div className={`bar-row ${highlight ? 'highlight' : ''}`}>
      <span className="bar-label" title={label}>
        {label}
      </span>
      <span className="bar-track">
        <span className="bar-fill" style={{ width: `${Math.max(value * 100, 0.5)}%` }} />
      </span>
      <span className="bar-value">{percent(value)}</span>
    </div>
  )
}

function AnswerCard({ name, answer }: { name: string; answer: Answer }) {
  const probabilities = Object.entries(answer.probabilities ?? {})
  const topKey = probabilities.reduce<string | null>(
    (best, [key, value]) => (best === null || value > (answer.probabilities?.[best] ?? 0) ? key : best),
    null,
  )

  let headline: string
  if (answer.type === 'choice') headline = answer.choice ?? '?'
  else if (answer.type === 'score') {
    const nearest = answer.legend?.[String(Math.round(answer.score ?? 0))]
    headline = `${(answer.score ?? 0).toFixed(2)} of ${probabilities.length - 1}${nearest ? ` (${nearest})` : ''}`
  } else headline = `${percent(answer.noul ?? 0)} yes`

  return (
    <article className="answer">
      <header>
        <h3>{name}</h3>
        <span className={`badge ${answer.type}`}>{answer.type}</span>
      </header>
      <p className="headline">{headline}</p>

      {answer.type === 'noul' ? (
        <Bar label="yes" value={answer.noul ?? 0} highlight={(answer.noul ?? 0) >= 0.5} />
      ) : (
        probabilities.map(([key, value]) => (
          <Bar
            key={key}
            label={answer.type === 'score' ? `${key}: ${answer.legend?.[key] ?? ''}` : key}
            value={value}
            highlight={key === topKey}
          />
        ))
      )}

      <dl className="metrics">
        {answer.answer_confidence !== undefined && (
          <>
            <dt>Answer confidence</dt>
            <dd>{percent(answer.answer_confidence)}</dd>
          </>
        )}
        {answer.confidence !== undefined && (
          <>
            <dt>Confidence</dt>
            <dd>{percent(answer.confidence)}</dd>
          </>
        )}
        {answer.action?.act_probability !== undefined && (
          <>
            <dt>Act probability</dt>
            <dd>{percent(answer.action.act_probability)}</dd>
          </>
        )}
      </dl>
    </article>
  )
}

export function Results({ response, elapsedMs }: { response: LayaResponse; elapsedMs: number }) {
  return (
    <section className="results" aria-live="polite">
      <div className="results-meta">
        <span>
          Model <strong>{response.routing?.model ?? response.model}</strong>
        </span>
        {response.routing?.reason && <span>{response.routing.reason}</span>}
        {response.usage && <span>{response.usage.input_tokens} input tokens</span>}
        <span>{Math.round(elapsedMs)} ms</span>
      </div>

      <div className="answers">
        {Object.entries(response.answers).map(([name, answer]) => (
          <AnswerCard key={name} name={name} answer={answer} />
        ))}
      </div>

      <details>
        <summary>Raw response</summary>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </details>
    </section>
  )
}
