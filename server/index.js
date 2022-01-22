import express from 'express';
import { resolve } from 'path';
import { __dirname } from './globals.js';
import { readData, writeData } from './fileUtils.js';

const app = express();

const hostname = 'localhost';
const port = 4321;

const racks = [];

// Middleware для формирования ответа в формате JSON
app.use(express.json());

// Middleware для логирования запросов
app.use((request, response, next) => {
  console.log(
    (new Date()).toISOString(),
    request.ip,
    request.method,
    request.originalUrl
  );

  next();
});

// Middleware для раздачи статики
app.use('/', express.static(
  resolve(__dirname, '..', 'public')
));

//---------------------------------------------------
// Роуты приложения

// Получение всех списков задач
app.get('/racks', (request, response) => {
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json(racks);
});

// Создание нового списка задач
app.post('/racks', async (request, response) => {
  console.log(request);
  const { rackName } = request.body;
  racks.push({
    rackName,
    products: []
  });
  await writeData(racks);

  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Стеллаж '${rackName}' был успешно создан`
    });
});

// Создание новой задачи
app.post('/racks/:rackId/products', async (request, response) => {
  const { productName } = request.body;
  const rackId = Number(request.params.rackId);

  if (rackId < 0 || rackId >= racks.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `Нет стеллажа с id = ${rackId}`
      });
    return;
  }

  racks[rackId].products.push(productName);
  await writeData(racks);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Товар '${productName}' был успешно добавлен в стеллаж '${racks[rackId].rackName}'`
    });
});

// Изменение задачи
app.put('/racks/:rackId/products/:productId', async (request, response) => {
  const { newProductName } = request.body;
  const rackId = Number(request.params.rackId);
  const productId = Number(request.params.productId);

  if (rackId < 0 || rackId >= racks.length
    || productId < 0 || productId >= racks[rackId].products.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `Нет стеллажа с id = ${rackId} или товара с id = ${productId}`
      });
    return;
  }

  racks[rackId].products[productId] = newProductName;
  await writeData(racks);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Товар №${productId} был успешно переименован в '${racks[rackId].rackName}'`
    });
});

// Удаление задачи
app.delete('/racks/:rackId/products/:productId', async (request, response) => {
  const rackId = Number(request.params.rackId);
  const productId = Number(request.params.productId);

  if (rackId < 0 || rackId >= racks.length
    || productId < 0 || productId >= racks[rackId].products.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `Нет стеллажа с id = ${rackId} или товара с id = ${productId}`
      });
    return;
  }

  const deletedProductName = racks[rackId].products[productId];
  racks[rackId].products.splice(productId, 1);
  await writeData(racks);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Товар '${deletedProductName}' был успешно удален со стеллажа '${racks[rackId].rackName}'`
    });
});

// Перенос товара с одного стеллажа в другой
app.patch('/racks/:rackId', async (request, response) => {
  const fromRackId = Number(request.params.rackId);
  const { toRackId, productId } = request.body;

  if (fromRackId < 0 || fromRackId >= racks.length
    || productId < 0 || productId >= racks[fromRackId].products.length
    || toRackId < 0 || toRackId >= racks.length) {
    response
      .setHeader('Content-Type', 'application/json')
      .status(404)
      .json({
        info: `Нет стеллажа с id = ${fromRackId} или ${toRackId} или товара с id = ${productId}`
      });
    return;
  }

  const movedProductName = racks[fromRackId].products[productId];

  racks[fromRackId].products.splice(productId, 1);
  racks[toRackId].products.push(movedProductName);

  await writeData(racks);
  response
    .setHeader('Content-Type', 'application/json')
    .status(200)
    .json({
      info: `Товар '${movedProductName}' был успешно перенесен со стеллажа '${racks[fromRackId].rackName}' на стеллаж '${
        racks[toRackId].rackName
      }'`
    });
}); 

//---------------------------------------------------

// Запуск сервера
app.listen(port, hostname, async (err) => {
  if (err) {
    console.error('Error: ', err);
    return;
  }

  console.log(`Out server started at http://${hostname}:${port}`);

  const racksFromFile = await readData();
  racksFromFile.forEach(({ rackName, products }) => {
    racks.push({
      rackName,
      products: [...products]
    });
  });
});
