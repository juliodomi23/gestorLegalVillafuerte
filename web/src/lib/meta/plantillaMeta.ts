export function variablesDePlantilla(texto: string): number[] {
  return [...texto.matchAll(/\{\{(\d+)\}\}/g)]
    .map((match) => Number(match[1]))
    .filter((numero, indice, todos) => numero > 0 && todos.indexOf(numero) === indice)
    .sort((a, b) => a - b);
}
