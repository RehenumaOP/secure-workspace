import { createContext, useReducer, useEffect } from 'react'

export const AuthContext = createContext(null)

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false }
    case 'CLEAR_USER':
      return { ...state, user: null, loading: false }
    default:
      return state
  }
}

const initialState = { user: null, loading: true }

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        dispatch({ type: 'SET_USER', payload: parsedUser })
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        dispatch({ type: 'CLEAR_USER' })
      }
    } else {
      dispatch({ type: 'CLEAR_USER' })
    }
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    dispatch({ type: 'SET_USER', payload: userData })
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    dispatch({ type: 'CLEAR_USER' })
  }

  return (
    <AuthContext.Provider value={{ user: state.user, loading: state.loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}