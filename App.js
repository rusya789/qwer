// Импортируем основную библиотеку React
import React from 'react'

// Импортируем компоненты из библиотеки react-router-dom для настройки маршрутов (роутинга)
import {
  BrowserRouter as Router, // Основной контейнер для роутинга
  Route,                   // Компонент для определения маршрута
  Routes                   // Группировка всех маршрутов
} from 'react-router-dom'

// Импортируем страницы нашего приложения
import Home from './pages/Home'               // Главная страница
import Services from './pages/Services'       // Страница со списком всех услуг
import ServiceCategory from './pages/ServiceCategory' // Страница услуг конкретной категории
import MasterDashboard from './pages/MasterDashboard' // Личный кабинет мастера
import UserDashboard from './pages/UserDashboard'     // Личный кабинет пользователя

// Импортируем общий CSS-файл для стилей всего приложения
import './styles/common.css'

// Основной компонент App — это корень всего приложения
function App() {
  return (
    // Оборачиваем всё приложение в <Router>, чтобы использовать маршруты
    <Router>
      {/* Блок с классом "App" — основной контейнер всего интерфейса */}
      <div className='App'>
        {/* Здесь будут отображаться страницы в зависимости от текущего URL */}
        <Routes>
          {/* Маршрут для главной страницы: http://вашсайт.ру/ */}
          <Route path='/' element={<Home />} />

          {/* Маршрут для страницы со всеми услугами: http://вашсайт.ру/services */}
          <Route path='/services' element={<Services />} />

          {/* Маршрут для страницы услуг по категории. 
              ":categoryId" — это динамическая часть адреса.
              Например: http://вашсайт.ру/services/1 */}
          <Route path='/services/:categoryId' element={<ServiceCategory />} />

          {/* Маршрут для личного кабинета мастера: http://вашсайт.ру/master */}
          <Route path='/master' element={<MasterDashboard />} />

          {/* Маршрут для личного кабинета пользователя: http://вашсайт.ру/dashboard */}
          <Route path='/dashboard' element={<UserDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

// Экспортируем компонент App по умолчанию, чтобы его можно было использовать в других файлах
export default App