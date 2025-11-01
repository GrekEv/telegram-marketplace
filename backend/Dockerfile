FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем папку для загрузок
RUN mkdir -p uploads

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "src/index.js"]

