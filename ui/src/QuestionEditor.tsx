import { newOption } from './request'
import type { OptionDraft, QuestionDraft, QuestionType } from './types'

interface Props {
  question: QuestionDraft
  index: number
  onChange: (question: QuestionDraft) => void
  onRemove: () => void
}

const typeHelp: Record<QuestionType, string> = {
  choice: 'Pick one option. Each option has a key, which the answer returns, and a description.',
  score: 'Rate on an ordered scale. List the levels from lowest to highest.',
  noul: 'A yes or no question. The answer is the probability of yes.',
}

export function QuestionEditor({ question, index, onChange, onRemove }: Props) {
  const update = (patch: Partial<QuestionDraft>) => onChange({ ...question, ...patch })

  const changeType = (type: QuestionType) => {
    // Options are kept on a switch to noul, so switching back does not lose them.
    const options = [...question.options]
    const minimum = type === 'noul' ? 0 : 2
    while (options.length < minimum) options.push(newOption())
    update({ type, options })
  }

  const updateOption = (uid: string, patch: Partial<OptionDraft>) =>
    update({ options: question.options.map((option) => (option.uid === uid ? { ...option, ...patch } : option)) })

  const removeOption = (uid: string) => update({ options: question.options.filter((option) => option.uid !== uid) })

  const moveOption = (from: number, to: number) => {
    const options = [...question.options]
    const [moved] = options.splice(from, 1)
    options.splice(to, 0, moved)
    update({ options })
  }

  return (
    <fieldset className="question">
      <legend>Question {index + 1}</legend>

      <div className="question-header">
        <label className="field">
          <span>Name</span>
          <input
            value={question.name}
            placeholder="department"
            onChange={(event) => update({ name: event.target.value })}
          />
        </label>

        <div className="field">
          <span>Type</span>
          <div className="segmented" role="radiogroup" aria-label="Question type">
            {(['choice', 'score', 'noul'] as QuestionType[]).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={question.type === type}
                className={question.type === type ? 'active' : ''}
                onClick={() => changeType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="icon-button danger" onClick={onRemove} aria-label="Remove question">
          ✕
        </button>
      </div>

      <p className="hint">{typeHelp[question.type]}</p>

      <label className="field">
        <span>Instructions</span>
        <input
          value={question.instructions}
          placeholder="Which department should handle this request?"
          onChange={(event) => update({ instructions: event.target.value })}
        />
      </label>

      {question.type !== 'noul' && (
        <div className="options">
          <span className="options-title">{question.type === 'choice' ? 'Options' : 'Levels, lowest first'}</span>
          {question.options.map((option, optionIndex) => (
            <div className="option-row" key={option.uid}>
              {question.type === 'choice' ? (
                <input
                  className="option-key"
                  value={option.key}
                  placeholder="key"
                  aria-label={`Option ${optionIndex + 1} key`}
                  onChange={(event) => updateOption(option.uid, { key: event.target.value })}
                />
              ) : (
                <span className="level-index">{optionIndex}</span>
              )}
              <input
                className="option-description"
                value={option.description}
                placeholder={question.type === 'choice' ? 'description' : 'level description'}
                aria-label={`Option ${optionIndex + 1} description`}
                onChange={(event) => updateOption(option.uid, { description: event.target.value })}
              />
              {question.type === 'score' && (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={optionIndex === 0}
                    onClick={() => moveOption(optionIndex, optionIndex - 1)}
                    aria-label="Move level up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    disabled={optionIndex === question.options.length - 1}
                    onClick={() => moveOption(optionIndex, optionIndex + 1)}
                    aria-label="Move level down"
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="icon-button"
                disabled={question.options.length <= 2}
                onClick={() => removeOption(option.uid)}
                aria-label="Remove option"
              >
                −
              </button>
            </div>
          ))}
          <button
            type="button"
            className="link-button"
            onClick={() => update({ options: [...question.options, newOption()] })}
          >
            + Add {question.type === 'choice' ? 'option' : 'level'}
          </button>
        </div>
      )}
    </fieldset>
  )
}
