import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'   // ✅ src 바로 아래니까 이렇게!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
