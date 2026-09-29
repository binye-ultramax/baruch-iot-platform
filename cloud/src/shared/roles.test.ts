import assert from 'node:assert/strict'
import test from 'node:test'
import { roleFromGroups } from './roles.ts'

test('administrator membership wins when both groups are present', () => {
  assert.equal(roleFromGroups(['Operator', 'Administrator']), 'Administrator')
})

test('everyone else is an operator', () => {
  assert.equal(roleFromGroups([]), 'Operator')
  assert.equal(roleFromGroups(['Operator']), 'Operator')
})
