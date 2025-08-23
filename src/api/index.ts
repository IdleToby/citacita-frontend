// src/api/index.ts
import api from '@/axios'

// Call hello API
export const hello = () => {
  return api.get('/hello')
}

// Search products by general search term
export const searchProducts = (params: object) => {
  return api.post('/products/search', params)
}

// Search products by notification number
export const searchProductsByNotifNo = (params: object) => {
  return api.post('/products/search-by-notifNo', params)
}

// Get recommended products
export const getRecommendedProducts = () => {
  return api.post('/products/recommend', {})
}

// 搜索成分列表
export const searchIngredients = (params: {
  searchTerm: string
  pageNum: number
  pageSize: number
}) => {
  return fetch('/api/ingredients/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    return response.json()
  })
}

// 根据成分名称获取详细信息
export const searchIngredientsByName = (params: {
  substanceDetected: string
}) => {
  return fetch('/api/ingredients/search-by-name', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  }).then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    return response.json()
  })
}
