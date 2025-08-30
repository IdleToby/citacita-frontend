import axios from 'axios'

const instance = axios.create({
  timeout: 10000,
})

instance.interceptors.request.use(
  (config) => {
    // Can set headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor for handling responses
instance.interceptors.response.use(
  (response) => {
    // Return the full response to let the components handle the response structure
    return response
  },
  (error) => {
    // Handle network or server errors
    console.error('Network or Server Error:', error)
    return Promise.reject(error)
  },
)

export default instance
