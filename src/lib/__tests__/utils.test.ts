import { describe, expect,it } from 'vitest'

import { cn } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toBe('text-red-500 bg-blue-500')
    })

    it('should handle conditional classes', () => {
      const result = cn('text-red-500', false && 'bg-blue-500', 'font-bold')
      expect(result).toBe('text-red-500 font-bold')
    })
    
    it('should handle tailwind merge conflicts', () => {
       const result = cn('px-2 py-1', 'p-4')
       expect(result).toBe('p-4')
    })
  })
})
