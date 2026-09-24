import type { OptionDraft, QuestionDraft, QuestionType } from './types'

export const newUid = () => crypto.randomUUID()

export const newOption = (key = '', description = ''): OptionDraft => ({ uid: newUid(), key, description })

export function newQuestion(type: QuestionType = 'choice', name = ''): QuestionDraft {
  const options =
    type === 'choice' ? [newOption(), newOption()] : type === 'score' ? [newOption(), newOption(), newOption()] : []
  return { uid: newUid(), name, type, instructions: '', options }
}

export function parseState(text: string, asJson: boolean): unknown {
  if (!asJson) return text
  return JSON.parse(text)
}

export function validate(stateText: string, asJson: boolean, questions: QuestionDraft[]): string[] {
  const errors: string[] = []
  if (!stateText.trim()) errors.push('The input is empty.')
  if (asJson && stateText.trim()) {
    try {
      JSON.parse(stateText)
    } catch {
      errors.push('The input is not valid JSON.')
    }
  }
  if (questions.length === 0) errors.push('Add at least one question.')

  const names = new Set<string>()
  questions.forEach((question, index) => {
    const label = question.name.trim() || `Question ${index + 1}`
    if (!question.name.trim()) errors.push(`${label}: the name is empty.`)
    else if (names.has(question.name.trim())) errors.push(`${label}: the name is used twice.`)
    names.add(question.name.trim())
    if (!question.instructions.trim()) errors.push(`${label}: the instructions are empty.`)

    if (question.type === 'choice') {
      const keys = question.options.map((option) => option.key.trim())
      if (keys.filter(Boolean).length < 2) errors.push(`${label}: a choice needs at least 2 options with a key.`)
      if (new Set(keys.filter(Boolean)).size !== keys.filter(Boolean).length)
        errors.push(`${label}: two options have the same key.`)
    }
    if (question.type === 'score') {
      if (question.options.filter((option) => option.description.trim()).length < 2)
        errors.push(`${label}: a score needs at least 2 levels.`)
    }
  })
  return errors
}

export function buildRequest(stateText: string, asJson: boolean, questions: QuestionDraft[], model: string) {
  const payload: Record<string, unknown> = {}
  for (const question of questions) {
    const body: Record<string, unknown> = { type: question.type, instructions: question.instructions.trim() }
    if (question.type === 'choice') {
      body.criteria = Object.fromEntries(
        question.options
          .filter((option) => option.key.trim())
          .map((option) => [option.key.trim(), option.description.trim() || option.key.trim()]),
      )
    }
    if (question.type === 'score') {
      body.criteria = question.options.map((option) => option.description.trim()).filter(Boolean)
    }
    payload[question.name.trim()] = body
  }
  const request: Record<string, unknown> = { state: parseState(stateText, asJson), questions: payload }
  if (model !== 'auto') request.model = model
  return request
}

export const exampleState = JSON.stringify(
  {
    subject: 'Duplicate charge on invoice #4411',
    body: 'Hi, we were billed twice for March. Please refund the duplicate today or we will cancel our plan.',
  },
  null,
  2,
)

export function exampleQuestions(): QuestionDraft[] {
  return [
    {
      ...newQuestion('choice', 'department'),
      instructions: 'Which department should handle this request?',
      options: [
        newOption('billing', 'invoices, payments, refunds'),
        newOption('technical', 'bugs, outages, system errors'),
        newOption('sales', 'pricing, new contracts'),
      ],
    },
    {
      ...newQuestion('score', 'urgency'),
      instructions: 'How urgent is this request?',
      options: [newOption('', 'not urgent'), newOption('', 'soon'), newOption('', 'blocking')],
    },
    { ...newQuestion('noul', 'churn_risk'), instructions: 'Does the user threaten to cancel or leave?' },
  ]
}
