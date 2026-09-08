import { describe, expect, it } from 'vitest'
import { toRichText } from 'tldraw'
import type {
  TLComment,
  TLCommentId,
  TLCommentReaction,
  TLCommentReactionId,
  TLCommentThread,
  TLCommentThreadId,
  TLPageId,
} from 'tldraw'
import { commentsFileFor, distanceToBox, githubLogin, writeCommentUser } from './canvasComments'

// The page id is exactly what must not survive into the file: it is minted per browser, and the
// folder the file sits in is what identifies the page instead.
const pageId = 'page:whatever' as TLPageId
const ADA = 'user:ada-lovelace'
const ada = { id: ADA, name: 'Ada-Lovelace', image: 'https://github.com/Ada-Lovelace.png?size=80' }

const thread = (id: string, isDeleted = false): TLCommentThread => ({
  id: `comment-thread:${id}` as TLCommentThreadId,
  typeName: 'comment-thread',
  pageId,
  anchor: { type: 'point', x: 10, y: 20 },
  createdBy: ADA,
  createdAt: 0,
  resolved: null,
  isDeleted,
  meta: {},
})

const comment = (id: string, threadId: string, isDeleted = false): TLComment => ({
  id: `comment:${id}` as TLCommentId,
  typeName: 'comment',
  threadId: `comment-thread:${threadId}` as TLCommentThreadId,
  pageId,
  authorId: ADA,
  createdAt: 0,
  editedAt: null,
  body: toRichText('nice'),
  isDeleted,
  meta: {},
})

const reaction = (id: string, commentId: string, userId: string): TLCommentReaction => ({
  id: `comment-reaction:${id}` as TLCommentReactionId,
  typeName: 'comment-reaction',
  commentId: `comment:${commentId}` as TLCommentId,
  threadId: 'comment-thread:a' as TLCommentThreadId,
  pageId,
  userId,
  emoji: '👍',
  createdAt: 0,
  meta: {},
})

describe('distanceToBox', () => {
  const box = { x: 0, y: 0, w: 100, h: 200 }

  it('is zero inside the box and the gap outside it', () => {
    expect(distanceToBox({ x: 50, y: 100 }, box)).toBe(0)
    expect(distanceToBox({ x: 130, y: 100 }, box)).toBe(30)
    expect(distanceToBox({ x: -10, y: 100 }, box)).toBe(10)
    // Off a corner in both directions, so neither axis alone is the answer.
    expect(distanceToBox({ x: 103, y: 204 }, box)).toBe(5)
  })
})

describe('commentsFileFor', () => {
  writeCommentUser(ada)

  // b is deleted, so it takes its comment with it; r2 reacts to a comment that went with it.
  const records = [
    reaction('r1', 'a1', ADA),
    comment('a1', 'a'),
    thread('b', true),
    thread('a'),
    comment('b1', 'b'),
    reaction('r2', 'b1', ADA),
    comment('a2', 'a', true),
  ]

  it('drops soft-deletes and everything orphaned by them', () => {
    expect(commentsFileFor(records).records.map((r) => r.id)).toEqual([
      'comment-reaction:r1',
      'comment-thread:a',
      'comment:a1',
    ])
  })

  it('strips the page id and sorts, so the file diffs line by line', () => {
    const file = commentsFileFor(records)
    expect(file.records.every((r) => !('pageId' in r))).toBe(true)
    expect(file.records.map((r) => r.id)).toEqual([...file.records.map((r) => r.id)].sort())
  })

  it('carries the names of the authors it kept, and only those', () => {
    // Someone this browser has never heard of resolves to their id at read time instead.
    const withStranger = [...records, reaction('r3', 'a1', 'user:stranger')]
    expect(commentsFileFor(withStranger).authors).toEqual({
      [ADA]: { name: ada.name, image: ada.image },
    })
  })
})

describe('githubLogin', () => {
  it('takes a handle however it was pasted', () => {
    expect(githubLogin('  Ada-Lovelace ')).toBe('Ada-Lovelace')
    expect(githubLogin('@ada')).toBe('ada')
    expect(githubLogin('https://github.com/ada/some-repo')).toBe('ada')
  })

  it('is null for anything GitHub would not accept as a username', () => {
    expect(githubLogin('')).toBeNull()
    expect(githubLogin('Ada Lovelace')).toBeNull()
    expect(githubLogin('-ada')).toBeNull()
    expect(githubLogin('ada--lovelace')).toBeNull()
    expect(githubLogin('a'.repeat(40))).toBeNull()
  })
})
