import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { api } from '../lib/api'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    try {
      const res = await api.get<{ success: boolean; data: { user: { role: string } } }>('/auth/me')
      const user = res.data.user
      
      if (user.role === 'PATIENT') {
        throw redirect({ to: '/patient' })
      } else if (user.role === 'DOCTOR') {
        throw redirect({ to: '/doctor' })
      } else if (user.role === 'ADMIN') {
        throw redirect({ to: '/admin' })
      }
    } catch (err: any) {
      // Re-throw if the error is a router redirect
      if (isRedirect(err)) {
        throw err
      }
      // Any other error (e.g. 401 from /auth/me) means unauthenticated → go to login
      throw redirect({ to: '/auth' })
    }
  },
  component: () => null,
})
