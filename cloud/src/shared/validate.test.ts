import assert from 'node:assert/strict'
import test from 'node:test'
import { parseConfirmBody, parseLoginBody, parseRegisterBody } from './validate.ts'

const validRegister = {
  email: ' Operator@Baruch.io ',
  password: 'Baruch2026!',
  name: ' Fleet Operator ',
}

test('parseRegisterBody normalizes email and name', () => {
  assert.deepEqual(parseRegisterBody(validRegister), {
    email: 'operator@baruch.io',
    password: 'Baruch2026!',
    name: 'Fleet Operator',
  })
})

test('parseRegisterBody rejects a weak password', () => {
  assert.throws(() => parseRegisterBody({ ...validRegister, password: 'baruch2026' }), { statusCode: 400 })
})

test('parseRegisterBody rejects a password that matches the email', () => {
  assert.throws(
    () => parseRegisterBody({ email: 'User1@Baruch.io', password: 'User1@baruch.io', name: 'Ada' }),
    { statusCode: 400, message: 'Password must not match the email address.' },
  )
})

test('parseConfirmBody accepts a 6-digit code', () => {
  assert.deepEqual(parseConfirmBody({ email: 'operator@baruch.io', code: '123456' }), {
    email: 'operator@baruch.io',
    code: '123456',
  })
})

test('parseLoginBody does not enforce the registration password policy', () => {
  assert.deepEqual(parseLoginBody({ email: 'operator@baruch.io', password: 'short' }), {
    email: 'operator@baruch.io',
    password: 'short',
  })
})

test('parsers reject a non-object body', () => {
  assert.throws(() => parseLoginBody(['nope']), { statusCode: 400 })
})
