export type Term = [coefficient: number, variable: string]

type Sense = '>=' | '<=' | '='

const TERMS_PER_LINE = 8

function formatTerms(terms: Term[]) {
  const safeTerms: Term[] = terms.length > 0 ? terms : [[1, 'zero']]
  const formatted = safeTerms.map(([coefficient, variable]) => `${coefficient < 0 ? '-' : '+'} ${Math.abs(coefficient)} ${variable}`)
  const lines: string[] = []
  for (let start = 0; start < formatted.length; start += TERMS_PER_LINE) {
    lines.push(formatted.slice(start, start + TERMS_PER_LINE).join(' '))
  }
  return lines.join('\n  ')
}

export function createLinearProgram() {
  const constraints: string[] = []
  const binaries: string[] = []
  const bounds: string[] = ['zero = 0']
  let objective: Term[] = []

  return {
    minimize(terms: Term[]) {
      objective = terms
    },
    addConstraint(terms: Term[], sense: Sense, rhs: number) {
      constraints.push(` r${constraints.length}: ${formatTerms(terms)} ${sense} ${rhs}`)
    },
    addBinary(variable: string) {
      binaries.push(variable)
      return variable
    },
    addContinuous(variable: string, lower: number, upper: number) {
      bounds.push(`${lower} <= ${variable} <= ${upper}`)
      return variable
    },
    toString() {
      return [
        'Minimize',
        ` obj: ${formatTerms(objective)}`,
        'Subject To',
        ...constraints,
        'Bounds',
        ...bounds.map((bound) => ` ${bound}`),
        'Binaries',
        ...binaries.map((variable) => ` ${variable}`),
        'End',
      ].join('\n')
    },
  }
}

export type LinearProgram = ReturnType<typeof createLinearProgram>
