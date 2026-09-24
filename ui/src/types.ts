export type QuestionType = 'choice' | 'score' | 'noul'

export type ModelName = 'auto' | 'english' | 'multilingual' | 'typed-decisions'

export interface OptionDraft {
  uid: string
  key: string
  description: string
}

export interface QuestionDraft {
  uid: string
  name: string
  type: QuestionType
  instructions: string
  options: OptionDraft[]
}

export interface Answer {
  type: QuestionType
  choice?: string
  score?: number
  noul?: number
  legend?: Record<string, string>
  probabilities?: Record<string, number>
  confidence?: number
  answer_confidence?: number
  action?: { act_probability?: number }
}

export interface Routing {
  model: string
  repo?: string
  reason?: string
}

export interface LayaResponse {
  model: string
  answers: Record<string, Answer>
  usage?: { input_tokens: number; output_tokens: number }
  routing?: Routing
}

export interface Health {
  status: string
  loaded: string[]
  device: string
}
