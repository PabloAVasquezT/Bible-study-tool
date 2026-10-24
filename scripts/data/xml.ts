// Minimal XML parser for our sources: elements, attributes, text, comments, CDATA and
// a DOCTYPE with an internal subset (which is skipped). Anything else is an error.

export interface XmlElement {
  name: string
  attributes: Record<string, string>
  children: XmlNode[]
}

export type XmlNode = XmlElement | string

const TOKEN =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE(?:[^[>]|\[[\s\S]*?\])*>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/y

const ATTRIBUTE = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)))
    const value = ENTITIES[entity]
    if (value === undefined) throw new Error(`Unknown XML entity ${match}`)
    return value
  })
}

export function parseXml(source: string): XmlElement {
  const root: XmlElement = { name: '#document', attributes: {}, children: [] }
  const stack = [root]
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < source.length) {
    const start = TOKEN.lastIndex
    const match = TOKEN.exec(source)
    if (!match) throw new Error(`Malformed XML at offset ${start}: ${source.slice(start, start + 40)}`)
    const [, cdata, closing, opening, attributeText = '', selfClosing, text] = match
    const parent = stack.at(-1)!

    if (text !== undefined) {
      parent.children.push(decode(text))
    } else if (cdata !== undefined) {
      parent.children.push(cdata)
    } else if (closing !== undefined) {
      if (closing !== parent.name) throw new Error(`Unexpected </${closing}> at offset ${start}, expected </${parent.name}>`)
      stack.pop()
    } else if (opening !== undefined) {
      const attributes: Record<string, string> = {}
      for (const [, name = '', double, single] of attributeText.matchAll(ATTRIBUTE)) {
        attributes[name] = decode(double ?? single ?? '')
      }
      const element: XmlElement = { name: opening, attributes, children: [] }
      parent.children.push(element)
      if (!selfClosing) stack.push(element)
    }
  }
  if (stack.length > 1) throw new Error(`Unclosed <${stack.at(-1)!.name}>`)
  const elements = root.children.filter((child): child is XmlElement => typeof child !== 'string')
  if (elements.length !== 1) throw new Error('XML must have exactly one root element')
  return elements[0]!
}

/** Direct child elements with the given name. */
export function childElements(element: XmlElement, name?: string): XmlElement[] {
  return element.children.filter((child): child is XmlElement => typeof child !== 'string' && (!name || child.name === name))
}

/** All the text inside an element, without markup. */
export function textContent(node: XmlNode): string {
  return typeof node === 'string' ? node : node.children.map(textContent).join('')
}
