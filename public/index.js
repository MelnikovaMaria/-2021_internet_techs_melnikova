document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

class AppModel {
  static async getRacks() {
    const racksRes = await fetch('http://localhost:4321/racks');
    return await racksRes.json();
  }

  static async addRack(rackName) {
    console.log(JSON.stringify({ rackName }));
    const result = await fetch(
      'http://localhost:4321/racks',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rackName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async addProduct({
    rackId,
    productName
  }) {
    const result = await fetch(
      `http://localhost:4321/racks/${rackId}/products`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async editProduct({
    rackId,
    productId,
    newProductName
  }) {
    const result = await fetch(
      `http://localhost:4321/racks/${rackId}/products/${productId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newProductName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async deleteProduct({
    rackId,
    productId
  }) {
    const result = await fetch(
      `http://localhost:4321/racks/${rackId}/products/${productId}`,
      {
        method: 'DELETE'
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async moveProduct({
    fromRackId,
    toRackId,
    productId
  }) {
    const result = await fetch(
      `http://localhost:4321/racks/${fromRackId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toRackId, productId })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }
}

class App {
  constructor() {
    this.racks = [];
  }

  onEscapeKeydown = ({ key }) => {
    if (key === 'Escape') {
      const input = document.getElementById('add-rack-input');
      input.style.display = 'none';
      input.value = '';

      document.getElementById('tm-rack-add-rack')
        .style.display = 'inherit';
    }
  };

  onInputKeydown = async ({ key, target }) => {
    if (key === 'Enter') {
      if (target.value) {
        await AppModel.addRack(target.value);

        this.racks.push(
          new Rack({
            tlName: target.value,
            tlID: `TL${this.racks.length}`,
            moveProduct: this.moveProduct
          })
        );

        this.racks[this.racks.length - 1].render();
      }
      
      target.style.display = 'none';
      target.value = '';

      document.getElementById('tm-rack-add-rack')
        .style.display = 'inherit';
    }
  };

  moveProduct = async ({ productID, direction }) => {
    let [
      tlIndex,
      productIndex
    ] = productID.split('-T');
    tlIndex = Number(tlIndex.split('TL')[1]);
    productIndex = Number(productIndex);
    const productName = this.racks[tlIndex].products[productIndex];
    const targetTlIndex = direction === 'left'
      ? tlIndex - 1
      : tlIndex + 1;

    try {
      await AppModel.moveProduct({
        fromRackId: tlIndex,
        toRackId: targetTlIndex,
        productId: productIndex
      });

      this.racks[tlIndex].deleteProduct(productIndex);
      this.racks[targetTlIndex].addProduct(productName);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  async init() {
    const racks = await AppModel.getRacks();
    racks.forEach(({ rackName, products }) => {
      const newRack = new Rack({
        tlName: rackName,
        tlID: `TL${this.racks.length}`,
        moveProduct: this.moveProduct
      });
      products.forEach(product => newRack.products.push(product));
      
      this.racks.push(newRack);
      newRack.render();
      newRack.rerenderProducts();
    });

    document.getElementById('tm-rack-add-rack')
      .addEventListener(
        'click',
        (event) => {
          event.target.style.display = 'none';

          const input = document.getElementById('add-rack-input');
          input.style.display = 'inherit';
          input.focus();
        }
      );

    document.addEventListener('keydown', this.onEscapeKeydown);

    document.getElementById('add-rack-input')
      .addEventListener('keydown', this.onInputKeydown);

    document.querySelector('.toggle-switch input')
      .addEventListener(
        'change',
        ({ target: { checked } }) => {
          checked
            ? document.body.classList.add('dark-theme')
            : document.body.classList.remove('dark-theme');
        }
      );
  }
}

class Rack {
  constructor({
    tlName,
    tlID,
    moveProduct
  }) {
    this.tlName = tlName;
    this.tlID = tlID;
    this.products = [];
    this.moveProduct = moveProduct;
  }

  onAddProductButtonClick = async () => {
    const newProductName = prompt('Введите наименование товара:');

    if (!newProductName) return;

    const rackId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.addProduct({
        rackId,
        productName: newProductName
      });
      this.addProduct(newProductName);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  addProduct = (productName) => {
    document.querySelector(`#${this.tlID} ul`)
      .appendChild(
        this.renderProduct({
          productID: `${this.tlID}-T${this.products.length}`,
          productName
        })
      );

    this.products.push(productName);
  };

  onEditProduct = async (productID) => {
    const productIndex = Number(productID.split('-T')[1]);
    const oldProductName = this.products[productIndex];

    const newProductName = prompt('Введите наименование товара', oldProductName);

    if (!newProductName || newProductName === oldProductName) {
      return;
    }

    const rackId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.editProduct({
        rackId,
        productId: productIndex,
        newProductName
      });

      this.products[productIndex] = newProductName;
      document.querySelector(`#${productID} span`)
        .innerHTML = newProductName;
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  onDeleteProductButtonClick = async (productID) => {
    const productIndex = Number(productID.split('-T')[1]);
    const productName = this.products[productIndex];

    if (!confirm(`Товар '${productName}' будет удален. Продолжить?`)) return;

    const rackId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.deleteProduct({
        rackId,
        productId: productIndex
      });

      this.deleteProduct(productIndex);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  deleteProduct = (productIndex) => {
    this.products.splice(productIndex, 1);
    this.rerenderProducts();
  };

  rerenderProducts = () => {
    const rack = document.querySelector(`#${this.tlID} ul`);
    rack.innerHTML = '';

    this.products.forEach((productName, productIndex) => {
      rack.appendChild(
        this.renderProduct({
          productID: `${this.tlID}-T${productIndex}`,
          productName
        })
      );
    });
  };

  renderProduct = ({ productID, productName }) => {
    const product = document.createElement('li');
    product.classList.add('tm-rack-product');
    product.id = productID;

    const span = document.createElement('span');
    span.classList.add('tm-rack-product-text');
    span.innerHTML = productName;
    product.appendChild(span);

    const controls = document.createElement('div');
    controls.classList.add('tm-rack-product-controls');

    const upperRow = document.createElement('div');
    upperRow.classList.add('tm-rack-product-controls-row');

    const leftArrow = document.createElement('button');
    leftArrow.type = 'button';
    leftArrow.classList.add(
      'tm-rack-product-controls-button',
      'left-arrow'
    );
    leftArrow.addEventListener(
      'click',
      () => this.moveProduct({ productID, direction: 'left' })
    );
    upperRow.appendChild(leftArrow);

    const rightArrow = document.createElement('button');
    rightArrow.type = 'button';
    rightArrow.classList.add(
      'tm-rack-product-controls-button',
      'right-arrow'
    );
    rightArrow.addEventListener(
      'click',
      () => this.moveProduct({ productID, direction: 'right' })
    );
    upperRow.appendChild(rightArrow);

    controls.appendChild(upperRow);

    const lowerRow = document.createElement('div');
    lowerRow.classList.add('tm-rack-product-controls-row');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.classList.add(
      'tm-rack-product-controls-button',
      'edit-icon'
    );
    editButton.addEventListener('click', () => this.onEditProduct(productID));
    lowerRow.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add(
      'tm-rack-product-controls-button',
      'delete-icon'
    );
    deleteButton.addEventListener('click', () => this.onDeleteProductButtonClick(productID));
    lowerRow.appendChild(deleteButton);

    controls.appendChild(lowerRow);

    product.appendChild(controls);

    return product;
  };

  render() {
    const rack = document.createElement('div');
    rack.classList.add('tm-rack');
    rack.id = this.tlID;

    const header = document.createElement('header');
    header.classList.add('tm-rack-header');
    header.innerHTML = this.tlName;
    rack.appendChild(header);

    const list = document.createElement('ul');
    list.classList.add('tm-rack-products');
    rack.appendChild(list);

    const footer = document.createElement('footer');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('tm-rack-add-product');
    button.innerHTML = 'Положить товар';
    button.addEventListener('click', this.onAddProductButtonClick);
    footer.appendChild(button);
    rack.appendChild(footer);

    const container = document.querySelector('main');
    container.insertBefore(rack, container.lastElementChild);
  }
}
