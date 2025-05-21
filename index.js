// Импортируем основную библиотеку React
import React from 'react';

// Импортируем ReactDOM — инструмент для рендеринга React-компонентов в браузер
import ReactDOM from 'react-dom/client';

// Подключаем стили из файла index.css (общие стили для всего приложения)
import './index.css';

// Импортируем главный компонент App — это корень нашего интерфейса
import App from './App';

// Находим элемент <div id="root"></div> в HTML-файле (обычно в public/index.html)
// Создаем "корень" React-приложения внутри этого div'а
const root = ReactDOM.createRoot(document.getElementById('root'));

// Рендерим (отображаем) наше приложение
// Оборачиваем всё в <React.StrictMode> — режим разработки, который помогает находить потенциальные проблемы
root.render(
  <React.StrictMode>
    {/* Здесь отображается наш главный компонент App */}
    <App />
  </React.StrictMode>
);