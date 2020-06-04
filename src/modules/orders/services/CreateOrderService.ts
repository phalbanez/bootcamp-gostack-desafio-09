import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const existenProducts = await this.productsRepository.findAllById(products);

    if (!existenProducts.length) {
      throw new AppError("Product doesn't exist.");
    }

    const existentProductsIds = existenProducts.map(product => product.id);

    const inexistenProducts = products.filter(
      product => !existentProductsIds.includes(product.id),
    );

    if (inexistenProducts.length) {
      throw new AppError('Could not find product with id');
    }

    const updatedProducts = existenProducts.map(existentProduct => {
      const foundProduct = products.filter(
        product => existentProduct.id === product.id,
      );

      if (foundProduct[0].quantity > existentProduct.quantity) {
        throw new AppError('Not enougth products.');
      }

      return {
        product_id: foundProduct[0].id,
        price: existentProduct.price,
        quantity: foundProduct[0].quantity,
      };
    });

    const updatedProductWithQuantity = existenProducts.map(existentProduct => {
      const productQuantity = products.filter(
        product => product.id === existentProduct.id,
      )[0].quantity;

      return {
        ...existentProduct,
        quantity: existentProduct.quantity - productQuantity,
      };
    });

    await this.productsRepository.updateQuantity(updatedProductWithQuantity);

    const order = await this.ordersRepository.create({
      customer,
      products: updatedProducts,
    });

    return order;
  }
}

export default CreateOrderService;
