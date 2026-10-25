import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import React from 'react'

// Provide React globally for JSX transformation in Vitest environment
globalThis.React = React

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})
