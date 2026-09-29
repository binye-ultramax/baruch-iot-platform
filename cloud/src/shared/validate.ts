import { HttpError } from './errors.ts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SYMBOL = /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`+=]/

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface ConfirmInput {
  email: string
  code: string
}

export interface LoginInput {
  email: string
  password: string
}

export function parseRegisterBody(value: unknown): RegisterInput {
  const body = asRecord(value)
  const email = parseEmail(body.email)
  return {
    email,
    password: parsePassword(body.password, email),
    name: parseName(body.name),
  }
}

export function parseConfirmBody(value: unknown): ConfirmInput {
  const body = asRecord(value)
  return {
    email: parseEmail(body.email),
    code: parseCode(body.code),
  }
}

export function parseLoginBody(value: unknown): LoginInput {
  const body = asRecord(value)
  return {
    email: parseEmail(body.email),
    password: parseLoginPassword(body.password),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.')
  }
  return value as Record<string, unknown>
}

function parseEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Email is required.')
  }
  const email = value.trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
  return email
}

function parseName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Name is required.')
  }
  const name = value.trim()
  if (name.length < 1 || name.length > 128 || /[\u0000-\u001F]/.test(name)) {
    throw new HttpError(400, 'Name must be 1 to 128 characters.')
  }
  return name
}

function parsePassword(value: unknown, email: string): string {
  const password = parseLoginPassword(value)
  const hasRequiredCharacters =
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    SYMBOL.test(password)
  if (!hasRequiredCharacters) {
    throw new HttpError(400, passwordRuleMessage())
  }
  if (password.toLowerCase() === email) {
    throw new HttpError(400, 'Password must not match the email address.')
  }
  return password
}

function parseLoginPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'Password is required.')
  }
  if (value.length > 256) {
    throw new HttpError(400, 'Password is too long.')
  }
  return value
}

function parseCode(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value.trim())) {
    throw new HttpError(400, 'Enter the 6-digit confirmation code.')
  }
  return value.trim()
}

function passwordRuleMessage(): string {
  return 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.'
}
