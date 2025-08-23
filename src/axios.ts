import axios from 'axios'

// Read environment variable for base URL
const baseURL = import.meta.env.VITE_API_BASE

const instance = axios.create({
  baseURL: baseURL,
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
    const res = response.data

    // code 200 indicates success
    if (res.code === 200) {
      return res
    } else {
      // If the response code is not 200, show an error message from the response
      console.error(`API Error: ${res.msg || 'Unknown error'}`)
      return Promise.reject(new Error(res.msg || 'Error'))
    }
  },
  (error) => {
    // Handle network or server errors
    console.error('Network or Server Error:', error)
    return Promise.reject(error)
  },
)

export default instance
