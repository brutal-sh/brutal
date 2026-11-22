import { describe, expect, test } from 'bun:test'

import { parseRoomInput } from '@/app/collab/room/id'
import { getShareURL } from '@/constants'

const ROOM = 'abcdefghijklmnopqrstuvwxyz012345'

describe('room links and IDs', () => {
  test('uses the Brutal website when generating a link outside a browser', () => {
    expect(getShareURL(ROOM)).toBe(`https://brutal.sh/rooms/${ROOM}`)
  })

  test('reads the room ID from a bare ID or a room link, whatever surrounds it', () => {
    for (const input of [
      ROOM,
      `  ${ROOM}  `,
      `https://brutal.sh/rooms/${ROOM}`,
      `https://brutal.sh/rooms/${ROOM}/`,
      `https://app.openpencil.dev/rooms/${ROOM}`,
      `https://app.openpencil.dev/rooms/${ROOM}/`,
      `https://app.openpencil.dev/rooms/${ROOM}?test#layers`,
      `open-pencil.localhost/rooms/${ROOM}#x`
    ]) {
      expect(parseRoomInput(input)).toBe(ROOM)
    }
  })

  test('refuses text that is not a room ID, so it never joins a room nobody shared', () => {
    for (const input of [
      '',
      'e2e-collaboration-room',
      ROOM.slice(1),
      `${ROOM}0`,
      ROOM.toUpperCase(),
      `https://app.openpencil.dev/rooms/${ROOM.slice(0, 31)}!`,
      `https://app.openpencil.dev/demo`
    ]) {
      expect(parseRoomInput(input)).toBeNull()
    }
  })
})
