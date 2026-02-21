import React from 'react'
import { render } from '@testing-library/react'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('renders without crashing and applies classes', () => {
    const { container } = render(<Spinner size={8} color="text-red-500" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg).toHaveClass('animate-spin')
    expect(svg).toHaveClass('text-red-500')
  })
})
