using { my.bookshop as bookshop } from '../db/schema';

@path: '/catalog'
service CatalogService {

  entity Books as projection on bookshop.Books;

  function getLowStockBooks() returns array of Books;

  action restockBooks(amount: Integer) returns array of Books;
}
