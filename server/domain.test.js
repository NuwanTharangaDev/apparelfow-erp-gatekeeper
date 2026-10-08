import { describe, expect, it } from 'vitest'
import { getExpectedFabric, getLight, getWastagePct } from './domain.js'

describe('getLight', () => {
  it('is green when the count matches', () => {
    expect(getLight(100, 100)).toBe('GREEN')
  })

  it('is yellow when there are extra pieces', () => {
    expect(getLight(103, 100)).toBe('YELLOW')
  })

  it('is red when pieces are short', () => {
    expect(getLight(97, 100)).toBe('RED')
  })

  it('treats a count of zero as red', () => {
    expect(getLight(0, 100)).toBe('RED')
  })
})

describe('getExpectedFabric', () => {
  it('multiplies the quantity by the standard yards', () => {
    expect(getExpectedFabric(50, '1.80')).toBe(90)
  })

  it('stays exact with fractional yards', () => {
    expect(getExpectedFabric(33, '1.10')).toBe(36.3)
  })
})

describe('getWastagePct', () => {
  it('is positive when more fabric was used', () => {
    expect(getWastagePct(95, 90)).toBe(5.56)
  })

  it('is negative when less fabric was used', () => {
    expect(getWastagePct(85, 90)).toBe(-5.56)
  })

  it('is zero when usage matches', () => {
    expect(getWastagePct(90, 90)).toBe(0)
  })
})