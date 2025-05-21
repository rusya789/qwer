// Импортируем функции из библиотеки @testing-library/react для тестирования React-компонентов
import { render, screen } from '@testing-library/react';

// Импортируем главный компонент App, который мы будем тестировать
import App from './App';

// Описываем тест: "рендерит ссылку 'learn react'"
test('renders learn react link', () => {
  // Рендерим (отображаем) компонент App как в браузере
  render(<App />);

  // Ищем на экране текст "learn react" (без учета регистра — флаг /i)
  const linkElement = screen.getByText(/learn react/i);

  // Проверяем: действительно ли этот элемент находится на странице
  expect(linkElement).toBeInTheDocument();
});