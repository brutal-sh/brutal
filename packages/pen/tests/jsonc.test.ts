import { describe, expect, test } from 'bun:test'

import { parsePenDocument, parsePenFile } from '@open-pencil/pen'

// Official format reference: https://docs.pencil.dev/for-developers/the-pen-format
// Comments are accepted syntax; all remaining text still has to be valid JSON and .pen data.
describe('.pen JSON comments', () => {
  test('reads line/block comments and creates the same editable scene as plain JSON', () => {
    const source = `// Document annotation\r\n{
      "version": "2.21", /* schema annotation */
      "children": [{
        "type": "rectangle", // Shape annotation
        "id": "shape",
        "name": "Commented shape",
        "width": 120,
        "height": 80,
        "fill": "#123456"
      }]
    } // trailing line comment without a newline`
    const document = parsePenDocument(source)
    expect(document.children[0]?.name).toBe('Commented shape')
    const graph = parsePenFile(source)
    const plain = parsePenFile(JSON.stringify(document))
    const node = graph.getChildren(graph.getPages()[0].id)[0]
    const plainNode = plain.getChildren(plain.getPages()[0].id)[0]
    expect({
      type: node.type,
      name: node.name,
      width: node.width,
      height: node.height,
      fills: node.fills
    }).toEqual({
      type: plainNode.type,
      name: plainNode.name,
      width: plainNode.width,
      height: plainNode.height,
      fills: plainNode.fills
    })
  })

  test('terminates line comments on a lone CR without swallowing following fields', () => {
    expect(parsePenDocument('{// header\r"children":[],"version":"2.21"}')).toEqual({
      children: [],
      version: '2.21'
    })
    const content = 'escaped carriage return: \r'
    const node = { id: 'text', type: 'text', content }
    expect(parsePenDocument(JSON.stringify({ children: [node] })).children[0]?.content).toBe(
      content
    )
  })

  test('preserves URLs, comment delimiters, escaped quotes and backslashes inside strings', () => {
    const node = {
      id: 'text',
      type: 'text',
      content: 'https://example.test/a//b?q=/*literal*/ — quote: " // literal; slash: \\ end',
      href: 'https://example.test/path?next=//host/*segment*/',
      name: 'Ends with a backslash \\'
    }
    const source = `/* header " and \\ are not string syntax */${JSON.stringify({ children: [node] })}/* footer */`
    expect(parsePenDocument(source).children[0]).toEqual(node)
  })

  test.each([
    '{"children":[]} /* unfinished',
    '/* unfinished {"children":[]}',
    '{"children":[/* missing end ]}',
    '{"children":[],}',
    '{"children":[{"id":"x","type":"rectangle"}, /* comma remains */]}',
    '{"children":[]} extra',
    '{"children":[]} // line ends before malformed content\r extra',
    '{"children":[],"text":"raw\rreturn"}',
    '{"children":[]} {"children":[]}',
    '{"children": [}',
    '{"children":[], "enabled": tr/* token boundary */ue}',
    '{"children":[], "text": "unterminated}',
    '{"children":[] // missing closing brace',
    '{/* no required children */}',
    '{"children": [{"id": "missing-type"}]}',
    '{"children":[]} /* outer /* nested */ still outer */'
  ])('rejects malformed input without recovering a partial document: %s', (source) => {
    expect(() => parsePenDocument(source)).toThrow('Not a .pen document:')
    expect(() => parsePenFile(source)).toThrow('Not a .pen document:')
  })
})
